use std::collections::HashMap;
use std::fs::File;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use arrow::array::RecordBatch;
use arrow::datatypes::Schema;
use arrow::record_batch::RecordBatchReader;
use parquet::arrow::arrow_reader::ParquetRecordBatchReader;
use parquet::arrow::arrow_reader::ParquetRecordBatchReaderBuilder;
use parquet::arrow::arrow_writer::ArrowWriter;
use parquet::file::properties::WriterProperties;
use parquet::file::reader::{FileReader, SerializedFileReader};

/// Reads a single parquet file and returns an iterator of record batches
pub fn read_parquet_file(path: &Path) -> Result<ParquetRecordBatchReader> {
    let file = File::open(path)
        .with_context(|| format!("Failed to open parquet file: {}", path.display()))?;

    let builder = ParquetRecordBatchReaderBuilder::try_new(file)?;

    Ok(builder.build()?)
}

/// Collects all record batches from a parquet file into a vector
pub fn collect_record_batches(path: &Path) -> Result<Vec<RecordBatch>> {
    let reader = read_parquet_file(path)?;
    let batches: Result<Vec<_>, _> = reader.collect();
    Ok(batches?)
}

/// Finds all parquet files in a directory, optionally recursively and filtered by pattern
pub fn find_parquet_files(
    dir: &Path,
    recursive: bool,
    filter: Option<&str>,
) -> Result<Vec<PathBuf>> {
    let mut result = Vec::new();

    let walker = if recursive {
        walkdir::WalkDir::new(dir)
    } else {
        walkdir::WalkDir::new(dir).max_depth(1)
    };

    for entry in walker.into_iter().filter_map(Result::ok) {
        let path = entry.path();

        if path.is_file() && path.extension().map_or(false, |ext| ext == "parquet") {
            let file_name = path.file_stem().unwrap().to_string_lossy();

            // Apply filter if provided
            if let Some(filter_str) = filter {
                if !file_name.contains(filter_str) {
                    continue;
                }
            }

            result.push(path.to_path_buf());
        }
    }

    Ok(result)
}

