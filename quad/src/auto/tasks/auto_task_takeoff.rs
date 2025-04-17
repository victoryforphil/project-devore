// Sends takeoff command to Ardupilot
// Promotes to AutoHover

use log::{debug, error, info};
use mavlink::ardupilotmega::{MavCmd, MavMessage, COMMAND_LONG_DATA};
use pubsub::{
    publish, subscribe,
    tasks::{info::TaskInfo, task::Task},
};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

/// Struct for takeoff request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TakeoffMessage {
    pub height: f32,
}

/// Task that sends takeoff command to the drone
pub struct AutoTaskTakeoff {
    info: TaskInfo,
    command_sent: bool,
    last_attempt_time: Instant,
    retry_interval: Duration,
    max_attempts: u32,
    attempt_count: u32,
    takeoff_height: f32,
}

impl AutoTaskTakeoff {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("AutoTaskTakeoff"),
            command_sent: false,
            last_attempt_time: Instant::now(),
            retry_interval: Duration::from_secs(2), // Retry every 2 seconds
            max_attempts: 5,                        // Try 5 times max
            attempt_count: 0,
            takeoff_height: 5.0, // Default height if not specified
        }
    }

    /// Build takeoff command message
    fn build_takeoff_message(&self) -> MavMessage {
        // Create takeoff command
        // param3 is minimum pitch (5 degrees default)
        // param7 is desired takeoff altitude in meters
        MavMessage::COMMAND_LONG(COMMAND_LONG_DATA {
            param1: 0.0,
            param2: 0.0,
            param3: 5.0, // Minimum pitch in degrees
            param4: 0.0,
            param5: 0.0,
            param6: 0.0,
            param7: self.takeoff_height, // Desired altitude in meters
            command: MavCmd::MAV_CMD_NAV_TAKEOFF,
            target_system: 0,
            target_component: 0,
            confirmation: 0,
        })
    }
}

impl Task for AutoTaskTakeoff {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("AutoTaskTakeoff initialized");
        self.command_sent = false;
        self.attempt_count = 0;
        self.last_attempt_time = Instant::now();

        // Subscribe to takeoff requests
        let sub_packet = subscribe!("auto/takeoff");
        tx.send(sub_packet)?;

        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        // Run if we need to send or retry the takeoff command
        Ok(!self.command_sent
            && self.attempt_count < self.max_attempts
            && self.last_attempt_time.elapsed() >= self.retry_interval)
    }

    fn run(
        &mut self,
        inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        // Check for takeoff requests
        for record in &inputs {
            if record.try_get_topic()? == "auto/takeoff" {
                if let Ok(takeoff_request) = record.to_serde::<TakeoffMessage>() {
                    for takeoff in takeoff_request {
                        let height = takeoff.height;
                        info!("Received takeoff request with height: {}", height);
                        self.takeoff_height = height;
                        // Reset attempt counter to ensure we try with the new height
                        self.attempt_count = 0;
                        self.command_sent = false;
                    }
                }
            }
        }

        // Update attempt tracking
        self.attempt_count += 1;
        self.last_attempt_time = Instant::now();

        // Build and send the takeoff command
        let takeoff_msg = self.build_takeoff_message();
        info!(
            "Sending takeoff command to height {} meters (attempt {}/{})",
            self.takeoff_height, self.attempt_count, self.max_attempts
        );

        // Publish to mavlink/send topic for transmission
        let pub_packet = publish!("mavlink/send/command", &takeoff_msg);
        if let Err(e) = tx.send(pub_packet) {
            error!("Failed to send takeoff command: {}", e);
            return Err(anyhow::anyhow!("Failed to send takeoff command: {}", e));
        }

        // Mark as sent after max attempts
        if self.attempt_count >= self.max_attempts {
            info!("Maximum takeoff command attempts reached");
            self.command_sent = true;
        }

        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("AutoTaskTakeoff cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
}
