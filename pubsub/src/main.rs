use std::sync::{Arc, Mutex};

use arrow::{array::{Int32Array, RecordBatch}, datatypes::{DataType, Field, Schema}};
use message::{from_record::FromRecordBatch, into_message::IntoMessage};
use tasks::{runner::Runner, task::Task};

mod message;
mod tasks;



pub struct TestMessage{
    pub value: i32,
}

impl IntoMessage for TestMessage {
    fn get_schema(&self) -> Arc<Schema> {
        Arc::new(Schema::new(vec![Field::new("value", DataType::Int32, false)]))
    }

    fn get_record_batch(&self) -> RecordBatch {
        let schema = self.get_schema();
        let value_array = Int32Array::from_iter_values(vec![self.value]);
        RecordBatch::try_new(schema, vec![Arc::new(value_array)]).unwrap()
    }
    
}

impl FromRecordBatch<TestMessage> for TestMessage {
    fn from_record_batch(record_batch: RecordBatch) -> Self {
        let value = record_batch.column(0).as_any().downcast_ref::<Int32Array>().unwrap().value(0);
        TestMessage{value: value}
    }
}

pub struct TestTaskTalker{}
impl Task for TestTaskTalker{
    fn init(&self, _tx: tasks::task::TaskChannel) -> Result<(), anyhow::Error> {
        Ok(())
    }

    fn run(&self, inputs: Vec<RecordBatch>, tx: tasks::task::TaskChannel) -> Result<(), anyhow::Error> {
        let pub_packet = publish!("test_pub", &TestMessage{value: 1});
        tx.send(pub_packet)?;
        Ok(())
    }
}

pub struct TestTaskListener{}
impl Task for TestTaskListener{
    fn init(&self, tx: tasks::task::TaskChannel) -> Result<(), anyhow::Error> {
        tx.send(subscribe!("test_*"))?;
        Ok(())
    }

    fn run(&self, inputs: Vec<RecordBatch>, tx: tasks::task::TaskChannel) -> Result<(), anyhow::Error> {
        if inputs.len() == 0 {
            return Ok(());
        }
        let packet = TestMessage::from_record_batch(inputs[0].clone());
        println!("Received message: {}", packet.value);
        Ok(())
    }
}

fn main() {
    pretty_env_logger::init();
    let mut runner = Runner::new();
    runner.add_task(Arc::new(Mutex::new(TestTaskTalker{})));
    runner.add_task(Arc::new(Mutex::new(TestTaskListener{})));
    let start_time = std::time::Instant::now();
    let max_duration = std::time::Duration::from_secs(5);
    runner.init().unwrap();
    while let Ok(_) = runner.run() {
        if start_time.elapsed() >= max_duration {
            break;
        }
    }
}
