use std::sync::mpsc;

use serde::{Deserialize, Serialize};

use crate::message::record::Record;

pub type TaskChannel = mpsc::Sender<Record>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskInfo{
    pub name: String,
}

impl TaskInfo{
    pub fn new(name: impl Into<String>) -> Self {
        Self { name: name.into() }
    }
}

pub trait Task {
    fn init(&self, tx: TaskChannel) -> Result<TaskInfo, anyhow::Error>;

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(&self, inputs: Vec<Record>, tx: TaskChannel) -> Result<(), anyhow::Error>;

    fn cleanup(&self) -> Result<(), anyhow::Error> {
        Ok(())
    }
}
