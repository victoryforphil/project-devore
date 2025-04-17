use super::record::Record;
pub mod publish;
pub mod subscribe;
pub trait RecordBuilder {
    fn build(self) -> Record;
}
