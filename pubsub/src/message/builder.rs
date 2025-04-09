
use std::{collections::HashMap, sync::Arc};

use arrow::{array::{Int32Array, RecordBatch}, datatypes::{DataType, Field, Schema}};

use crate::message::into_message::IntoMessage;


pub struct MessageBuilder<'a> {
    pub topic: String,
    pub msg: &'a dyn IntoMessage,
}


pub struct MockMessage{
    pub value: i32,
}
impl IntoMessage for MockMessage {
    fn get_schema(&self) -> Arc<Schema> {
        Arc::new(Schema::new(vec![Field::new("value", DataType::Int32, false)]))
    }

    fn get_record_batch(&self) -> RecordBatch {
        let value_array = Arc::new(Int32Array::from(vec![self.value]));
        RecordBatch::try_new(self.get_schema(), vec![value_array]).unwrap()
    }
}

impl<'a> MessageBuilder<'a> {
    pub fn new(topic: impl Into<String>, msg: &'a dyn IntoMessage) -> Self {
        Self { topic: topic.into(), msg }
    }

    pub fn get_schema(&self) -> Arc<Schema> {
        self.msg.get_schema()
    }
    pub fn build(self) -> RecordBatch {
       let mut rb = self.msg.get_record_batch();
       let mut metadata = HashMap::new();
       metadata.insert("topic".to_string(), self.topic.clone());

       // Clone the Arc to get a new reference to the schema
       let schema_arc = self.get_schema();
       // Get a reference to the schema inside the Arc
       let schema_ref = schema_arc.as_ref();
       // Create a new schema with the metadata
       let schema_with_metadata = Schema::new(schema_ref.fields().clone()).with_metadata(metadata);
       // Wrap the new schema in an Arc
       let schema = Arc::new(schema_with_metadata);
       
       rb.with_schema(schema).unwrap()
    }
}

/// A macro for creating a MessageBuilder with a topic and message.
///
/// This macro provides a convenient way to create a MessageBuilder instance
/// with a topic and a message that implements the IntoMessage trait.
///
/// # Examples
///
/// ```
/// use pubsub::message::msg;
///
/// let builder = msg!("my-topic", my_message);
/// ```
///
/// # Arguments
///
/// * `topic` - A string-like value that can be converted into a String
/// * `msg` - A reference to a type that implements the IntoMessage trait
#[macro_export]
macro_rules! msg {
    ($topic:expr, $msg:expr) => {
        $crate::message::builder::MessageBuilder::new($topic, $msg)
    };
}
