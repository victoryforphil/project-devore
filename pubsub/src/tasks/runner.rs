use std::collections::HashMap;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::mpsc;
use std::sync::Arc;
use std::sync::Mutex;

use log::debug;
use log::error;
use log::info;
use log::trace;

use crate::message::record::Record;
use crate::message::record::RecordFlag;
use crate::tasks::meta_control::MetaCommand;
use crate::tasks::subscription_queue::SubscriptionQueue;

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
    subscription_queues: HashMap<TaskInfo, Vec<SubscriptionQueue>>,
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
            subscription_queues: HashMap::new(),
            logger: Arc::new(Mutex::new(
                RunnerLogger::new(
                    PathBuf::from("logs"),
                    5000,
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

        // Keep backward compatibility with the old subscriptions map for now
        self.subscriptions
            .entry(task_info.clone())
            .or_default()
            .push(topic.clone());

        // Create a new subscription queue for this task and topic
        let sub_queue = SubscriptionQueue::new(task_info.clone(), topic.clone());

        // Add the subscription queue to the map
        self.subscription_queues
            .entry(task_info.clone())
            .or_default()
            .push(sub_queue.clone());

        // Send any existing data for this topic pattern to the queue
        // This ensures that if a subscription is made after data is published,
        // the subscriber will still receive the most recent data
        if let Ok(state_lock) = self.state.lock() {
            if let Ok(records) = state_lock.query_latest_topic_data(&topic) {
                for record in records {
                    sub_queue.push(record);
                }
            }
        }
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
                        // Store in state for logging/persistence
                        self.state.lock().unwrap().apply_record(&record_msg)?;

                        // Route to any existing subscribers
                        let topic = record_msg.try_get_topic()?;
                        self.route_message_to_subscribers(&topic, record_msg.clone())?;
                    }
                }
            }

            while let Ok(meta_msg) = meta_tx.1.recv() {
                match &meta_msg.command {
                    MetaCommand::SpawnTask => {
                        info!("Spawning task: {}", meta_msg.task_info);
                        if !self.running_tasks.contains(&meta_msg.task_info) {
                            self.spawn_tasks.insert(meta_msg.task_info.clone());
                        }
                    }
                    MetaCommand::KillTask => {
                        if self.running_tasks.contains(&meta_msg.task_info) {
                            info!("Killing task: {}", meta_msg.task_info);
                            self.running_tasks.remove(&meta_msg.task_info);
                        }
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
            let should_run = match task.should_run() {
                Ok(result) => result,
                Err(err) => {
                    error!("Task '{}' failed during should_run check: {}", task_id, err);
                    continue;
                }
            };

            if !should_run {
                continue;
            }

            // New approach: Get inputs by draining all subscription queues for this task
            let mut inputs: Vec<Record> = Vec::new();
            let queues = self
                .subscription_queues
                .get(task_id)
                .cloned()
                .unwrap_or_default();
            let mut total_inputs = 0;

            for queue in &queues {
                let records = queue.drain();
                total_inputs += records.len();
                inputs.extend(records);
            }

            debug_inputs.push((task_id.clone(), total_inputs));

            let out_channel = mpsc::channel();
            let meta_channel = mpsc::channel();
            if let Err(err) = task.run(inputs, out_channel.0, meta_channel.0) {
                error!("Task '{}' failed during execution: {}", task_id, err);
                continue;
            }

            let mut n_messages = 0;
            while let Ok(msg) = out_channel.1.recv() {
                match &msg.get_flag() {
                    Ok(flag) => {
                        match flag {
                            RecordFlag::SubscribePacket => {
                                let task_info = task_id.clone();
                                match msg.try_get_topic() {
                                Ok(topic) => new_subscriptions.push((task_info, topic)),
                                Err(err) => error!("Failed to get topic from subscription message for task '{}': {}", task_id, err)
                            }
                            }
                            RecordFlag::PublishPacket => {
                                // Add to state for persistence/logging
                                if let Err(err) = self.state.lock().unwrap().apply_record(&msg) {
                                    error!(
                                        "Failed to apply record to state for task '{}': {}",
                                        task_id, err
                                    );
                                    continue;
                                }

                                // Route the message to all matching subscription queues
                                match msg.try_get_topic() {
                                Ok(topic) => {
                                    if let Err(err) = self.route_message_to_subscribers(&topic, msg.clone()) {
                                        error!("Failed to route message from task '{}': {}", task_id, err);
                                    }
                                },
                                Err(err) => error!("Failed to get topic from publish message for task '{}': {}", task_id, err)
                            }
                            }
                        }
                    }
                    Err(err) => error!(
                        "Failed to get flag from message for task '{}': {}",
                        task_id, err
                    ),
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
        trace!("{}", debug_str);

        for (task_info, topic) in new_subscriptions {
            self.add_subscription(&task_info, topic);
        }

        if let Err(err) = self
            .logger
            .lock()
            .unwrap()
            .process_state(&mut self.state.lock().unwrap())
        {
            error!("Failed to process state in logger: {}", err);
        }

        // Sleep for 5ms to avoid CPU overuse
        std::thread::sleep(std::time::Duration::from_millis(5));
        Ok(())
    }

    /// Route a published message to all matching subscription queues
    fn route_message_to_subscribers(
        &self,
        topic: &str,
        message: Record,
    ) -> Result<(), anyhow::Error> {
        for queues in self.subscription_queues.values() {
            for queue in queues {
                let pattern = queue.topic_pattern();

                // Check if this subscription matches the topic
                if topic.starts_with(pattern)
                    || (pattern.contains('*') && self.pattern_matches(pattern, topic))
                    || (pattern.contains('/') && topic.contains(pattern))
                {
                    // Add the message to the queue
                    queue.push(message.clone());
                }
            }
        }

        Ok(())
    }

    /// Helper method to check if a topic matches a pattern with wildcards
    fn pattern_matches(&self, pattern: &str, topic: &str) -> bool {
        if let Ok(regex) = regex::Regex::new(&pattern.replace('*', ".*")) {
            regex.is_match(topic)
        } else {
            false
        }
    }

    pub fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        // Process and dump any remaining state data
        self.logger
            .lock()
            .unwrap()
            .dump_remaining_state(&mut self.state.lock().unwrap())?;

        // Clean up all tasks
        for task in self.tasks.values() {
            let mut task = task.lock().unwrap();
            task.cleanup()?;
        }

        // Clear subscription queues
        self.subscription_queues.clear();

        Ok(())
    }
}
