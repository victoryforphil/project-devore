use anyhow::{Context, Result};
use log::info;
use pubsub::tasks::info::TaskInfo;
use pubsub::tasks::task::Task;
use serde_json::Value;
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;
use std::time::{Duration, Instant};

/// A task that reads a JSON file containing an array of [time, topic, message] entries
/// and publishes each message to the specified topic at the specified time.
pub struct RunScriptTask {
    file_path: PathBuf,
    start_time: Instant,
    entries: Vec<(f64, String, String)>,
    current_index: usize,
    info: TaskInfo,
}

/// Returns an example JSON string that demonstrates the expected format for script files.
pub fn get_example_script_json() -> String {
    r#"[
  [0.0, "auto/command", "{"height": 5.0}"],
  [5.0, "auto/position", "{x: 1.0, y: 0.0, z: 2.0}"],
  [10.0, "auto/position", "{x: 0.0, y: 1.0, z: 2.5}"],
  [15.0, "auto/command", "{land: true}"]
]"#
    .to_string()
}

impl RunScriptTask {
    /// Creates a new RunScriptTask with the specified JSON file path.
    pub fn new(file_path: PathBuf) -> Result<Self> {
        let mut file = File::open(&file_path)
            .with_context(|| format!("Failed to open script file: {:?}", file_path))?;

        let mut contents = String::new();
        file.read_to_string(&mut contents)
            .with_context(|| format!("Failed to read script file: {:?}", file_path))?;

        let json_array: Vec<Value> =
            serde_json::from_str(&contents).with_context(|| "Failed to parse JSON array")?;

        let mut entries = Vec::new();
        for entry in json_array {
            if let Value::Array(arr) = entry {
                if arr.len() >= 3 {
                    let time = arr[0].as_f64().context("Time must be a number")?;
                    let topic = arr[1]
                        .as_str()
                        .context("Topic must be a string")?
                        .to_string();
                    let message = arr[2]
                        .as_str()
                        .context("Message must be a string")?
                        .to_string();
                    entries.push((time, topic, message));
                } else {
                    return Err(anyhow::anyhow!(
                        "Each entry must have at least 3 elements: [time, topic, message]"
                    ));
                }
            } else {
                return Err(anyhow::anyhow!("Each entry must be an array"));
            }
        }

        // Sort entries by time
        entries.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));

        Ok(Self {
            file_path,
            start_time: Instant::now(),
            entries,
            current_index: 0,
            info: TaskInfo::new("RunScriptTask"),
        })
    }
}

impl Task for RunScriptTask {
    fn init(
        &mut self,
        tx: pubsub::tasks::task::TaskChannel,
        meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> std::result::Result<(), anyhow::Error> {
        info!("RunScriptTask initialized");
        Ok(())
    }

    fn run(
        &mut self,
        inputs: Vec<pubsub::message::record::Record>,
        tx: pubsub::tasks::task::TaskChannel,
        meta_tx: pubsub::tasks::task::MetaTaskChannel,
    ) -> std::result::Result<(), anyhow::Error> {
        let elapsed = self.start_time.elapsed().as_secs_f64();
        let mut did_work = false;

        while self.current_index < self.entries.len() {
            let (time, topic, message) = &self.entries[self.current_index];

            // If it's time to publish this entry
            if *time <= elapsed {
                info!(
                    "Publishing script entry at time {}: {} -> {}",
                    time, topic, message
                );

                let pub_packet = pubsub::publish_json!(topic, &message);
                tx.send(pub_packet)?;

                // Move to the next entry
                self.current_index += 1;
                did_work = true;
            } else {
                // Not time for this entry yet, break out of the loop
                break;
            }
        }

        // If we've processed all entries, we're done
        if self.current_index >= self.entries.len() {
            info!("Script execution complete");
        }

        Ok(())
    }

    fn should_run(&self) -> Result<bool, anyhow::Error> {
        // Run as long as we have entries to process
        Ok(self.current_index < self.entries.len())
    }

    fn cleanup(&mut self) -> Result<(), anyhow::Error> {
        info!("RunScriptTask cleanup");
        Ok(())
    }

    fn get_task_info(&self) -> &pubsub::tasks::info::TaskInfo {
        &self.info
    }
}
