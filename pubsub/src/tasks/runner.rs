use std::collections::HashMap;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::mpsc;
use std::sync::Arc;
use std::sync::Mutex;

use log::debug;
use log::info;

use crate::message::record::Record;
use crate::message::record::RecordFlag;
use crate::tasks::meta_control::MetaCommand;

use super::info::TaskInfo;
use super::logging::OutputFormat;
use super::logging::RunnerLogger;
use super::state::RunnerState;
use super::task::Task;
pub struct Runner {
    tasks: HashMap<TaskInfo, Arc<Mutex<dyn Task>>>,
    spawn_tasks: HashSet<TaskInfo>,
    running_tasks: HashSet<TaskInfo>,
    state: Arc<Mutex<RunnerState>>,
    subscriptions: HashMap<TaskInfo, Vec<String>>,
    logger: Arc<Mutex<RunnerLogger>>,
}

impl Default for Runner {
    fn default() -> Self {
        Self::new()
    }
}

impl Runner {
    pub fn new() -> Self {
        Self {
            tasks: HashMap::new(),
            spawn_tasks: HashSet::new(),
            running_tasks: HashSet::new(),
            state: Arc::new(Mutex::new(RunnerState::new())),
            subscriptions: HashMap::new(),
            logger: Arc::new(Mutex::new(
                RunnerLogger::new(
                    PathBuf::from("logs"),
                    100,
                    10,
                    [OutputFormat::Parquet, OutputFormat::Csv].into(),
                    None,
                )
                .unwrap(),
            )),
        }
    }

    pub fn add_task(&mut self, task: Arc<Mutex<dyn Task>>) {
        let task_lock = task.lock().unwrap();
        let task_info = task_lock.get_task_info().clone();
        drop(task_lock);
        info!("Adding task: {}", task_info);
        if task_info.insta_spawn {
            info!("Task {} Insta-spawned", task_info);
            self.spawn_tasks.insert(task_info.clone());
        }
     
        self.tasks.insert(task_info.clone(), task);
    }

    pub fn add_subscription(&mut self, task_info: &TaskInfo, topic: String) {
        info!(
            "Adding subscription for task {} with topic {}",
            task_info, topic
        );
        self.subscriptions
            .entry(task_info.clone())
            .or_default()
            .push(topic);
    }

    pub fn start_task(&mut self, task_info: &TaskInfo) -> Result<(), anyhow::Error> {
        if !self.tasks.contains_key(task_info) {
            return Err(anyhow::anyhow!("Task {} not found", task_info));
        }
        
        if !self.running_tasks.contains(task_info) {
            info!("Starting task: {}", task_info);
            self.running_tasks.insert(task_info.clone());
        }
        
        Ok(())
    }

    pub fn stop_task(&mut self, task_info: &TaskInfo) -> Result<(), anyhow::Error> {
        if self.running_tasks.contains(task_info) {
            info!("Stopping task: {}", task_info);
            self.running_tasks.remove(task_info);
        }
        
        Ok(())
    }

    pub fn is_task_running(&self, task_info: &TaskInfo) -> bool {
        self.running_tasks.contains(task_info)
    }

    pub fn init(&mut self) -> Result<(), anyhow::Error> {
        let mut new_subscriptions = Vec::new();
        for (task_id, task) in &self.tasks {
            let mut task = task.lock().unwrap();
            let tx = mpsc::channel();
            let meta_tx = mpsc::channel();
            task.init(tx.0, meta_tx.0)?;

            while let Ok(record_msg) = tx.1.recv() {
                let record_type = record_msg.get_flag()?;
                match record_type {
                    RecordFlag::SubscribePacket => {
                        let task_info = task_id.clone();
                        let topic = record_msg.try_get_topic()?;
                        new_subscriptions.push((task_info, topic));
                    }
                    RecordFlag::PublishPacket => {
                        self.state.lock().unwrap().apply_record(&record_msg)?;
                    }
                }
            }

            while let Ok(meta_msg) = meta_tx.1.recv() {
                match &meta_msg.command {
                    MetaCommand::SpawnTask => {
                        info!("Spawning task: {}", meta_msg.task_info);
                        self.spawn_tasks.insert(meta_msg.task_info.clone());
                    }
                    MetaCommand::KillTask => {
                        info!("Killing task: {}", meta_msg.task_info);
                        self.running_tasks.remove(&meta_msg.task_info);
                    }
                }
            }
            
        }
        for (task_info, topic) in new_subscriptions {
            self.add_subscription(&task_info, topic);
        }
        Ok(())
    }

