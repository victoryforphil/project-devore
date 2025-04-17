use log::{debug, info};
use pubsub::{
    publish, subscribe,
    tasks::{info::TaskInfo, task::Task},
};
use serde::{Deserialize, Serialize};

use crate::exec::{messages::ExecStageMessage, stage::ExecStage};

/// Task that monitors for system status data and updates exec stage to AwaitingHealthy
pub struct ExecTaskDataWatchdog {
    info: TaskInfo,
    data_received: bool,
}

impl ExecTaskDataWatchdog {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecTaskDataWatchdog"),
            data_received: false,
        }
    }
}

impl Task for ExecTaskDataWatchdog {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskDataWatchdog initialized");

        // Subscribe to mavlink system status
        tx.send(subscribe!("mavlink/sys_status"))?;

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
        // Check for mavlink system status updates
        if self.data_received {
            // We've already detected data and promoted, no need to check again
            return Ok(());
        }

        for record in &inputs {
            if let Ok(topic) = record.try_get_topic() {
                if topic == "mavlink/sys_status" {
                    // If we detect any system status message and haven't already promoted
                    if !self.data_received {
                        info!("Mavlink system status data detected, updating exec stage to AwaitingHealthy");
                        self.data_received = true;

                        // Publish stage update to exec/stage
                        let pub_packet = publish!(
                            "exec/stage",
                            &ExecStageMessage::new(ExecStage::AwaitingHealthy)
                        );
                        tx.send(pub_packet)?;

                        // We found what we're looking for, can break out of the loop
                        break;
                    }
                }
            }
        }

        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("ExecTaskDataWatchdog cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
}
