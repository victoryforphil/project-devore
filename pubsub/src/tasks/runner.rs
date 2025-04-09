use std::sync::Arc;
use std::sync::Mutex;

use super::task::Task;


pub struct Runner {
    tasks: Vec<Arc<Mutex<dyn Task>>>
}

impl Runner {
    pub fn new() -> Self {
        Self { tasks: vec![] }
    }

    pub fn add_task(&mut self, task: Arc<Mutex<dyn Task>>) {
        self.tasks.push(task);
    }
    

    pub fn run(&self) -> Result<(), anyhow::Error> {
       
       Ok(())
    }
    
}
