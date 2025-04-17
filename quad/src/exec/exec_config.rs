use std::collections::HashMap;

use super::stage::ExecStage;

pub struct ExecConfig {
    pub stage_task_names: HashMap<ExecStage, Vec<String>>,
    pub default_tasks: Vec<String>,
}

impl ExecConfig {
    pub fn new() -> Self {
        Self {
            stage_task_names: HashMap::new(),
            default_tasks: Vec::new(),
        }
    }

    pub fn with_stage_tasks(mut self, stage: ExecStage, tasks: Vec<String>) -> Self {
        self.stage_task_names.insert(stage, tasks);
        self
    }

    pub fn with_stage_task(mut self, stage: ExecStage, task_name: String) -> Self {
        self.stage_task_names
            .entry(stage)
            .or_insert_with(Vec::new)
            .push(task_name);
        self
    }

    pub fn with_default_tasks(mut self, tasks: Vec<String>) -> Self {
        self.default_tasks = tasks;
        self
    }

    pub fn with_default_task(mut self, task_name: String) -> Self {
        self.default_tasks.push(task_name);
        self
    }

    pub fn add_default_task(&mut self, task_name: String) {
        self.default_tasks.push(task_name);
    }

    pub fn add_stage_tasks(&mut self, stage: ExecStage, tasks: Vec<String>) {
        self.stage_task_names.insert(stage, tasks);
    }

    pub fn add_stage_task(&mut self, stage: ExecStage, task_name: String) {
        self.stage_task_names
            .entry(stage)
            .or_insert_with(Vec::new)
            .push(task_name);
    }

    pub fn get_stage_tasks(&self, stage: ExecStage) -> Option<&Vec<String>> {
        self.stage_task_names.get(&stage)
    }
}
