use log::{debug, info, warn};
use mavlink::ardupilotmega::{EkfStatusFlags, MavMessage, EKF_STATUS_REPORT_DATA, SYS_STATUS_DATA};
use pubsub::{
    publish, subscribe,
    tasks::{info::TaskInfo, task::Task},
};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

use crate::exec::{messages::ExecStageMessage, stage::ExecStage};

/// Task that monitors health status data and updates exec stage to AwaitingLock when healthy
pub struct ExecTaskHealthWatchdog {
    info: TaskInfo,
    is_healthy: bool,
    last_check_time: Instant,
    check_interval: Duration,
    // Tracking subscribed data
    has_ekf_data: bool,
    has_sys_status_data: bool,
    // Health status flags
    ekf_healthy: bool,
    system_healthy: bool,
}

impl ExecTaskHealthWatchdog {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecTaskHealthWatchdog"),
            is_healthy: false,
            last_check_time: Instant::now(),
            check_interval: Duration::from_millis(500), // Check health every 500ms
            has_ekf_data: false,
            has_sys_status_data: false,
            ekf_healthy: false,
            system_healthy: false,
        }
    }

    /// Check if EKF status is healthy based on flags
    fn check_ekf_health(&self, ekf_status: &EKF_STATUS_REPORT_DATA) -> bool {
        // The EKF flags are a bitfield where each bit indicates a specific status

        // We want at minimum attitude, horizontal velocity, and vertical position
        let required_flags: EkfStatusFlags = EkfStatusFlags::EKF_ATTITUDE
            | EkfStatusFlags::EKF_VELOCITY_HORIZ
            | EkfStatusFlags::EKF_POS_VERT_ABS;

        // Check if all required bits are set
        (ekf_status.flags & required_flags) == required_flags
    }

    /// Check if system status is healthy
    fn check_system_health(&self, sys_status: &SYS_STATUS_DATA) -> bool {
        // Basic check: make sure there are no communication errors
        // and battery is in acceptable range (if reported)

        let comms_healthy = sys_status.errors_comm < 100; // Allow some communication errors
        if !comms_healthy {
            warn!(
                "System status is not healthy: communication errors={}",
                sys_status.errors_comm
            );
        }
        // If battery remaining is reported (not -1), check it's above 20%
        let battery_healthy =
            sys_status.battery_remaining == -1 || sys_status.battery_remaining > 20;
        if !battery_healthy {
            warn!(
                "System status is not healthy: battery remaining={}",
                sys_status.battery_remaining
            );
        }

        comms_healthy && battery_healthy
    }
}

impl Task for ExecTaskHealthWatchdog {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        _meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        info!("ExecTaskHealthWatchdog initialized");

        // Subscribe to the health-related topics
        tx.send(subscribe!("mavlink/ekf_status_report"))?;
        tx.send(subscribe!("mavlink/sys_status"))?;

        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        // Run if it's time to check again or haven't promoted yet
        Ok(!self.is_healthy || self.last_check_time.elapsed() >= self.check_interval)
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
                    let ekf_status: Vec<EKF_STATUS_REPORT_DATA> =
                        record.to_serde().unwrap_or_default();
                    for status in ekf_status {
                        self.has_ekf_data = true;
                        self.ekf_healthy = self.check_ekf_health(&status);

                        if self.ekf_healthy {
                            debug!("EKF status is healthy");
                        } else {
                            warn!("EKF status is not healthy: flags={:04x}", status.flags);
                        }
                    }
                }

                // Check system status
                if topic == "mavlink/sys_status" {
                    let sys_status: Vec<SYS_STATUS_DATA> = record.to_serde().unwrap_or_default();
                    for status in sys_status {
                        self.has_sys_status_data = true;
                        self.system_healthy = self.check_system_health(&status);

                        if self.system_healthy {
                            debug!("System status is healthy");
                        } else {
                            warn!("System status is not healthy");
                        }
                    }
                }
            }
        }

        // Check if we have all data needed and all systems are healthy
        if self.has_ekf_data && self.has_sys_status_data {
            let all_healthy = self.ekf_healthy && self.system_healthy;

            // If all healthy and haven't promoted yet
            if all_healthy && !self.is_healthy {
                info!("All health checks passed, updating exec stage to AwaitingLock");
                self.is_healthy = true;

                // Publish stage update to exec/stage
                let pub_packet = publish!(
                    "exec/stage",
                    &ExecStageMessage::new(ExecStage::AwaitingLock)
                );
                tx.send(pub_packet)?;
            } else if !all_healthy && self.is_healthy {
                // If was healthy but now unhealthy, update status but don't demote
                warn!("Health check failed, system no longer fully healthy");
                self.is_healthy = false;
            }
        }

        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        debug!("ExecTaskHealthWatchdog cleaning up");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
}
