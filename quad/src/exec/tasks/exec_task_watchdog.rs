use log::{info, debug};
use pubsub::{publish, publish_json, subscribe, tasks::{
    info::TaskInfo,
    task::Task,
}};
use serde::{Serialize, Deserialize};

use crate::exec::{messages::ExecStageMessage, stage::ExecStage};

/// Task that monitors mavlink connection status and updates the exec stage accordingly
pub struct ExecTaskWatchdog {
    info: TaskInfo,
    connection_detected: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ConnectionStatus {
    pub connected: bool,
}

impl ExecTaskWatchdog {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecTaskWatchdog"),
            connection_detected: false,
        }
    }
}

impl Task for ExecTaskWatchdog {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskWatchdog initialized");
        
        // Subscribe to mavlink connection status
        tx.send(subscribe!("mavlink/connected"))?;
        
        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(
        &mut self,
        inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        // Check for mavlink connection status updates
        for record in &inputs {
            if let Ok(topic) = record.try_get_topic() {
                if topic == "mavlink/connected" {
                    info!("Received mavlink/connected update");
                    let status: Vec<ConnectionStatus> = record.to_serde().unwrap_or_default();
                    if !status.is_empty() && status[0].connected && !self.connection_detected {
                        info!("Mavlink connection detected, updating exec stage to AwaitingData");
                        self.connection_detected = true;
                        
                        // Publish stage update to exec/stage
                        let pub_packet = publish!("exec/stage", &ExecStageMessage::new(ExecStage::AwaitingData));
                        tx.send(pub_packet)?;
                    } else if !status.is_empty() && !status[0].connected && self.connection_detected {
                        info!("Mavlink connection lost, updating exec stage to AwaitConnection");
                        self.connection_detected = false;
                        
                        // Publish stage update to exec/stage
                        let pub_packet = publish!("exec/stage", &ExecStageMessage::new(ExecStage::AwaitConnection));
                        tx.send(pub_packet)?;
                    }
                }
            }
        }
        
        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("ExecTaskWatchdog cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
}
