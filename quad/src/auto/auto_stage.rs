//
use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};

/// Represents the different stages of the autonomous flight.
/// Each stage has specific tasks associated with it, guiding the drone
/// from initialization to landing.  The stages are designed to be
/// chained together, with each stage responsible for a specific set of
/// actions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AutoStage {
    /// Initial stage, disabled and waiting for an external command to start.
    AutoShadow,

    /// Takeoff stage, sends takeoff command to Ardupilot and promotes to AutoHover.
    AutoStart,

    AutoTakeoff,
    /// Hover stage, initializes guided mode and sends guidance commands, promotes to AutoGuided.
    AutoHover,

    /// Guided stage, continuously sends position guidance commands to Ardupilot and listens for land command.
    AutoGuided,

    /// Land stage, sends landing command to Ardupilot and monitors descent.
    AutoLand,
}

impl Display for AutoStage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
//
