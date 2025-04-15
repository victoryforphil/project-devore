use anyhow::Error;
use crossbeam_channel::{Receiver, Sender};
use log::{debug, error, info, trace};
use mavlink::ardupilotmega::MavMessage;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};

use crate::ardulink::config::ArdulinkConnectionType;

type MavlinkMessageType = MavMessage;

#[derive(thiserror::Error, Debug)]
pub enum ArdulinkError {
    #[error("Connection error: {0}")]
    ConnectionError(#[from] Error),
    #[error("Channel send error: {0}")]
    ChannelSendError(#[from] crossbeam_channel::SendError<MavlinkMessageType>),
}

pub struct ArdulinkConnection {
    recv_channels: (Sender<MavlinkMessageType>, Receiver<MavlinkMessageType>),
    transmit_channels: (Sender<MavlinkMessageType>, Receiver<MavlinkMessageType>),
    connection_string: String,
    should_stop: Arc<AtomicBool>,
    connection_type: ArdulinkConnectionType,
    thread_handles: Vec<thread::JoinHandle<()>>,
}

impl ArdulinkConnection {
    pub fn new(connection_type: ArdulinkConnectionType) -> Result<Self, Error> {
        let (recv_tx, recv_rx): (Sender<_>, Receiver<_>) = crossbeam_channel::bounded(500);
        let (transmit_tx, transmit_rx): (Sender<_>, Receiver<_>) = crossbeam_channel::bounded(500);

        Ok(Self {
            recv_channels: (recv_tx, recv_rx),
            transmit_channels: (transmit_tx, transmit_rx),
            connection_string: connection_type.connection_string(),
            should_stop: Arc::new(AtomicBool::new(false)),
            connection_type,
            thread_handles: Vec::new(),
        })
    }

    pub fn start_thread(&mut self) -> Result<(), ArdulinkError> {
        let con_string = self.connection_string.clone();
        let recv_channels = self.recv_channels.clone();
        let transmit_channels = self.transmit_channels.clone();
        let should_stop = self.should_stop.clone();
        let connection_type = self.connection_type.clone();
        
        let thread_handle = thread::spawn(move || {
            if let Err(e) = Self::start_thread_inner(
                con_string.clone(),
                recv_channels,
                transmit_channels,
                should_stop,
                connection_type,
            ) {
                error!(
                    "ArduLink => Error starting thread for connection string: {}",
                    con_string
                );
                error!("ArduLink => Error: {e:?}");
            }
        });

        self.thread_handles.push(thread_handle);
        Ok(())
    }

    pub fn stop_thread(&mut self) -> Result<(), ArdulinkError> {
        info!("ArduLink => Stopping connection threads");
        self.should_stop.store(true, Ordering::SeqCst);
        
        // Wait a bit for threads to notice the stop flag
        thread::sleep(Duration::from_millis(100));
        
        // Join all threads
        let handles = std::mem::take(&mut self.thread_handles);
        for handle in handles {
            if let Err(e) = handle.join() {
                error!("ArduLink => Error joining thread: {:?}", e);
            }
        }
        
        info!("ArduLink => All threads stopped");
        Ok(())
    }

    fn start_thread_inner(
        con_string: String,
        recv_channels: (Sender<MavlinkMessageType>, Receiver<MavlinkMessageType>),
        transmit_channels: (Sender<MavlinkMessageType>, Receiver<MavlinkMessageType>),
        should_stop: Arc<AtomicBool>,
        _connection_type: ArdulinkConnectionType,
    ) -> Result<(), ArdulinkError> {
        // Make the connection
        info!(
            "ArduLink => Connecting to MAVLink with connection string: {}",
            con_string
        );
        
        let mut mav_con: Box<dyn mavlink::MavConnection<MavlinkMessageType> + Send + Sync> = 
            mavlink::connect::<MavlinkMessageType>(&con_string)
                .map_err(|e| ArdulinkError::ConnectionError(e.into()))?;

        info!("ArduLink => Setting up connection parameters");
        mav_con.set_protocol_version(mavlink::MavlinkVersion::V2);

        // Request data streams
        let request_stream = build_request_stream();
        
        /// Create a message enabling data streaming
        fn build_request_stream() -> mavlink::ardupilotmega::MavMessage {
            mavlink::ardupilotmega::MavMessage::REQUEST_DATA_STREAM(
                mavlink::ardupilotmega::REQUEST_DATA_STREAM_DATA {
                    target_system: 0,
                    target_component: 0,
                    req_stream_id: 0,
                    req_message_rate: 10,
                    start_stop: 1,
                },
            )
        }
        
        mav_con.send(&mavlink::MavHeader::default(), &request_stream).unwrap();
        
        let mav_con = Arc::new(mav_con);

        info!("ArduLink => Starting main threads...");

        // Send thread
        info!("ArduLink => Spawning send thread");
        let send_handle = thread::spawn({
            let vehicle = mav_con.clone();
            let should_stop = should_stop.clone();
            move || {
                let (_, rx) = &transmit_channels;
                while !should_stop.load(Ordering::SeqCst) {
                    match rx.recv_timeout(Duration::from_millis(100)) {
                        Ok(msg) => {
                            if should_stop.load(Ordering::SeqCst) {
                                break;
                            }
                            trace!("ArduLink => Sending message to MAVLink: {msg:?}");
                            // Only attempt to send if we're not stopping
                            if !should_stop.load(Ordering::SeqCst) {
                                let _ = vehicle.send(&mavlink::MavHeader::default(), &msg);
                            }
                        }
                        Err(crossbeam_channel::RecvTimeoutError::Timeout) => {
                            // Check if we should stop
                            if should_stop.load(Ordering::SeqCst) {
                                break;
                            }
                        }
                        Err(crossbeam_channel::RecvTimeoutError::Disconnected) => {
                            break;
                        }
                    }
                }
                debug!("ArduLink => Send thread exiting");
            }
        });

        // Receive thread
        info!("ArduLink => Spawning receive thread");
        let receive_handle = thread::spawn({
            let vehicle = mav_con.clone();
            let should_stop = should_stop.clone();
            move || {
                while !should_stop.load(Ordering::SeqCst) {
                    if should_stop.load(Ordering::SeqCst) {
                        break;
                    }
                    
                    // Use standard receive with a timeout by checking the flag frequently
                    let recv_result = vehicle.recv();
                    
                    match recv_result {
                        Ok((_header, msg)) => {
                            let (recv_tx, _) = &recv_channels;
                            if let Err(e) = recv_tx.send(msg) {
                                error!("ArduLink => Failed to send received message to channel: {:?}", e);
                                if should_stop.load(Ordering::SeqCst) {
                                    break;
                                }
                            }
                        }
                        Err(mavlink::error::MessageReadError::Io(e)) => {
                            if e.kind() == std::io::ErrorKind::WouldBlock {
                                // No messages currently available to receive -- wait a while
                                thread::sleep(Duration::from_millis(10));
                            } else if !should_stop.load(Ordering::SeqCst) {
                                // Only log errors if we're not stopping
                                error!("ArduLink => Receive error: {e:?}");
                                break;
                            }
                        }
                        // Messages that didn't get through due to parser errors are ignored
                        _ => {}
                    }
                    
                    // Check stop flag more frequently
                    if should_stop.load(Ordering::SeqCst) {
                        break;
                    }
                }
                debug!("ArduLink => Receive thread exiting");
            }
        });
        
        // Join threads when one exits or stop is requested
        let _ = send_handle.join();
        let _ = receive_handle.join();
        
        info!("ArduLink => All threads exited");
        Ok(())
    }

    pub fn send(&self, msg: &MavlinkMessageType) -> Result<(), ArdulinkError> {
        // Don't attempt to send if we're stopping
        if self.should_stop.load(Ordering::SeqCst) {
            return Ok(());
        }
        
        let (tx, _) = &self.transmit_channels;
        tx.send(msg.clone())
            .map_err(ArdulinkError::ChannelSendError)
    }

    pub fn recv(&self) -> Result<Vec<MavlinkMessageType>, ArdulinkError> {
        let mut data = Vec::new();
        let (_, rx) = &self.recv_channels;
        
        // Don't attempt to receive if we're stopping
        if self.should_stop.load(Ordering::SeqCst) {
            return Ok(data);
        }
        
        while let Ok(msg) = rx.try_recv() {
            data.push(msg);
        }
        Ok(data)
    }
}
