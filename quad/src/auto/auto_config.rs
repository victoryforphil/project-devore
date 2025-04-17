use std::collections::HashMap;

use super::auto_stage::AutoStage;

pub struct AutoConfig {
    pub stage_task_names: HashMap<AutoStage, Vec<String>>,
    pub script_task_name: String,
}

impl AutoConfig {
    pub fn new() -> Self {
        Self {
            stage_task_names: HashMap::new(),
            script_task_name: String::new(),
        }
    }

    pub fn with_stage_tasks(mut self, stage: AutoStage, tasks: Vec<String>) -> Self {
        self.stage_task_names.insert(stage, tasks);
        self
    }

    pub fn with_stage_task(mut self, stage: AutoStage, task_name: String) -> Self {
        self.stage_task_names
            .entry(stage)
            .or_insert_with(Vec::new)
            .push(task_name);
        self
    }

    pub fn with_script_task(mut self, task_name: String) -> Self {
        self.script_task_name = task_name;
        self
    }

    pub fn set_script_task(&mut self, task_name: String) {
        self.script_task_name = task_name;
    }

    pub fn add_stage_tasks(&mut self, stage: AutoStage, tasks: Vec<String>) {
        self.stage_task_names.insert(stage, tasks);
    }

    pub fn add_stage_task(&mut self, stage: AutoStage, task_name: String) {
        self.stage_task_names
            .entry(stage)
            .or_insert_with(Vec::new)
            .push(task_name);
    }

    pub fn get_stage_tasks(&self, stage: AutoStage) -> Option<&Vec<String>> {
        self.stage_task_names.get(&stage)
    }
}
