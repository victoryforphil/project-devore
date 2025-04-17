use log::{debug, error, info};
use mavlink::ardupilotmega::{MavMessage, MavType, HEARTBEAT_DATA};
use pubsub::{
    publish, publish_json, subscribe,
    tasks::{info::TaskInfo, task::Task},
};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Task that sends regular MAVLink heartbeat messages
pub struct ExecTaskHeartbeat {
    info: TaskInfo,
    last_heartbeat_time: std::time::Instant,
    heartbeat_interval: Duration,
}

impl ExecTaskHeartbeat {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecHeartbeatTask"),
            last_heartbeat_time: std::time::Instant::now(),
            heartbeat_interval: Duration::from_millis(1000), // 1Hz heartbeat rate
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct HeartbeatMessage {
    pub custom_mode: u32,
    pub mavtype: u8,
    pub autopilot: u8,
    pub base_mode: u8,
    pub system_status: u8,
    pub mavlink_version: u8,
}

impl Task for ExecTaskHeartbeat {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskHeartbeat initialized");

        // Reset the timer
        self.last_heartbeat_time = std::time::Instant::now();

        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        // Run if it's time to send another heartbeat
        Ok(self.last_heartbeat_time.elapsed() >= self.heartbeat_interval)
    }

    fn run(
        &mut self,
        _inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        debug!("ExecTaskHeartbeat sending heartbeat");

        // Create heartbeat message

        // Send initial heartbeat
        let heartbeat = MavMessage::HEARTBEAT(mavlink::ardupilotmega::HEARTBEAT_DATA {
            custom_mode: 0,
            mavtype: mavlink::ardupilotmega::MavType::MAV_TYPE_GCS,
            autopilot: mavlink::ardupilotmega::MavAutopilot::MAV_AUTOPILOT_INVALID,
            base_mode: mavlink::ardupilotmega::MavModeFlag::empty(),
            system_status: mavlink::ardupilotmega::MavState::MAV_STATE_ACTIVE,
            mavlink_version: 3,
        });

        // Publish heartbeat to mavlink/send topic for ArdulinkConnection to transmit
        let pub_packet = publish!("mavlink/send/heartbeat", &heartbeat);
        if let Err(e) = tx.send(pub_packet) {
            error!("Failed to send heartbeat message: {}", e);
        }

        // Update last heartbeat time
        self.last_heartbeat_time = std::time::Instant::now();

        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("ExecTaskHeartbeat cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
}
