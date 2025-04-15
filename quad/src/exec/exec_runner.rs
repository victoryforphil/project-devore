use core::task;

use log::info;
use pubsub::{subscribe, tasks::{
    info::TaskInfo,
    meta_control::{MetaCommand, MetaMessage},
    task::Task,
}};

use super::{exec_config::ExecConfig, stage::ExecStage};

pub struct ExecRunner {
    pub config: ExecConfig,
    pub stage: ExecStage,
    spawned_tasks: Vec<TaskInfo>,
}

impl ExecRunner {
    pub fn new(config: ExecConfig) -> Self {
        Self {
            config,
            stage: ExecStage::AwaitConnection,
            spawned_tasks: vec![],
        }
    }
}

impl Task for ExecRunner {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        // Spawn default tasks
        for task_name in self.config.default_tasks.iter() {
            info!("Spawning default task: {}", task_name);
            let task_config = TaskInfo::new(task_name.clone()).with_insta_spawn();
            self.spawned_tasks.push(task_config.clone());
            let new_task_packet = MetaMessage::new(MetaCommand::SpawnTask, task_config);
            meta_tx.send(new_task_packet)?;
        }

        // Subscribe to exec/stage
        tx.send(subscribe!("exec/stage"))?;

        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(
        &mut self,
        inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        // Check for any new exec/stage messages
        for record in &inputs {
            if let Ok(topic) = record.try_get_topic() {
                if topic.starts_with("exec/stage") {
                    let stage: Vec<ExecStage> = record.to_serde().unwrap();
                    for s in stage {
                        info!("Received exec/stage update: {}", s);
                        self.stage = s;
                    }
                }
            }
        }

        // Depending on the current stage:
        // - Get the task desired for said stage via config
        // - If the task is not in the spawned_tasks list, spawn it
        // - If the task is in the spawned_tasks list, do nothing.
        // Then go through the spawned_tasks list and:
        // - If the task is not in the desired list, kill it
        // - If the task is in the desired list, do nothing.

        let desired_tasks = self.config.get_stage_tasks(self.stage);
        let desired_tasks = match desired_tasks{
            Some(tasks) => tasks.clone(),
            None => {
               vec![]
            }
        };
        
        // We need to modify spawned_tasks, but we can't do it directly because of borrowing rules
        // Instead, collect the tasks to spawn and kill, then apply changes after
        let mut tasks_to_spawn = Vec::new();
        let mut tasks_to_kill = Vec::new();
        
        // Find tasks that need to be spawned
        for task_name in desired_tasks.iter() {
            if !self.spawned_tasks.iter().any(|t| &t.name == task_name) {
                tasks_to_spawn.push(task_name.clone());
            }
        }
        
        // Find tasks that need to be killed
        for task in self.spawned_tasks.iter() {
            if !desired_tasks.iter().any(|t| t == &task.name) {
                tasks_to_kill.push(task.clone());
            }
        }
        
        // Spawn new tasks
        for task_name in tasks_to_spawn {
            info!("Spawning task for stage {}: {}", self.stage, task_name);
            let task_config = TaskInfo::new(task_name).with_insta_spawn();
            let new_task_packet = MetaMessage::new(MetaCommand::SpawnTask, task_config.clone());
            meta_tx.send(new_task_packet)?;
            self.spawned_tasks.push(task_config);
        }
        
        // Kill tasks
        for task in tasks_to_kill {
            info!("Killing task: {}", task);
            let kill_packet = MetaMessage::new(MetaCommand::KillTask, task.clone());
            meta_tx.send(kill_packet)?;
            
            // Remove from spawned_tasks
            if let Some(position) = self.spawned_tasks.iter().position(|t| *t == task) {
                self.spawned_tasks.remove(position);
            }
        }
        
        Ok(())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        todo!()
    }
}

