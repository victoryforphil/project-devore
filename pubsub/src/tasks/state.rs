use std::collections::HashMap;

use crate::message::record::Record;

pub struct RunnerState {
    logs: HashMap<String, Record>,
}

impl Default for RunnerState {
    fn default() -> Self {
        Self::new()
    }
}

impl RunnerState {
    pub fn new() -> Self {
        Self {
            logs: HashMap::new(),
        }
    }
    
    pub fn apply_record(&mut self, record: &Record) -> Result<(), anyhow::Error> {
        self.append_record(record)?;
        Ok(())
    }

    pub fn get_topics(&self) -> Vec<String> {
        self.logs.keys().cloned().collect()
    }
    
    /// Get the number of rows for a specific topic, if it exists.
    pub fn get_topic_row_count(&self, topic: &str) -> Option<usize> {
        self.logs.get(topic).map(|record| record.to_record_batch().num_rows())
    }

    /// Get an immutable reference to the record for a specific topic, if it exists.
    pub fn get_topic_record(&self, topic: &str) -> Option<&Record> {
        self.logs.get(topic)
    }

    /// Replaces the record for a given topic.
    /// If the topic doesn't exist, it will be inserted.
    pub fn replace_topic_record(&mut self, topic: String, record: Record) {
        self.logs.insert(topic, record);
    }

    /// Removes a topic from the state and returns the removed record, if it existed.
    pub fn remove_topic(&mut self, topic: &str) -> Option<Record> {
        self.logs.remove(topic)
    }

    /// Get all topic keys matching the input query.
    /// Supports path (parent/child) and wildcard (*).
    pub fn query_topics(&self, query: &str) -> Result<Vec<String>, anyhow::Error> {
        let mut topics = Vec::new();
        for topic_key in self.logs.keys() {
            if topic_key.starts_with(query) {
                topics.push(topic_key.to_string());
            }
            else if query.contains('*') {
                // Handle wildcard matching
                let pattern = query.replace('*', ".*");
                if let Ok(regex) = regex::Regex::new(&pattern) {
                    if regex.is_match(topic_key) {
                        topics.push(topic_key.to_string());
                    }
                }
            }
            else if query.contains('/') && topic_key.contains(query) {
                // Handle path matching
                topics.push(topic_key.to_string());
            }
        }
        Ok(topics)
    }
    
    pub fn get_latest_topic_data(&self, topic: &str) -> Result<Record, anyhow::Error> {
        let record = self.logs.get(topic).ok_or_else(|| anyhow::anyhow!("Topic not found"))?;
        let record = record.get_n_latest_rows(1)?;
        Ok(record)
    }

    pub fn query_latest_topic_data(&self, query: &str) -> Result<Vec<Record>, anyhow::Error> {  
        let topics = self.query_topics(query)?;
        let mut records = Vec::new();
        for topic in topics {
            let record = self.get_latest_topic_data(&topic)?;
            records.push(record);
        }
        Ok(records)
    }

    pub fn get_n_latest_topic_data(&self, topic: &str, n: usize) -> Result<Record, anyhow::Error> {
        let record = self.logs.get(topic).ok_or_else(|| anyhow::anyhow!("Topic not found"))?;
        // Get the last n rows
        let last_n_rows = record.get_n_latest_rows(n)?;
        Ok(last_n_rows)
    }
    
    fn append_record(&mut self, record: &Record) -> Result<(), anyhow::Error> {
        let topic = record.try_get_topic()?;
        let entry = self.logs.entry(topic);
        
        match entry {
            std::collections::hash_map::Entry::Vacant(e) => {
                // If no existing record batch, just insert the new one
                e.insert(record.clone());
            },
            std::collections::hash_map::Entry::Occupied(mut e) => {
                // If there's an existing record batch, concatenate with the existing record
                let existing_record = e.get();
                let combined_record = existing_record.concat(record)?;
                e.insert(combined_record);
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    
    use crate::publish;

    use super::*;
    
    
    use serde::{Deserialize, Serialize};
    

    #[derive(Serialize, Deserialize, Debug, Default)]
    struct TestMessage {
        value: i32,
    }

    #[test]
    fn test_new_runner_state() {
        let state = RunnerState::new();
        assert_eq!(state.logs.len(), 0);
    }

    #[test]
    fn test_apply_packet_publish() {
        let mut state = RunnerState::new();
        let test_data = TestMessage::default();
        let packet = publish!("test_topic", &test_data);

        let result = state.apply_record(&packet);
        assert!(result.is_ok());
        
        let topic_data = state.logs.get("test_topic").unwrap();
        assert_eq!(topic_data.to_record_batch().num_rows(), 1);

        let topic = topic_data.try_get_topic().unwrap();
        assert_eq!(topic, "test_topic");
    }

    #[test]
    fn test_get_latest_topic_data() {
        let mut state = RunnerState::new();
        let test_data = TestMessage { value: 1 };
        let test_data2 = TestMessage { value: 2 };
        let test_data3 = TestMessage { value: 3 };
        
        state.apply_record(&publish!("test_topic", &test_data)).unwrap();
        state.apply_record(&publish!("test_topic", &test_data2)).unwrap();
        state.apply_record(&publish!("test_topic", &test_data3)).unwrap();
        
        let result = state.get_latest_topic_data("test_topic");
        assert!(result.is_ok());
        
        let latest = result.unwrap();
        assert_eq!(latest.to_record_batch().num_rows(), 1);
        
        let read_value = latest.to_serde::<TestMessage>().unwrap();
        assert_eq!(read_value[0].value, 3);
    }

    #[test]
    fn test_get_n_latest_topic_data() {
        let mut state = RunnerState::new();
        
        for i in 1..=5 {
            let test_data = TestMessage { value: i };
            state.apply_record(&publish!("test_topic", &test_data)).unwrap();
        }
        
        let result = state.get_n_latest_topic_data("test_topic", 3);
        assert!(result.is_ok());
        
        let latest = result.unwrap();
        assert_eq!(latest.to_record_batch().num_rows(), 3);
        
        let read_values = latest.to_serde::<TestMessage>().unwrap();
        assert_eq!(read_values.len(), 3);
        assert_eq!(read_values[0].value, 3);
        assert_eq!(read_values[1].value, 4);
        assert_eq!(read_values[2].value, 5);
    }

    #[test]
    fn test_topic_not_found() {
        let state = RunnerState::new();
        
        let result = state.get_latest_topic_data("nonexistent_topic");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().to_string(), "Topic not found");
        
        let result = state.get_n_latest_topic_data("nonexistent_topic", 3);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().to_string(), "Topic not found");
    }

    #[test]
    fn test_append_multiple_record_batches() {
        let mut state = RunnerState::new();
        
        // First batch of messages
        for i in 1..=3 {
            let test_data = TestMessage { value: i };
            state.apply_record(&publish!("test_topic", &test_data)).unwrap();
        }
        
        // Second batch of messages
        for i in 4..=6 {
            let test_data = TestMessage { value: i };
            state.apply_record(&publish!("test_topic", &test_data)).unwrap();
        }
        
        let topic_data = state.logs.get("test_topic").unwrap();
        assert_eq!(topic_data.to_record_batch().num_rows(), 6);
        
        let read_values = topic_data.to_serde::<TestMessage>().unwrap();
        for i in 0..6 {
            assert_eq!(read_values[i].value, i as i32 + 1);
        }
    }
}
