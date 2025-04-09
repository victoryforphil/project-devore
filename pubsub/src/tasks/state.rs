use std::collections::{BTreeMap, HashMap};

use arrow::array::RecordBatch;
use std::sync::Arc;
use arrow::datatypes::Schema;
use arrow::compute::concat_batches;
use crate::message::packet::{Packet, PacketType, PublishPacket};

pub struct RunnerState {
    topic_data: HashMap<String, RecordBatch>,
}

impl RunnerState {
    pub fn new() -> Self {
        Self {
            topic_data: HashMap::new(),
        }
    }
    
    pub fn apply_packet(&mut self, packet: &PublishPacket) -> Result<(), anyhow::Error> {
        let rb = &packet.record;
        let topic = rb.schema_ref().metadata().get("topic").unwrap().to_string();
        self.append_record_batch(topic, rb)?;
        Ok(())
    }

    pub fn get_topics(&self) -> Vec<String> {
        self.topic_data.keys().cloned().collect()
    }
    // Get all topic keys matching the input query.
    // Supports path (parent/child) and wildcard (*).
    pub fn query_topics(&self, query: &str) -> Result<Vec<String>, anyhow::Error> {
        let mut topics = Vec::new();
        for topic_key in self.topic_data.keys() {
            if topic_key.starts_with(query) {
                topics.push(topic_key.to_string());
            }
            else if query.contains("*") {
                // Handle wildcard matching
                let pattern = query.replace("*", ".*");
                if let Ok(regex) = regex::Regex::new(&pattern) {
                    if regex.is_match(topic_key) {
                        topics.push(topic_key.to_string());
                    }
                }
            }
            else if query.contains("/") && topic_key.contains(query) {
                // Handle path matching
                topics.push(topic_key.to_string());
            }
        }
        Ok(topics)
    }
    

    pub fn get_latest_topic_data(&self, topic: &str) -> Result<RecordBatch, anyhow::Error> {
        let record_batch = self.topic_data.get(topic).ok_or(anyhow::anyhow!("Topic not found"))?;
        // Get the last row
        let last_row = record_batch.slice(record_batch.num_rows() - 1, 1);
        Ok(last_row)
    }

    pub fn query_latest_topic_data(&self, query: &str) -> Result<Vec<RecordBatch>, anyhow::Error> {  
        let topics = self.query_topics(query)?;
        let mut record_batches = Vec::new();
        for topic in topics {
            let record_batch = self.get_latest_topic_data(&topic)?;
            record_batches.push(record_batch);
        }
        Ok(record_batches)
    }

    pub fn get_n_latest_topic_data(&self, topic: &str, n: usize) -> Result<RecordBatch, anyhow::Error> {
        let record_batch = self.topic_data.get(topic).ok_or(anyhow::anyhow!("Topic not found"))?;
        // Get the last n rows
        let last_n_rows = record_batch.slice(record_batch.num_rows() - n, n);
        Ok(last_n_rows)
    }
    
    fn append_record_batch(&mut self, topic: String, record_batch: &RecordBatch) -> Result<(), anyhow::Error> {
        let entry = self.topic_data.entry(topic);
        
        match entry {
            std::collections::hash_map::Entry::Vacant(e) => {
                // If no existing record batch, just insert the new one
                e.insert(record_batch.clone());
            },
            std::collections::hash_map::Entry::Occupied(mut e) => {
                // If there's an existing record batch, concatenate them
                let current_batch = e.get();
                let schema = Arc::new(current_batch.schema().clone());
                let combined_batch = concat_batches(&schema, &[current_batch.clone(), record_batch.clone()])?;
                e.insert(combined_batch);
            }
        }
        
        Ok(())
    }

}

#[cfg(test)]
mod tests {
    use crate::message::into_message::IntoMessage;
    use crate::message::packet::{PublishPacket, SubscribePacket};
    use crate::{msg, publish};

