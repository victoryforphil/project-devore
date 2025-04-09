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
