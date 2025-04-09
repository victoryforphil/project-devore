use arrow::array::RecordBatch;
use arrow::datatypes::Schema;
use std::sync::Arc;

use super::packet::{Packet, PacketType, PublishPacket};


pub trait FromRecordBatch<T> {
    fn from_record_batch(record_batch: RecordBatch) -> T;
}