    pub fn run(&mut self) -> Result<(), anyhow::Error> {
        let mut new_subscriptions = Vec::new();
        let mut debug_inputs = Vec::new();
        let mut debug_n_output_map = HashMap::new();
        for (task_id, task) in &self.tasks {
            // Skip tasks that are not in the running set
            if !self.running_tasks.contains(task_id) && !self.spawn_tasks.contains(task_id) {
                continue;
            }
            
            // If task is in spawn_tasks, move it to running_tasks
            if self.spawn_tasks.contains(task_id) {
                self.spawn_tasks.remove(task_id);
                self.running_tasks.insert(task_id.clone());
            }
            
            let mut task = task.lock().unwrap();
            let should_run = task.should_run()?;
            if !should_run {
                continue;
            }

            let mut inputs: Vec<Record> = Vec::new();
            let subs = self
                .subscriptions
                .get(task_id)
                .unwrap_or(&Vec::new())
                .clone();
            for sub in subs {
                let state = self.state.lock().unwrap();
                let topic = state.query_latest_topic_data(&sub)?;
                debug_inputs.push((task_id.clone(), topic.len()));
                inputs.extend(topic);
            }

            let out_channel = mpsc::channel();
            let meta_channel = mpsc::channel();
            task.run(inputs, out_channel.0, meta_channel.0)?;
            let mut n_messages = 0;
            while let Ok(msg) = out_channel.1.recv() {
                match &msg.get_flag()? {
                    RecordFlag::SubscribePacket => {
                        let task_info = task_id.clone();
                        let topic = msg.try_get_topic()?;
                        new_subscriptions.push((task_info, topic));
                    }
                    RecordFlag::PublishPacket => {
                        self.state.lock().unwrap().apply_record(&msg)?;
                    }
                }
                n_messages += 1;
            }
            while let Ok(msg) = meta_channel.1.recv() {
                match &msg.command {
                    MetaCommand::SpawnTask => {
                        info!("Spawning task: {}", msg.task_info);
                        self.spawn_tasks.insert(msg.task_info.clone());
                    }
                    MetaCommand::KillTask => {
                        info!("Killing task: {}", msg.task_info);
                        self.running_tasks.remove(&msg.task_info);
                    }
                }
            }

            debug_n_output_map.insert(task_id, n_messages);
        }
        let mut debug_str = String::new();
        for (task_info, n_messages) in debug_n_output_map {
            debug_str.push_str(&format!(
                "Task<{}>(In: {}, Out: {}) ",
                task_info,
                debug_inputs
                    .iter()
                    .find(|(t, _)| t == task_info)
                    .unwrap_or(&(task_info.clone(), 0))
                    .1,
                n_messages
            ));
        }
        debug!("{}", debug_str);
        for (task_info, topic) in new_subscriptions {
            self.add_subscription(&task_info, topic);
        }

        self.logger
            .lock()
            .unwrap()
            .process_state(&mut self.state.lock().unwrap())?;
        // Sleep for 10ms
        std::thread::sleep(std::time::Duration::from_millis(5));
        Ok(())
    }

    pub fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        self.logger
            .lock()
            .unwrap()
            .dump_remaining_state(&mut self.state.lock().unwrap())?;
        for task in self.tasks.values() {
            let mut task = task.lock().unwrap();
            task.cleanup()?;
        }

        Ok(())
    }
}
