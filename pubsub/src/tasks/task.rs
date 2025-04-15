use std::sync::mpsc;

use crate::message::record::Record;

use super::{info::TaskInfo, meta_control::MetaMessage};

pub type TaskChannel = mpsc::Sender<Record>;
pub type MetaTaskChannel = mpsc::Sender<MetaMessage>;

pub trait Task {
    fn init(&mut self, tx: TaskChannel, meta_tx: MetaTaskChannel) -> Result<(), anyhow::Error>;

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(&mut self, inputs: Vec<Record>, tx: TaskChannel, meta_tx: MetaTaskChannel) -> Result<(), anyhow::Error>;

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        Ok(())
    }

    fn get_task_info(&self) -> &TaskInfo;
}
