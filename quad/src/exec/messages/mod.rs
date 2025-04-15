use serde::{Deserialize, Serialize};

use super::stage::ExecStage;

#[derive(Serialize, Deserialize, Debug)]
pub struct ExecStageMessage {
    pub stage: ExecStage,
}

impl ExecStageMessage {
    pub fn new(stage: ExecStage) -> Self {
        Self { stage }
    }
}
