use anyhow::Error;
use log::{info, debug, error};
use serde::{Serialize, Deserialize};
use mavlink::ardupilotmega::MavMessage;

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
        tx.send(subscribe!("mavlink/command/#"))?;
        
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
                if topic.starts_with("mavlink/command/") {
                    // Here we could handle command messages sent to the MAVLink device
                    debug!("Received command on topic: {}", topic);
                    
                    // TODO: Implement command handling by extracting the command from the record
                    // and sending it via self.connection.as_ref().unwrap().send()
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
