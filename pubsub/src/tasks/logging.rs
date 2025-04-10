use std::collections::HashSet;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::Context;
use arrow::csv::writer::Writer as CsvWriter;
use arrow::record_batch::RecordBatch;
use chrono::Local;
use parquet::arrow::arrow_writer::ArrowWriter;
use parquet::file::properties::WriterProperties;

use crate::message::record::Record;
use crate::message::record::flatten_record_batch;
use crate::tasks::state::RunnerState;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum OutputFormat {
    Parquet,
    Csv,
}

pub struct RunnerLogger {
    output_path: PathBuf, // Base directory for all logs
    session_id: String,   // Unique ID for this run (e.g., timestamp)
    trigger_rows: usize,
    history_rows: usize,
    formats: HashSet<OutputFormat>,
}

impl RunnerLogger {
    pub fn new(
        output_path: impl Into<PathBuf>,
        trigger_rows: usize,
        history_rows: usize,
        formats: HashSet<OutputFormat>,
        session_id: Option<String>,
    ) -> Result<Self, anyhow::Error> {
        let output_path = output_path.into();

        // Generate session ID if not provided
        let session_id = session_id.unwrap_or_else(|| {
            Local::now().format("%Y%m%d_%H%M%S").to_string()
        });

        // Basic validation for formats
        if formats.is_empty() {
            log::warn!("RunnerLogger created with no output formats specified.");
        }

        Ok(Self {
            output_path,
            session_id,
            trigger_rows,
            history_rows,
            formats,
        })
    }

    // Helper function to write Parquet
    fn write_parquet(batch: &RecordBatch, path: &Path) -> Result<(), anyhow::Error> {
        let file = File::create(path)
            .with_context(|| format!("Failed to create parquet file: {:?}", path))?;
        let props = WriterProperties::builder().build();
        let mut writer = ArrowWriter::try_new(file, batch.schema(), Some(props))?;
        writer.write(batch)?;
        writer.close()?;
        Ok(())
    }

    // Helper function to write CSV
    fn write_csv(batch: &RecordBatch, path: &Path) -> Result<(), anyhow::Error> {
        let file = File::create(path)
            .with_context(|| format!("Failed to create csv file: {:?}", path))?;
        
        // Standard Arrow CSV writing
        let mut writer = CsvWriter::new(file);
        writer.write(batch)?;
        // Dropping writer flushes
        Ok(())
    }

    pub fn process_state(&self, state: &mut RunnerState) -> Result<(), anyhow::Error> {
        if self.formats.is_empty() {
            return Ok(()); // Nothing to do if no formats are configured
        }

        let topics_to_process: Vec<String> = state
            .get_topics()
            .into_iter()
            .filter(|topic| {
                state
                    .get_topic_row_count(topic)
                    .map_or(false, |count| count >= self.trigger_rows)
            })
            .collect();

        for topic in topics_to_process {
            log::info!(
                "Topic '{}' reached trigger threshold ({}), processing...",
                topic,
                self.trigger_rows
            );

            if let Some(record_ref_to_write) = state.get_topic_record(&topic) {
                let record_to_write = record_ref_to_write.clone();
                let record_batch_to_write = record_to_write.to_record_batch();

                // 1. Construct base directory and topic subdirectory path
                let mut topic_dir = self.output_path.join(&self.session_id);

                let topic_parts: Vec<&str> = topic.split('/').collect();
                let (file_stem, dir_parts) = match topic_parts.split_last() {
                    Some((stem, parts)) => (*stem, parts),
                    None => (topic.as_str(), &[] as &[&str]), // Should not happen if topic is not empty
                };

                for part in dir_parts {
                    topic_dir.push(part);
                }

                fs::create_dir_all(&topic_dir).with_context(|| {
                    format!("Failed to create topic directory structure: {:?}", topic_dir)
                })?;

                let mut files_written: Vec<String> = Vec::new();

                // 2. Write configured formats
                for format in &self.formats {
                    match format {
                        OutputFormat::Parquet => {
                            let file_path = topic_dir.join(format!("{}.parquet", file_stem));
                            log::debug!("Writing Parquet to: {:?}", file_path);
                            match Self::write_parquet(record_batch_to_write, &file_path) {
                                Ok(_) => files_written.push(file_path.display().to_string()),
                                Err(e) => log::error!("Failed to write Parquet for topic '{}' to {:?}: {}", topic, file_path, e),
                            }
                        }
                        OutputFormat::Csv => {
                            let file_path = topic_dir.join(format!("{}.csv", file_stem));
                            log::debug!("Writing CSV to: {:?}", file_path);
                            
                            // Use flatten_record_batch for CSV
                            match flatten_record_batch(record_batch_to_write) {
                                Ok(flattened_batch) => {
                                    match Self::write_csv(&flattened_batch, &file_path) {
                                        Ok(_) => {
                                            files_written.push(file_path.display().to_string());
                                            log::info!("Successfully wrote CSV file");
                                        },
                                        Err(e) => {
                                            log::error!("Failed to write CSV: {}", e);
                                        }
                                    }
                                },
                                Err(e) => {
                                    log::error!("Failed to flatten record batch for CSV: {}", e);
                                }
                            }
                        }
                    }
                }

                // Only proceed with state trimming if at least one format was written successfully
                if !files_written.is_empty() {
                     // 3. Trim history and update state
                    if self.history_rows > 0 && record_batch_to_write.num_rows() > self.history_rows {
                        log::debug!(
                            "Trimming history for topic '{}' to {} rows",
                            topic,
                            self.history_rows
                        );
                        let history_record = record_to_write.get_n_latest_rows(self.history_rows)?;
                        state.replace_topic_record(topic.clone(), history_record);
                    } else if self.history_rows == 0 {
                        log::debug!("Removing topic '{}' from state as history_rows is 0", topic);
                        state.remove_topic(&topic);
                    }

                    log::info!(
                        "Successfully wrote {} rows for topic '{}' to: {}",
                        record_batch_to_write.num_rows(),
                        topic,
                        files_written.join(", ")
                    );
                } else {
                    log::warn!("No files were successfully written for topic '{}', state not trimmed.", topic);
                }

            } else {
                log::warn!(
                    "Could not retrieve record reference for topic '{}' during processing, skipping.",
                    topic
                );
            }
        }
        Ok(())
    }

