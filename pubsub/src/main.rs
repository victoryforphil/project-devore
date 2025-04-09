use std::sync::{Arc, Mutex};

use arrow::{array::{Int32Array}, datatypes::{DataType, Field, Schema}};
use message::record::RecordFlag;
use tasks::{runner::Runner, task::Task};
use serde::{Serialize, Deserialize};

mod message;
mod tasks;


#[derive(Serialize, Deserialize, Debug, Default)]
pub struct TestMessage{
    pub value: i32,
}

pub struct TestTaskTalker{
    pub value: i32,
}
impl Task for TestTaskTalker{
    fn init(&self, _tx: tasks::task::TaskChannel) -> Result<(), anyhow::Error> {
        Ok(())
    }

    fn run(&self, _inputs: Vec<message::record::Record>, tx: tasks::task::TaskChannel) -> Result<(), anyhow::Error> {
        let test_msg = TestMessage { value: rand::random::<i32>() };
        let pub_packet = publish!("test_pub", &test_msg);
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

    fn run(&self, inputs: Vec<message::record::Record>, _tx: tasks::task::TaskChannel) -> Result<(), anyhow::Error> {
        if inputs.is_empty() {
            return Ok(());
        }
        
        for record in inputs {
            match record.try_get_topic()?.as_str() {
                "test_pub" => {
                    let test_msg: Vec<TestMessage> = record.to_serde().unwrap();
                    println!("Received message: {}", test_msg[0].value);
                }
                _ => {}
            }
        }
        
        Ok(())
    }
}

fn main() {
    pretty_env_logger::init();
    let mut runner = Runner::new();
    runner.add_task(Arc::new(Mutex::new(TestTaskTalker{value: 0})));
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
