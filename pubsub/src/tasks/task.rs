use std::sync::mpsc;

use arrow::array::RecordBatch;

use crate::message::packet::{Packet, SubscribePacket};

pub type TaskChannel = mpsc::Sender<Packet>;


pub trait Task {
    fn init(&self, tx: TaskChannel) -> Result<(), anyhow::Error>;

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(&self, inputs: Vec<RecordBatch>, tx: TaskChannel) -> Result<(), anyhow::Error>;

    fn cleanup(&self) -> Result<(), anyhow::Error> {
        Ok(())
    }
}
