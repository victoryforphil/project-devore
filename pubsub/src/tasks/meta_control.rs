use super::info::TaskInfo;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MetaCommand{
    SpawnTask,
    KillTask,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaMessage{
    pub command: MetaCommand,
    pub task_info: TaskInfo,
}
impl MetaMessage{
    pub fn new(command: MetaCommand, task_info: TaskInfo) -> Self {
        Self { command, task_info }
    }
}
