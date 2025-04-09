use std::sync::mpsc;

use crate::message::record::Record;

pub type TaskChannel = mpsc::Sender<Record>;


pub trait Task {
    fn init(&self, tx: TaskChannel) -> Result<(), anyhow::Error>;

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(&self, inputs: Vec<Record>, tx: TaskChannel) -> Result<(), anyhow::Error>;

    fn cleanup(&self) -> Result<(), anyhow::Error> {
        Ok(())
    }
}
