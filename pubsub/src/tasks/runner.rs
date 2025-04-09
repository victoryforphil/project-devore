use std::collections::HashMap;
use std::sync::mpsc;
use std::sync::Arc;
use std::sync::Mutex;


use log::debug;
use log::info;

use crate::message::record::Record;
use crate::message::record::RecordFlag;

use super::state::RunnerState;
use super::task::Task;

pub struct Runner {
    tasks: HashMap<u32, Arc<Mutex<dyn Task>>>,
    state: Arc<Mutex<RunnerState>>,
    subscriptions: HashMap<u32, Vec<String>>,
}

impl Runner {
    pub fn new() -> Self {
        Self {
            tasks: HashMap::new(),
            state: Arc::new(Mutex::new(RunnerState::new())),
            subscriptions: HashMap::new(),
        }
    }

    pub fn add_task(&mut self, task: Arc<Mutex<dyn Task>>) {
        let id: u32 = rand::random();
        info!("Adding task with id: {}", id);
        self.tasks.insert(id, task);
    }

    pub fn add_subscription(&mut self, task_id: u32, topic: String) {
        info!(
            "Adding subscription for task {} with topic {}",
            task_id, topic
        );
        self.subscriptions
            .entry(task_id)
            .or_insert(Vec::new())
            .push(topic);
    }

    pub fn init(&mut self) -> Result<(), anyhow::Error> {
        let mut new_subscriptions = Vec::new();
        for (task_id, task) in &self.tasks {
            let task = task.lock().unwrap();
            let tx = mpsc::channel();
            task.init(tx.0)?;
           
           while let Ok(record_msg) = tx.1.recv() {
            let record_type= record_msg.get_flag()?;
            match record_type {
                RecordFlag::SubscribePacket => {
                    let task_id = *task_id;
                    let topic = record_msg.try_get_topic()?;
                    new_subscriptions.push((task_id, topic));
                }
                RecordFlag::PublishPacket => {
                    self.state.lock().unwrap().apply_record(&record_msg)?;
                }
               
            }   
           }
        }
        for (task_id, topic) in new_subscriptions {
            self.add_subscription(task_id, topic);
        }
        Ok(())
    }

    pub fn run(&mut self) -> Result<(), anyhow::Error> {
        let mut new_subscriptions = Vec::new();
        for (task_id, task) in &self.tasks {
            let task = task.lock().unwrap();
            let should_run = task.should_run()?;
            if !should_run {
                continue;
            }

            let mut inputs: Vec<Record> = Vec::new();
            let subs = self.subscriptions.get(task_id).unwrap_or(&Vec::new()).clone();
            for sub in subs {
                let state = self.state.lock().unwrap();
                let topic = state.query_latest_topic_data(&sub)?;
                debug!("Task #{} // Inputs: {}, Query: {}", task_id, topic.len(), sub);
                inputs.extend(topic);
            }

            let out_channel = mpsc::channel();
            task.run(inputs, out_channel.0)?;
            let mut n_messages = 0;
            while let Ok(msg) = out_channel.1.recv() {
                match &msg.get_flag()? {
                    RecordFlag::SubscribePacket => {
                        let task_id = *task_id;
                        let topic = msg.try_get_topic()?;
                        new_subscriptions.push((task_id, topic));
                    }
                    RecordFlag::PublishPacket => {
                        self.state.lock().unwrap().apply_record(&msg)?;
                    }
                    }
                n_messages += 1;
            }
            debug!("Task #{} // Outputs: {}", task_id, n_messages);
        }
        debug!("Runner // New subscriptions: {}", new_subscriptions.len());
        for (task_id, topic) in new_subscriptions {
            self.add_subscription(task_id, topic);
        }
       
        // Sleep for 100ms
        std::thread::sleep(std::time::Duration::from_millis(100));
        Ok(())
    }
}
