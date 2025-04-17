use serde::{Deserialize, Serialize};
use std::hash::{Hash, Hasher};
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskInfo {
    pub name: String,
    pub id: u32,
    pub insta_spawn: bool,
}

impl TaskInfo {
    pub fn new(name: impl Into<String>) -> Self {
        // id is a hash of the name
        let name = name.into();
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        name.hash(&mut hasher);
        let id = hasher.finish();
        Self {
            name,
            id: id as u32,
            insta_spawn: false,
        }
    }
    pub fn with_insta_spawn(mut self) -> Self {
        self.insta_spawn = true;
        self
    }
}

// Hash based off the id
impl std::hash::Hash for TaskInfo {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

// eq based off the id
impl std::cmp::PartialEq for TaskInfo {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

// eq based off the id
impl std::cmp::Eq for TaskInfo {}

impl std::fmt::Display for TaskInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.name)
    }
}
