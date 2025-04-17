use serde::{Deserialize, Serialize};

use super::auto_stage::AutoStage;

#[derive(Serialize, Deserialize, Debug)]
pub struct AutoStageMessage {
    pub stage: AutoStage,
}

impl AutoStageMessage {
    pub fn new(stage: AutoStage) -> Self {
        Self { stage }
    }
}
