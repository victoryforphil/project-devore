use anyhow::Error;
use log::{info, debug, error};
use serde::{Serialize, Deserialize};
use mavlink::ardupilotmega::{MavMessage, STATUSTEXT_DATA, MavSeverity, MavModeFlag, HEARTBEAT_DATA};

use pubsub::tasks::task::{MetaTaskChannel, Task, TaskChannel};
use pubsub::tasks::info::TaskInfo;
use pubsub::message::record::Record;
use pubsub::{publish, publish_json};
use pubsub::subscribe;

use crate::ardulink::connection::ArdulinkConnection;
use crate::ardulink::config::ArdulinkConnectionType;
use crate::exec::tasks::exec_task_watchdog::ConnectionStatus;

/// Serializable representation of a MAVLink message for publishing to pubsub
#[derive(Serialize, Deserialize, Debug)]
pub struct MavlinkMessageWrapper {
    /// The raw message data
    pub message: String,
    /// The message type identifier
    pub message_type: String,
}

/// Serializable representation of a status text message
#[derive(Serialize, Deserialize, Debug)]
pub struct StatusTextMessage {
    /// The text content
    pub text: String,
    /// Severity level
    pub severity: u8,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct HeartbeatFlag{
    pub value: bool,
}
/// Represents the autopilot status flags from a heartbeat message
#[derive(Serialize, Deserialize, Debug)]
pub struct AutopilotStatus {
    pub custom_mode_enabled: bool,
    pub test_enabled: bool,
    pub auto_enabled: bool,
    pub guided_enabled: bool,
    pub stabilize_enabled: bool,
    pub hil_enabled: bool,
    pub manual_input_enabled: bool,
    pub safety_armed: bool,
}

impl From<&MavMessage> for MavlinkMessageWrapper {
    fn from(msg: &MavMessage) -> Self {
        // Get the enum variant name directly using std::mem::discriminant
        let message_type = format!("{:?}", msg);
        // Extract just the enum variant name without the data
        let message_type = message_type.split('(').next().unwrap_or("UNKNOWN").trim().to_string();
        let message_type = message_type.split(' ').next().unwrap_or("UNKNOWN").to_string();
        // Message as JSON string
        let message = serde_json::to_string(msg).unwrap_or("UNKNOWN".to_string());
        Self {
            message,
            message_type,
        }
    }
}

/// Task responsible for managing a MAVLink connection and publishing received messages
pub struct MavlinkTask {
    /// The connection configuration
    connection_type: ArdulinkConnectionType,
    /// The actual connection (created during init)
    connection: Option<ArdulinkConnection>,
    info: TaskInfo,
}

impl MavlinkTask {
    /// Create a new MavlinkTask with the specified connection type
    pub fn new(connection_type: ArdulinkConnectionType) -> Self {
        Self {
            connection_type,
            connection: None,
            info: TaskInfo::new("MavlinkTask")
        }
    }
    
    /// Helper method to publish a MAVLink message to the pubsub system
    fn publish_message(
        &self, 
        msg: &MavMessage, 
        tx: &TaskChannel
    ) -> Result<(), Error> {
        // Convert the MAVLink message to our serializable wrapper
        let wrapper = MavlinkMessageWrapper::from(msg);
        
        // Create topic name in format mavlink/{message_type}
        let topic = format!("mavlink/{}", wrapper.message_type.to_ascii_lowercase());
        
        // Create and send publish packet
        let pub_packet = publish_json!(&topic, wrapper.message.as_str());
        tx.send(pub_packet)?;
        
        // Special handling for statustext messages
        if let MavMessage::STATUSTEXT(status_text) = msg {
            self.process_statustext(status_text, tx)?;
        }
        
        // Special handling for heartbeat messages
        if let MavMessage::HEARTBEAT(heartbeat) = msg {
            self.process_heartbeat(heartbeat, tx)?;
        }
        
        Ok(())
    }
    
    /// Process a status text message
    fn process_statustext(
        &self,
        status_text: &STATUSTEXT_DATA,
        tx: &TaskChannel
    ) -> Result<(), Error> {
        // Convert the C-style array to a Rust string and trim null characters
        let text = status_text.text.iter()
            .take_while(|&&c| c != 0)
            .map(|&c| c as char)
            .collect::<String>();
        
        // Log the status text with a clean format
        info!("UAV Status Text [Severity {:?}]:\n\t{}\n-----------------", 
            status_text.severity, text);
        
        // Create a status text message object for publishing
        let status_msg = StatusTextMessage {
            text,
            severity: status_text.severity as u8,
        };
        
        // Republish to the reprocessed topic
        let pub_packet = publish!("mavlink/reproc/statustext", &status_msg);
        tx.send(pub_packet)?;
        
        Ok(())
    }
    
