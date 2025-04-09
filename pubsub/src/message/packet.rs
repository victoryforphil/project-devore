use arrow::array::RecordBatch;


pub struct Packet {
    pub topic: String,
    pub msg: PacketType,
}


pub enum PacketType {
    Subscribe(SubscribePacket),
    Publish(PublishPacket),
}

pub struct SubscribePacket {
    pub topic: String,
}


pub struct PublishPacket {
    pub record: RecordBatch,
}

/// A macro for creating a Packet with a subscribe message.
///
/// This macro provides a convenient way to create a Packet with a SubscribePacket
/// for a given topic.
///
/// # Examples
///
/// ```
/// use pubsub::message::subscribe;
///
/// let packet = subscribe!("my-topic");
/// ```
///
/// # Arguments
///
/// * `topic` - A string-like value that can be converted into a String
#[macro_export]
macro_rules! subscribe {
    ($topic:expr) => {
        $crate::message::packet::Packet {
            topic: $topic.into(),
            msg: $crate::message::packet::PacketType::Subscribe($crate::message::packet::SubscribePacket {
                topic: $topic.into(),
            }),
        }
    };
}