    pub fn dump_remaining_state(&self, state: &mut RunnerState) -> Result<(), anyhow::Error> {
        let topics_to_process: Vec<String> = state
            .get_topics()
            .into_iter()
            .collect();
            
        if self.formats.is_empty() {
            return Ok(()); // Nothing to do if no formats are configured
        }

        log::info!("Dumping remaining state for {} topics", topics_to_process.len());
        
        for topic in topics_to_process {
            if let Some(record_ref_to_write) = state.get_topic_record(&topic) {
                let record_to_write = record_ref_to_write.clone();
                let record_batch_to_write = record_to_write.to_record_batch();
                
                if record_batch_to_write.num_rows() == 0 {
                    log::debug!("Skipping empty topic '{}'", topic);
                    continue;
                }

                // Construct base directory and topic subdirectory path
                let mut topic_dir = self.output_path.join(&self.session_id);

                let topic_parts: Vec<&str> = topic.split('/').collect();
                let (file_stem, dir_parts) = match topic_parts.split_last() {
                    Some((stem, parts)) => (*stem, parts),
                    None => (topic.as_str(), &[] as &[&str]),
                };

                for part in dir_parts {
                    topic_dir.push(part);
                }

                fs::create_dir_all(&topic_dir).with_context(|| {
                    format!("Failed to create topic directory structure: {:?}", topic_dir)
                })?;

                let mut files_written: Vec<String> = Vec::new();

                // Write configured formats
                for format in &self.formats {
                    match format {
                        OutputFormat::Parquet => {
                            let file_path = topic_dir.join(format!("{}_final.parquet", file_stem));
                            log::debug!("Writing final Parquet to: {:?}", file_path);
                            match Self::write_parquet(record_batch_to_write, &file_path) {
                                Ok(_) => files_written.push(file_path.display().to_string()),
                                Err(e) => log::error!("Failed to write final Parquet for topic '{}' to {:?}: {}", topic, file_path, e),
                            }
                        }
                        OutputFormat::Csv => {
                            let file_path = topic_dir.join(format!("{}_final.csv", file_stem));
                            log::debug!("Writing final CSV to: {:?}", file_path);
                            
                            // Use flatten_record_batch for CSV
                            match flatten_record_batch(record_batch_to_write) {
                                Ok(flattened_batch) => {
                                    match Self::write_csv(&flattened_batch, &file_path) {
                                        Ok(_) => {
                                            files_written.push(file_path.display().to_string());
                                            log::info!("Successfully wrote final CSV file");
                                        },
                                        Err(e) => {
                                            log::error!("Failed to write final CSV: {}", e);
                                        }
                                    }
                                },
                                Err(e) => {
                                    log::error!("Failed to flatten record batch for final CSV: {}", e);
                                }
                            }
                        }
                    }
                }

                if !files_written.is_empty() {
                    log::info!(
                        "Successfully wrote final {} rows for topic '{}' to: {}",
                        record_batch_to_write.num_rows(),
                        topic,
                        files_written.join(", ")
                    );
                }
            } else {
                log::warn!(
                    "Could not retrieve record reference for topic '{}' during final dump, skipping.",
                    topic
                );
            }
        }
        
        log::info!("Completed dumping all remaining state");
        Ok(())
    }
}

// Basic tests can be added here later if needed
// #[cfg(test)]
// mod tests {
//     use super::*;
//     // ... test setup ...
// }