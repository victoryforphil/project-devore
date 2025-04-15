use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use crate::message::record::Record;
use crate::tasks::info::TaskInfo;

/// A queue that holds messages for a specific subscription
/// This is used to implement an event-based subscription model
/// where each subscription has its own queue of messages
#[derive(Debug, Clone)]
pub struct SubscriptionQueue {
    /// The task that owns this subscription
    task_info: TaskInfo,
    
    /// The topic pattern this subscription is for
    topic_pattern: String,
    
    /// The queue of messages for this subscription
    /// Using a VecDeque for efficient push and pop operations
    queue: Arc<Mutex<VecDeque<Record>>>,
}

impl SubscriptionQueue {
    /// Create a new subscription queue for the given task and topic pattern
    pub fn new(task_info: TaskInfo, topic_pattern: String) -> Self {
        Self {
            task_info,
            topic_pattern,
            queue: Arc::new(Mutex::new(VecDeque::new())),
        }
    }
    
    /// Add a record to the queue
    pub fn push(&self, record: Record) {
        let mut queue = self.queue.lock().unwrap();
        queue.push_back(record);
    }
    
    /// Drain the queue and return all records
    pub fn drain(&self) -> Vec<Record> {
        let mut queue = self.queue.lock().unwrap();
        let records: Vec<Record> = queue.drain(..).collect();
        records
    }
    
    /// Check if the queue is empty
    pub fn is_empty(&self) -> bool {
        let queue = self.queue.lock().unwrap();
        queue.is_empty()
    }
    
    /// Get the number of records in the queue
    pub fn len(&self) -> usize {
        let queue = self.queue.lock().unwrap();
        queue.len()
    }
    
    /// Get the task info for this subscription
    pub fn task_info(&self) -> &TaskInfo {
        &self.task_info
    }
    
    /// Get the topic pattern for this subscription
    pub fn topic_pattern(&self) -> &str {
        &self.topic_pattern
    }
} 