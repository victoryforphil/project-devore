use log::{debug, info, warn};
use mavlink::ardupilotmega::{MavMessage, MavModeFlag, HEARTBEAT_DATA};
use pubsub::{
    publish, subscribe,
    tasks::{info::TaskInfo, task::Task},
};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

use crate::ardulink::task::AutopilotStatus;
use crate::ardulink::task::HeartbeatFlag;
use crate::exec::{messages::ExecStageMessage, stage::ExecStage};
/// Task that monitors mavlink heartbeat for arm status and updates exec stage to HealthyArmed when armed
pub struct ExecTaskArmWatchdog {
    info: TaskInfo,
    is_armed: bool,
}

impl ExecTaskArmWatchdog {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecArmWatchdog"),
            is_armed: false,
        }
    }
}

impl Task for ExecTaskArmWatchdog {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskArmWatchdog initialized");

        // Only subscribe to the reprocessed armed status
        tx.send(subscribe!("mavlink/reproc/heartbeat_armed"))?;

        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        // Run on every tick
        Ok(true)
    }

    fn run(
        &mut self,
        inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        // Process input records
        for record in &inputs {
            if let Ok(topic) = record.try_get_topic() {
                // Check for the reprocessed heartbeat armed status
                if topic.contains("mavlink/reproc/heartbeat_armed") {
                    info!("Received heartbeat armed status: {:?}", record);
                    let is_armed: Vec<HeartbeatFlag> = record.to_serde()?;
                    for armed in is_armed {
                        self.handle_armed_status(armed.value, &tx)?;
                    }
                }
            }
        }

        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("ExecTaskArmWatchdog cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
}

impl ExecTaskArmWatchdog {
    /// Handle armed status changes
    fn handle_armed_status(
        &mut self,
        is_armed: bool,
        tx: &pubsub::tasks::task::TaskChannel,
    ) -> Result<(), anyhow::Error> {
        // Flipped since safety_armed means the quad is disarmed
        if is_armed {
            info!("Vehicle armed, updating exec stage to HealthyArmed");
            self.is_armed = true;

            // Publish stage update to exec/stage
            let pub_packet = publish!(
                "exec/stage",
                &ExecStageMessage::new(ExecStage::HealthyArmed)
            );
            tx.send(pub_packet)?;
        }

        Ok(())
    }
}
