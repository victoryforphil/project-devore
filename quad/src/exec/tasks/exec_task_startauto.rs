use log::{debug, info};
use pubsub::{
    publish, subscribe,
    tasks::{info::TaskInfo, task::Task},
};
use serde::{Deserialize, Serialize};

use crate::{
    auto::{auto_stage::AutoStage, message::AutoStageMessage},
    exec::{messages::ExecStageMessage, stage::ExecStage},
};

/// Task that monitors for system status data and updates exec stage to AwaitingHealthy
pub struct ExecTaskStartAuto {
    info: TaskInfo,
    auto_stage: AutoStage,
}

impl ExecTaskStartAuto {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecTaskStartAuto"),
            auto_stage: AutoStage::AutoShadow,
        }
    }
}

impl Task for ExecTaskStartAuto {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskStartAuto initialized");
        let sub = subscribe!("auto/stage");
        tx.send(sub)?;
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
        for record in &inputs {
            if let Ok(topic) = record.try_get_topic() {
                if topic == "auto/stage" {
                    let stage: Vec<AutoStageMessage> = record.to_serde().unwrap();
                    for s in stage {
                        self.auto_stage = s.stage;
                    }
                }
            }
        }
        if self.auto_stage == AutoStage::AutoShadow {
            let packet = publish!("auto/stage", &AutoStageMessage::new(AutoStage::AutoStart));
            tx.send(packet)?;
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
