use log::{debug, error, info};
use mavlink::ardupilotmega::{MavMessage, REQUEST_DATA_STREAM_DATA};
use pubsub::{
    publish, publish_json, subscribe,
    tasks::{info::TaskInfo, task::Task},
};
use std::time::Duration;

/// Task that sends a MAVLink request data stream message once
pub struct ExecTaskRequestStream {
    info: TaskInfo,
    has_run: bool,
}

impl ExecTaskRequestStream {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecRequestStreamTask"),
            has_run: false,
        }
    }

    /// Create a message enabling data streaming
    fn build_request_stream() -> mavlink::ardupilotmega::MavMessage {
        mavlink::ardupilotmega::MavMessage::REQUEST_DATA_STREAM(
            mavlink::ardupilotmega::REQUEST_DATA_STREAM_DATA {
                target_system: 0,
                target_component: 0,
                req_stream_id: 0,
                req_message_rate: 20,
                start_stop: 1,
            },
        )
    }
}

impl Task for ExecTaskRequestStream {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskRequestStream initialized");
        self.has_run = false;
        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        // Only run once
        Ok(!self.has_run)
    }

    fn run(
        &mut self,
        _inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        debug!("ExecTaskRequestStream sending request stream message");

        // Create request stream message
        let request_stream = Self::build_request_stream();

        // Publish request stream to mavlink/send topic for ArdulinkConnection to transmit
        let pub_packet = publish!("mavlink/send/request_stream", &request_stream);
        if let Err(e) = tx.send(pub_packet) {
            error!("Failed to send request stream message: {}", e);
        }

        // Mark as run so it doesn't run again
        self.has_run = true;

        info!("ExecTaskRequestStream has requested data streams");
        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("ExecTaskRequestStream cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
}
