use crate::message::record::{Record, RecordFlag};
use serde::Serialize;

use super::RecordBuilder;


pub struct SubscribeBuilder {
    packet: SubscribePacket,
}
#[derive(Serialize)]
pub struct SubscribePacket {
    topic: String,
    task_id: u32,
    task_name: String,
}
impl SubscribeBuilder {
    pub fn new(topic: String) -> Self {
        Self { packet: SubscribePacket { topic, task_id: 0, task_name: "unset".to_string() } }
    }

    pub fn with_task_id(mut self, task_id: u32) -> Self {
        self.packet.task_id = task_id;
        self
    }

    pub fn with_task_name(mut self, task_name: String) -> Self {
        self.packet.task_name = task_name;
        self
    }
}

impl RecordBuilder for SubscribeBuilder {
    fn build(self) -> Record {
        let mut record = Record::from_serde(&self.packet).unwrap();
        record.set_flag(RecordFlag::SubscribePacket).unwrap();
        record.set_topic(self.packet.topic.clone()).unwrap();
        record
    }
}

/// A macro to easily create a SubscribeBuilder from a topic and a serializable struct.
///
/// # Examples
///
/// ```
/// let builder = subscribe!("my_topic", my_struct);
/// let record = builder.build();
/// ```
#[macro_export]
macro_rules! subscribe {
    ($topic:expr) => {
        {
            use $crate::message::builders::subscribe::SubscribeBuilder;
            use $crate::message::builders::RecordBuilder;
            
            let builder = SubscribeBuilder::new($topic.to_string());
            builder.build()
        }
    };
    ($topic:expr,$task_id:expr) => {
        {
            use $crate::message::builders::subscribe::SubscribeBuilder;
            use $crate::message::builders::RecordBuilder;
            
            let builder = SubscribeBuilder::new($topic.to_string())
                .with_task_id($task_id);
            builder.build()
        }
    };
    ($topic:expr,$task_id:expr, $task_name:expr) => {
        {
            use $crate::message::builders::subscribe::SubscribeBuilder;
            use $crate::message::builders::RecordBuilder;
            
            let builder = SubscribeBuilder::new($topic.to_string())
                .with_task_id($task_id)
                .with_task_name($task_name.to_string());
            builder.build()
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, Debug, Default)]
    struct TestStruct {
        pub id: i32,
        pub name: String,
    }

    #[test]
    fn test_subscribe_macro() {
        let test_struct = TestStruct::default();
        
        // Basic usage
        let record = subscribe!("test_topic", 42);
        assert_eq!(record.try_get_topic().unwrap(), "test_topic");
        assert_eq!(record.get_flag().unwrap(), RecordFlag::SubscribePacket);
        
        // With task_id
        let record = subscribe!("test_topic", 42);
        assert_eq!(record.try_get_topic().unwrap(), "test_topic");
        assert_eq!(record.get_flag().unwrap(), RecordFlag::SubscribePacket);
        
        // With task_id and task_name
        let record = subscribe!("test_topic", 42, "my_task");
        assert_eq!(record.try_get_topic().unwrap(), "test_topic");
    }
}
