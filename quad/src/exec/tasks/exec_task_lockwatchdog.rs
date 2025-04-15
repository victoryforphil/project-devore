use log::{info, debug, warn};
use mavlink::ardupilotmega::{EkfStatusFlags, MavMessage, EKF_STATUS_REPORT_DATA};
use pubsub::{publish, subscribe, tasks::{
    info::TaskInfo,
    task::Task,
}};
use std::time::{Duration, Instant};

use crate::exec::{messages::ExecStageMessage, stage::ExecStage};

/// Task that monitors EKF lock status and updates exec stage to HealthyUnarmed when lock is achieved
pub struct ExecTaskLockWatchdog {
    info: TaskInfo,
    has_lock: bool,
    last_check_time: Instant,
    check_interval: Duration,
    // Tracking subscribed data
    has_ekf_data: bool,
}

impl ExecTaskLockWatchdog {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecTaskLockWatchdog"),
            has_lock: false,
            last_check_time: Instant::now(),
            check_interval: Duration::from_millis(500), // Check lock every 500ms
            has_ekf_data: false,
        }
    }
    
    /// Check if EKF has sufficient position lock
    fn check_ekf_lock(&self, ekf_status: &EKF_STATUS_REPORT_DATA) -> bool {
        // For lock, we need horizontal position (relative or absolute) in addition to attitude and velocity
        let required_flags: EkfStatusFlags = 
            EkfStatusFlags::EKF_ATTITUDE | 
            EkfStatusFlags::EKF_VELOCITY_HORIZ | 
            EkfStatusFlags::EKF_POS_HORIZ_REL | 
            EkfStatusFlags::EKF_POS_HORIZ_ABS;
        
        // Check if any of the horizontal position flags are set along with attitude and velocity
        let attitude_and_vel = EkfStatusFlags::EKF_ATTITUDE | EkfStatusFlags::EKF_VELOCITY_HORIZ;
        let horiz_pos = EkfStatusFlags::EKF_POS_HORIZ_REL | EkfStatusFlags::EKF_POS_HORIZ_ABS;
        
        let has_attitude_and_vel = (ekf_status.flags & attitude_and_vel) == attitude_and_vel;
        let has_horiz_pos = (ekf_status.flags & horiz_pos).bits() > 0;
        
        has_attitude_and_vel && has_horiz_pos
    }
}

impl Task for ExecTaskLockWatchdog {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskLockWatchdog initialized");
        
        // Subscribe to the EKF status topics
        tx.send(subscribe!("mavlink/ekf_status_report"))?;
        
        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        // Run if it's time to check again or haven't promoted yet
        Ok(!self.has_lock || self.last_check_time.elapsed() >= self.check_interval)
    }

    fn run(
        &mut self,
        inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        // Reset last check time
        self.last_check_time = Instant::now();
        
        // Process input records
        for record in &inputs {
            if let Ok(topic) = record.try_get_topic() {
                // Check EKF status reports
                if topic == "mavlink/ekf_status_report" {
                    let ekf_status: Vec<EKF_STATUS_REPORT_DATA> = record.to_serde().unwrap_or_default();
                    for status in ekf_status {
                        self.has_ekf_data = true;
                        let has_lock = self.check_ekf_lock(&status);
                        
                        if has_lock && !self.has_lock {
                            info!("EKF lock achieved, updating exec stage to HealthyUnarmed");
                            self.has_lock = true;
                            
                            // Publish stage update to exec/stage
                            let pub_packet = publish!("exec/stage", &ExecStageMessage::new(ExecStage::HealthyUnarmed));
                            tx.send(pub_packet)?;
                        } else if !has_lock && self.has_lock {
                            warn!("EKF lock lost");
                            self.has_lock = false;
                        }
                    }
                }
            }
        }
        
        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("ExecTaskLockWatchdog cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
} 