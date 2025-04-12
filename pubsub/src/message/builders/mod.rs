use super::record::Record;
pub mod subscribe;
pub mod publish;
pub trait RecordBuilder {
    fn build(self) -> Record;
}




