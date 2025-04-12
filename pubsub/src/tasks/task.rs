use std::sync::mpsc;

use serde::{Deserialize, Serialize};

use crate::message::record::Record;

use super::{info::TaskInfo, meta_control::MetaMessage};

pub type TaskChannel = mpsc::Sender<Record>;
pub type MetaTaskChannel = mpsc::Sender<MetaMessage>;




pub trait Task {
    fn init(&self, tx: TaskChannel) -> Result<(), anyhow::Error>;

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(&self, inputs: Vec<Record>, tx: TaskChannel, meta_tx: MetaTaskChannel) -> Result<(), anyhow::Error>;

    fn cleanup(&self) -> Result<(), anyhow::Error> {
        Ok(())
    }

    fn get_task_info(&self) -> &TaskInfo;
}