    use super::*;
    use arrow::array::{Int32Array, RecordBatch};
    use arrow::datatypes::{DataType, Field, Schema};
    use std::sync::Arc;

    struct TestMessage{
        value: i32,
    }
    impl IntoMessage for TestMessage {
     
        fn get_schema(&self) -> Arc<Schema> {
            Arc::new(Schema::new(vec![Field::new("value", DataType::Int32, false)]) )
        }
    
        fn get_record_batch(&self) -> RecordBatch {
            let value_array = Arc::new(Int32Array::from(vec![self.value]));
            RecordBatch::try_new(self.get_schema(), vec![value_array]).unwrap()
        }
        
    }

    #[test]
    fn test_new_runner_state() {
        let state = RunnerState::new();
        assert_eq!(state.topic_data.len(), 0);
    }

    #[test]
    fn test_apply_packet_publish() {
        let mut state = RunnerState::new();
        let test_data = TestMessage { value: 1 };
        let packet = publish!("test_topic", &test_data);

        let result = state.apply_packet(packet);
        assert!(result.is_ok());
        
        let topic_data = state.topic_data.get("test_topic").unwrap();
        assert_eq!(topic_data.num_rows(), 1);

        let metadata = topic_data.schema_ref().metadata();
        let topic = metadata.get("topic").unwrap();
        assert_eq!(topic, "test_topic");
    }
    #[test]
    fn test_apply_packet_invalid_type() {
        let mut state = RunnerState::new();
        let packet = Packet {
            topic: "test_topic".to_string(),
            msg: PacketType::Subscribe(SubscribePacket {
                topic: "test_topic".to_string(),
            }),
        };

        let result = state.apply_packet(packet);
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err().to_string(),
            "Invalid packet type. Can only apply publish packets to the state."
        );
    }

    #[test]
    fn test_get_latest_topic_data() {
        let mut state = RunnerState::new();
        let test_data = TestMessage { value: 1 };
        let test_data2 = TestMessage { value: 2 };
        let test_data3 = TestMessage { value: 3 };
        
        state.apply_packet(publish!("test_topic", &test_data)).unwrap();
        state.apply_packet(publish!("test_topic", &test_data2)).unwrap();
        state.apply_packet(publish!("test_topic", &test_data3)).unwrap();
        
        let result = state.get_latest_topic_data("test_topic");
        assert!(result.is_ok());
        
        let latest = result.unwrap();
        assert_eq!(latest.num_rows(), 1);
        
        let value_array = latest.column(0).as_any().downcast_ref::<Int32Array>().unwrap();
        assert_eq!(value_array.value(0), 3);
    }

    #[test]
    fn test_get_n_latest_topic_data() {
        let mut state = RunnerState::new();
        
        for i in 1..=5 {
            let test_data = TestMessage { value: i };
            state.apply_packet(publish!("test_topic", &test_data)).unwrap();
        }
        
        let result = state.get_n_latest_topic_data("test_topic", 3);
        assert!(result.is_ok());
        
        let latest = result.unwrap();
        assert_eq!(latest.num_rows(), 3);
        
        let value_array = latest.column(0).as_any().downcast_ref::<Int32Array>().unwrap();
        assert_eq!(value_array.value(0), 3);
        assert_eq!(value_array.value(1), 4);
        assert_eq!(value_array.value(2), 5);
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
            state.apply_packet(publish!("test_topic", &test_data)).unwrap();
        }
        
        // Second batch of messages
        for i in 4..=6 {
            let test_data = TestMessage { value: i };
            state.apply_packet(publish!("test_topic", &test_data)).unwrap();
        }
        
        let topic_data = state.topic_data.get("test_topic").unwrap();
        assert_eq!(topic_data.num_rows(), 6);
        
        let value_array = topic_data.column(0).as_any().downcast_ref::<Int32Array>().unwrap();
        for i in 0..6 {
            assert_eq!(value_array.value(i), i as i32 + 1);
        }
    }
}
