use crate::message::record::{Record, RecordFlag};
use serde::Serialize;

use super::RecordBuilder;

pub struct PublishBuilder {
    topic: String,
    task_id: u32,
    task_name: String,
    content: Option<Record>,
}

impl PublishBuilder {
    pub fn new(topic: String) -> Self {
        Self {
            topic,
            task_id: 0,
            task_name: "unset".to_string(),
            content: None,
        }
    }

    pub fn with_task_id(mut self, task_id: u32) -> Self {
        self.task_id = task_id;
        self
    }

    pub fn with_task_name(mut self, task_name: String) -> Self {
        self.task_name = task_name;
        self
    }

    pub fn with_serde_content<T: Serialize>(mut self, content: &T) -> Result<Self, anyhow::Error> {
        let record = Record::from_serde(content)?;
        self.content = Some(record);
        Ok(self)
    }

    pub fn with_json_content(mut self, content: &str) -> Result<Self, anyhow::Error> {
        let record = Record::from_json(content)?;
        self.content = Some(record);
        Ok(self)
    }
}

impl RecordBuilder for PublishBuilder {
    fn build(self) -> Record {
        let mut record = if let Some(content) = self.content {
            content
        } else {
            // Create an empty record if no content was provided
            Record::from_serde(&()).unwrap()
        };

        record.set_flag(RecordFlag::PublishPacket).unwrap();
        record.set_topic(self.topic).unwrap();
        record
    }
}

/// A macro to easily create a PublishBuilder from a topic and content.
///
/// # Examples
///
/// ```
/// let content = Record::from_serde(&my_struct).unwrap();
/// let builder = publish!("my_topic", content);
/// let record = builder.build();
/// ```
#[macro_export]
macro_rules! publish {
    ($topic:expr, $content:expr) => {{
        use $crate::message::builders::publish::PublishBuilder;
        use $crate::message::builders::RecordBuilder;

        let builder = PublishBuilder::new($topic.to_string())
            .with_serde_content($content)
            .unwrap()
            .build();
        builder
    }};
}

/// A macro to easily create a PublishBuilder from a topic and JSON content.
///
/// # Examples
///
/// ```
/// let json_content = r#"{"id": 1, "name": "test"}"#;
/// let builder = publish_json!("my_topic", json_content);
/// let record = builder.build();
/// ```
#[macro_export]
macro_rules! publish_json {
    ($topic:expr, $json_content:expr) => {{
        use $crate::message::builders::publish::PublishBuilder;
        use $crate::message::builders::RecordBuilder;

        let builder = PublishBuilder::new($topic.to_string())
            .with_json_content($json_content)
            .unwrap()
            .build();
        builder
    }};
}

/// A macro to create a PublishBuilder with additional task information.
///
/// # Examples
///
/// ```
/// let content = Record::from_serde(&my_struct).unwrap();
/// let builder = publish_with_info!("my_topic", content, 42, "my_task");
/// let record = builder.build();
/// ```
#[macro_export]
macro_rules! publish_with_info {
    ($topic:expr, $content:expr, $task_id:expr) => {{
        use $crate::message::builders::publish::PublishBuilder;
        use $crate::message::builders::RecordBuilder;
        let builder = PublishBuilder::new($topic.to_string())
            .with_task_id($task_id)
            .with_serde_content($content)
            .unwrap()
            .build();
        builder
    }};
    ($topic:expr, $content:expr, $task_id:expr, $task_name:expr) => {{
        use $crate::message::builders::publish::PublishBuilder;
        use $crate::message::builders::RecordBuilder;

        let builder = PublishBuilder::new($topic.to_string())
            .with_task_id($task_id)
            .with_task_name($task_name.to_string())
            .with_serde_content($content)
            .unwrap()
            .build();
        builder
    }};
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::message::builders::RecordBuilder;
    use serde::{Deserialize, Serialize};
    #[derive(Serialize, Deserialize, Debug, Default)]
    struct TestStruct {
        pub id: i32,
        pub name: String,
    }

    #[test]
    fn test_publish_macro() {
        let test_struct = TestStruct::default();

        // Basic usage
        let record = publish!("test_topic", &test_struct);

        assert_eq!(record.try_get_topic().unwrap(), "test_topic");
        assert_eq!(record.get_flag().unwrap(), RecordFlag::PublishPacket);
    }

    #[test]
    fn test_publish_with_info() {
        let test_struct = TestStruct::default();

        // With task_id
        let record = publish_with_info!("test_topic", &test_struct, 42);
        assert_eq!(record.try_get_topic().unwrap(), "test_topic");
        assert_eq!(record.get_flag().unwrap(), RecordFlag::PublishPacket);

        // With task_id and task_name
        let record = publish_with_info!("test_topic", &test_struct, 42, "my_task");
        assert_eq!(record.try_get_topic().unwrap(), "test_topic");
        assert_eq!(record.get_flag().unwrap(), RecordFlag::PublishPacket);
    }
}
