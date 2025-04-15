use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tasks::runner::Runner;
use tasks::task::Task;
use tasks::info::TaskInfo;
use tasks::task::MetaTaskChannel;

use log::info;

mod message;
mod tasks;
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Pose {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct TestMessage {
    pub value: i32,
    pub pose: Pose,
}

pub struct TestTaskTalker {
    pub value: i32,
    task_info: TaskInfo,
}
impl Task for TestTaskTalker {
    fn init(&mut self, tx: tasks::task::TaskChannel, meta_tx: MetaTaskChannel) -> Result<(), anyhow::Error> {
        info!("TestTaskTalker initialized");
        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(
        &mut self,
        _inputs: Vec<message::record::Record>,
        tx: tasks::task::TaskChannel,
        _meta_tx: MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
        let test_msg = TestMessage {
            value: rand::random::<i32>(),
            pose: Pose {
                x: rand::random::<f64>(),
                y: rand::random::<f64>(),
                z: rand::random::<f64>(),
            },
        };
        let pub_packet = publish!("test_pub", &test_msg);
        tx.send(pub_packet)?;
        Ok(())
    }
    
    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        Ok(())
    }
    
    fn get_task_info(&self) -> &TaskInfo {
        &self.task_info
    }
}

pub struct TestTaskListener {
    task_info: TaskInfo,
}
impl Task for TestTaskListener {
    fn init(&mut self, tx: tasks::task::TaskChannel, meta_tx: MetaTaskChannel) -> Result<(), anyhow::Error> {
        info!("TestTaskListener initialized");
        tx.send(subscribe!("test_*"))?;
        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        Ok(true)
    }

    fn run(
        &mut self,
        inputs: Vec<message::record::Record>,
        _tx: tasks::task::TaskChannel,
        _meta_tx: MetaTaskChannel,
    ) -> Result<(), anyhow::Error> {
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
    
    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        Ok(())
    }
    
    fn get_task_info(&self) -> &TaskInfo {
        &self.task_info
    }
}

fn main() {
    pretty_env_logger::init();
    let mut runner = Runner::new();
    runner.add_task(Arc::new(Mutex::new(TestTaskTalker { 
        value: 0,
        task_info: TaskInfo::new("TestTaskTalker"),
    })));
    runner.add_task(Arc::new(Mutex::new(TestTaskListener {
        task_info: TaskInfo::new("TestTaskListener"),
    })));
    let start_time = std::time::Instant::now();
    let max_duration = std::time::Duration::from_secs(5);
    runner.init().unwrap();
    while let Ok(_) = runner.run() {
        if start_time.elapsed() >= max_duration {
            break;
        }
    }
    runner.cleanup().unwrap();
}