    /// Decode the mode flags from mavlink heartbeat
    fn decode_mode_flag(&self, flag: MavModeFlag) -> AutopilotStatus {
        AutopilotStatus {
            custom_mode_enabled: flag
                .intersects(MavModeFlag::MAV_MODE_FLAG_CUSTOM_MODE_ENABLED),
            test_enabled: flag
                .intersects(MavModeFlag::MAV_MODE_FLAG_TEST_ENABLED),
            auto_enabled: flag
                .intersects(MavModeFlag::MAV_MODE_FLAG_AUTO_ENABLED),
            guided_enabled: flag
                .intersects(MavModeFlag::MAV_MODE_FLAG_GUIDED_ENABLED),
            stabilize_enabled: flag
                .intersects(MavModeFlag::MAV_MODE_FLAG_STABILIZE_ENABLED),
            hil_enabled: flag
                .intersects(MavModeFlag::MAV_MODE_FLAG_HIL_ENABLED),
            manual_input_enabled: flag.intersects(
                MavModeFlag::MAV_MODE_FLAG_MANUAL_INPUT_ENABLED,
            ),
            safety_armed: flag
                .intersects(MavModeFlag::MAV_MODE_FLAG_SAFETY_ARMED),
        }
    }


    
    /// Process a heartbeat message
    fn process_heartbeat(
        &self,
        heartbeat: &HEARTBEAT_DATA,
        tx: &TaskChannel
    ) -> Result<(), Error> {
        // Decode the mode flags
        let status = self.decode_mode_flag(heartbeat.base_mode);
        
        let pub_packet = publish!("mavlink/reproc/heartbeat_armed", &HeartbeatFlag{value: status.safety_armed}  );
        tx.send(pub_packet)?;
        
        // Also publish the full status object
        let pub_packet = publish!("mavlink/reproc/heartbeat_status", &status);
        tx.send(pub_packet)?;
        
        Ok(())
    }
}

impl Task for MavlinkTask {
    fn init(&mut self, tx: TaskChannel, meta_tx: MetaTaskChannel) -> Result<(), Error> {
        info!("MavlinkTask initializing with connection: {}", self.connection_type.connection_string());
        
        // Create the connection
        let mut connection = ArdulinkConnection::new(self.connection_type.clone())?;
        
        // Start the connection thread
        connection.start_thread()?;
        
        // Store the connection
        self.connection = Some(connection);
        
        // Set up topic subscription for command messages
        tx.send(subscribe!("mavlink/send/*"))?;
        
        // Publish connection status for ExecTaskWatchdog
        let connection_status = ConnectionStatus { connected: true };
        let pub_packet = publish!("mavlink/connected", &connection_status);
        tx.send(pub_packet)?;
        
        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn get_task_info(&self) -> &TaskInfo {
        &self.info
    }

    fn run(&mut self, inputs: Vec<Record>, tx: TaskChannel, _meta_tx: MetaTaskChannel) -> Result<(), Error> {
        // Process any commands from subscribed topics
        for record in &inputs {
            if let Ok(topic) = record.try_get_topic() {
                if topic.starts_with("mavlink/send/") {
                    // Here we could handle command messages sent to the MAVLink device
                   
                    let command = record.to_serde::<MavMessage>()?;
                    for msg in command {
                        debug!("Mavlink Sending Command: {:?}", msg);
                        self.connection.as_ref().unwrap().send(&msg)?;
                    }
                }
            }
        }
        
        // Check for new MAVLink messages
        if let Some(connection) = &self.connection {
            let messages = connection.recv()?;
           
            for msg in messages {
                // Publish each message to the pubsub system
                self.publish_message(&msg, &tx)?;
            }
        } else {
            error!("MavlinkTask has no active connection");
            return Err(anyhow::anyhow!("MavlinkTask has no active connection"));
        }
        
        Ok(())
    }
    
    fn cleanup(&mut self) -> Result<(), Error> {
        info!("MavlinkTask cleaning up");
        
        // Stop the connection thread if it exists
        if let Some(connection) = &mut self.connection {
            connection.stop_thread()?;
        }
        
        Ok(())
    }
}
