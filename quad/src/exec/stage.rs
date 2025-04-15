use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};
/// Represents the different stages of execution for the drone
/// Each stage has specific tasks associated with it
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ExecStage {
    /// Initial stage waiting for connection to be established
    AwaitConnection,
    
    /// Waiting for data streams to be established
    AwaitingData,
    
    /// Waiting for system health checks to pass
    AwaitingHealthy,
    
    /// Waiting for GPS lock or other position lock
    AwaitingLock,
    
    /// System is healthy but not armed
    HealthyUnarmed,
    
    /// System is healthy and armed, but not in guided mode
    HealthyArmed,
    
    /// System is healthy, armed, and in guided mode - ready for autonomous control
    HealthyGuided,
    
    /// System is in an unhealthy state but recoverable
    Unhealthy,
    
    /// System is in a fatal state and cannot recover
    Fatal,
}


impl Display for ExecStage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