/// Merges multiple parquet files into a single output file
pub fn merge_parquet_files_to_output(
    input_files: &[PathBuf],
    output_path: &Path,
    force_merge: bool,
) -> Result<()> {
    if input_files.is_empty() {
        return Err(anyhow::anyhow!("No input files found to merge"));
    }

    // Read the schema from the first file to ensure all files are compatible
    let first_file = &input_files[0];
    let first_reader = read_parquet_file(first_file)?;
    let schema = first_reader.schema();

    // Check schema compatibility if not force merging
    if !force_merge && input_files.len() > 1 {
        for file_path in input_files.iter().skip(1) {
            let reader = read_parquet_file(file_path)?;
            let file_schema = reader.schema();

            // Compare schemas for compatibility
            if !schemas_compatible(&schema, &file_schema) {
                return Err(anyhow::anyhow!(
                    "Incompatible schemas between files. First file has schema: \n{:?}\n\nFile {} has schema: \n{:?}\n\nUse --force flag to ignore schema differences (may cause data corruption or errors).",
                    schema,
                    file_path.display(),
                    file_schema
                ));
            }
        }
    }

    // Open output file
    let output_file = File::create(output_path)
        .with_context(|| format!("Failed to create output file: {}", output_path.display()))?;

    // Create Arrow writer with the schema
    let props = WriterProperties::builder().build();
    let mut writer = ArrowWriter::try_new(output_file, schema.clone(), Some(props))?;

    // Read and write all batches from all files
    for file_path in input_files {
        match read_parquet_file(file_path) {
            Ok(reader) => {
                for batch_result in reader {
                    match batch_result {
                        Ok(batch) => {
                            if let Err(e) = writer.write(&batch) {
                                eprintln!(
                                    "Warning: Failed to write batch from {}: {}",
                                    file_path.display(),
                                    e
                                );
                                if !force_merge {
                                    return Err(anyhow::anyhow!("Failed to write batch: {}", e));
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!(
                                "Warning: Failed to read batch from {}: {}",
                                file_path.display(),
                                e
                            );
                            if !force_merge {
                                return Err(anyhow::anyhow!("Failed to read batch: {}", e));
                            }
                        }
                    }
                }
            }
            Err(e) if force_merge => {
                eprintln!(
                    "Warning: Skipping file {} due to error: {}",
                    file_path.display(),
                    e
                );
            }
            Err(e) => return Err(e),
        }
    }

    // Finish writing and close the file
    writer.close()?;

    Ok(())
}

/// Helper function to check if two schemas are compatible for merging
fn schemas_compatible(
    schema1: &arrow::datatypes::Schema,
    schema2: &arrow::datatypes::Schema,
) -> bool {
    // For now, a simple check - just compare field names
    // A more sophisticated implementation would check field types and nested structures
    let fields1 = schema1.fields();
    let fields2 = schema2.fields();

    if fields1.len() != fields2.len() {
        return false;
    }

    // Check that field names match
    for (f1, f2) in fields1.iter().zip(fields2.iter()) {
        if f1.name() != f2.name() {
            return false;
        }

        // For more strict validation, also check data types
        // Disabling for now as it may be too restrictive
        // if f1.data_type() != f2.data_type() {
        //     return false;
        // }
    }

    true
}

/// Gets metadata from a parquet file
pub fn get_parquet_metadata(path: &Path) -> Result<String> {
    let file = File::open(path)
        .with_context(|| format!("Failed to open parquet file: {}", path.display()))?;

    let reader = SerializedFileReader::new(file)?;
    let metadata = reader.metadata();

    let file_metadata = metadata.file_metadata();
    let schema = file_metadata.schema_descr();

    let mut output = String::new();
    output.push_str(&format!("File: {}\n", path.display()));
    output.push_str(&format!("Version: {}\n", file_metadata.version()));
    output.push_str(&format!("Num rows: {}\n", file_metadata.num_rows()));
    output.push_str(&format!(
        "Created by: {}\n",
        file_metadata.created_by().unwrap_or("Unknown")
    ));
    output.push_str(&format!("Num row groups: {}\n", metadata.num_row_groups()));
    output.push_str("Schema:\n");

    for i in 0..schema.num_columns() {
        let col = schema.column(i);
        output.push_str(&format!(
            "  {}: {} ({})\n",
            i,
            col.name(),
            col.physical_type()
        ));
    }

    Ok(output)
}

/// Extracts the schema from a parquet file
pub fn get_schema(path: &Path) -> Result<Schema> {
    let reader = read_parquet_file(path)?;
    Ok(Schema::from(reader.schema().as_ref().clone()))
}

/// Merges parquet files by first grouping them by schema compatibility
pub fn merge_parquet_files_by_schema_groups(
    input_files: &[PathBuf],
    output_dir: &Path,
    base_filename: &str,
) -> Result<Vec<PathBuf>> {
    if input_files.is_empty() {
        return Err(anyhow::anyhow!("No input files found to merge"));
    }

    // Create schema groups - maps schema hash to list of files
    let mut schema_groups: HashMap<String, Vec<PathBuf>> = HashMap::new();

    // Sort files into schema groups
    for file_path in input_files {
        // Skip files we can't read
        let reader = match read_parquet_file(file_path) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("Warning: Unable to read {}: {}", file_path.display(), e);
                continue;
            }
        };

        // Get a schema representation for grouping
        let schema = reader.schema();
        let _schema_key = get_schema_key(&schema);

        schema_groups
            .entry(_schema_key)
            .or_default()
            .push(file_path.clone());
    }

    // Make sure output directory exists
    std::fs::create_dir_all(output_dir).with_context(|| {
        format!(
            "Failed to create output directory: {}",
            output_dir.display()
        )
    })?;

    // Now merge each group separately
    let mut output_files = Vec::new();
    let group_count = schema_groups.len();

    for (i, (_schema_key, files)) in schema_groups.into_iter().enumerate() {
        let output_filename = if group_count > 1 {
            format!("{}_{}.parquet", base_filename, i + 1)
        } else {
            format!("{}.parquet", base_filename)
        };

        let output_path = output_dir.join(output_filename);

        println!("Merging schema group {} with {} files", i + 1, files.len());

        // Merge this group
        match merge_parquet_files_to_output(&files, &output_path, false) {
            Ok(_) => {
                println!("Successfully created {}", output_path.display());
                output_files.push(output_path);
            }
            Err(e) => {
                eprintln!("Error merging schema group {}: {}", i + 1, e);
                // If there's only one file in this group, just copy it
                if files.len() == 1 {
                    println!("Copying single file {} to output", files[0].display());
                    match std::fs::copy(&files[0], &output_path) {
                        Ok(_) => {
                            println!("Successfully copied to {}", output_path.display());
                            output_files.push(output_path);
                        }
                        Err(e) => {
                            eprintln!("Error copying file: {}", e);
                        }
                    }
                }
            }
        }
    }

    Ok(output_files)
}

/// Helper function to get a unique key for a schema for grouping purposes
fn get_schema_key(schema: &arrow::datatypes::Schema) -> String {
    let mut key = String::new();

    // Add field information to key
    for field in schema.fields() {
        key.push_str(&format!("{}:{}|", field.name(), field.data_type()));
    }

    key
}
