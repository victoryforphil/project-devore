use pubsub::tasks::{info::TaskInfo, task::Task};

pub struct ExecTask {
    info: TaskInfo,
}

impl ExecTask {
    pub fn new() -> Self {
        Self {
            info: TaskInfo::new("ExecTask").with_insta_spawn(),
        }
    }
}

impl Task for ExecTask {
    fn init(&self, tx: pubsub::tasks::task::TaskChannel) -> Result<(), anyhow::Error> {
        let info = self.get_task_info();
      
        Ok(())
    }

    fn run(&self, inputs: Vec<pubsub::message::record::Record>, tx: pubsub::tasks::task::TaskChannel, meta_tx: pubsub::tasks::task::MetaTaskChannel) -> Result<(), anyhow::Error> {
        todo!()
    }

    fn get_task_info(&self) -> &TaskInfo {
        todo!()
    }
}