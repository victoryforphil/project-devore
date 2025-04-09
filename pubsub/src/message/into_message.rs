use arrow::array::RecordBatch;
use arrow::datatypes::Schema;
use std::sync::Arc;

use super::packet::{Packet, PacketType, PublishPacket};


pub trait IntoMessage {
    fn get_schema(&self) -> Arc<Schema>;
    fn get_record_batch(&self) -> RecordBatch;
  
}


/// A macro for creating a Packet with a publish message.
///
/// This macro provides a convenient way to create a Packet with a PublishPacket
/// from any type that implements the IntoMessage trait.
///
/// # Examples
///
/// ```
/// use pubsub::message::publish;
///
/// let packet = publish!("my-topic", my_message);
/// ```
///
/// # Arguments
///
/// * `topic` - A string-like value that can be converted into a String
/// * `msg` - A reference to a type that implements the IntoMessage trait
#[macro_export]
macro_rules! publish {
    ($topic:expr, $msg:expr) => {
        crate::message::packet::Packet {
            topic: $topic.into(),
            msg: crate::message::packet::PacketType::Publish(crate::message::packet::PublishPacket {
                record: $crate::msg!($topic, $msg).build(),
            }),
        }
    };
}
