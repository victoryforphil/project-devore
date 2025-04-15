use log::{info, debug, error};
use mavlink::ardupilotmega::{MavMessage, MavCmd, COMMAND_LONG_DATA};
use pubsub::{publish, subscribe, tasks::{
    info::TaskInfo,
    task::Task,
}};
use std::time::{Duration, Instant};

use crate::exec::{messages::ExecStageMessage, stage::ExecStage};

/// Task that sends arm command to the drone
pub struct ExecTaskSendArm {
    info: TaskInfo,
    command_sent: bool,
    last_attempt_time: Instant,
    retry_interval: Duration,
    max_attempts: u32,
    attempt_count: u32,
}

impl ExecTaskSendArm {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecTaskSendArm"),
            command_sent: false,
            last_attempt_time: Instant::now(),
            retry_interval: Duration::from_secs(2), // Retry every 2 seconds
            max_attempts: 5, // Try 5 times max
            attempt_count: 0,
        }
    }
    
    /// Build arm command message
    fn build_arm_message(&self) -> MavMessage {
        // Create arm command (param1=1 for arm, param2=21196 for force arm)
        MavMessage::COMMAND_LONG(
            COMMAND_LONG_DATA {
                param1: 1.0, // 1.0 to arm, 0.0 to disarm
                param2: 21196.0, // 21196 is the code for arm/disarm forcefully
                param3: 0.0,
                param4: 0.0,
                param5: 0.0,
                param6: 0.0,
                param7: 0.0,
                command: MavCmd::MAV_CMD_COMPONENT_ARM_DISARM,
                target_system: 0,
                target_component: 0,
                confirmation: 0,
            },
        )
    }
}

impl Task for ExecTaskSendArm {
    fn init(
        &mut self,
        _tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskSendArm initialized");
        self.command_sent = false;
        self.attempt_count = 0;
        self.last_attempt_time = Instant::now();
        
        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        // Run if we need to send or retry the arm command
        Ok(!self.command_sent && 
           self.attempt_count < self.max_attempts && 
           self.last_attempt_time.elapsed() >= self.retry_interval)
    }

    fn run(
        &mut self,
        _inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        // Update attempt tracking
        self.attempt_count += 1;
        self.last_attempt_time = Instant::now();
        
        // Build and send the arm command
        let arm_msg = self.build_arm_message();
        info!("Sending arm command (attempt {}/{})", self.attempt_count, self.max_attempts);
        
        // Publish to mavlink/send topic for transmission
        let pub_packet = publish!("mavlink/send/command", &arm_msg);
        if let Err(e) = tx.send(pub_packet) {
            error!("Failed to send arm command: {}", e);
            return Err(anyhow::anyhow!("Failed to send arm command: {}", e));
        }
        
        // Mark as sent (but ArmWatchdog will check if it actually worked)
        if self.attempt_count >= self.max_attempts {
            info!("Maximum arm attempts reached");
            self.command_sent = true;
        }
        
        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("ExecTaskSendArm cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
} 