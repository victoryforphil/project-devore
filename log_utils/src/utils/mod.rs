use std::collections::HashMap;
use std::sync::Arc;
use anyhow::Result;
use arrow::array::{ArrayRef, AsArray, RecordBatch};
use arrow::datatypes::{DataType, Schema};
use colored::{ColoredString, Colorize};

/// Returns a formatted string representation of a value in an array
pub fn format_array_value(array: &ArrayRef, row_index: usize) -> String {
    if array.is_null(row_index) {
        return "null".to_string();
    }

    match array.data_type() {
        DataType::Null => "null".to_string(),
        DataType::Boolean => {
            let arr = array.as_boolean();
            arr.value(row_index).to_string()
        }
        DataType::Int8 => {
            let arr = array.as_primitive::<arrow::datatypes::Int8Type>();
            arr.value(row_index).to_string()
        }
        DataType::Int16 => {
            let arr = array.as_primitive::<arrow::datatypes::Int16Type>();
            arr.value(row_index).to_string()
        }
        DataType::Int32 => {
            let arr = array.as_primitive::<arrow::datatypes::Int32Type>();
            arr.value(row_index).to_string()
        }
        DataType::Int64 => {
            let arr = array.as_primitive::<arrow::datatypes::Int64Type>();
            arr.value(row_index).to_string()
        }
        DataType::UInt8 => {
            let arr = array.as_primitive::<arrow::datatypes::UInt8Type>();
            arr.value(row_index).to_string()
        }
        DataType::UInt16 => {
            let arr = array.as_primitive::<arrow::datatypes::UInt16Type>();
            arr.value(row_index).to_string()
        }
        DataType::UInt32 => {
            let arr = array.as_primitive::<arrow::datatypes::UInt32Type>();
            arr.value(row_index).to_string()
        }
        DataType::UInt64 => {
            let arr = array.as_primitive::<arrow::datatypes::UInt64Type>();
            arr.value(row_index).to_string()
        }
        DataType::Float32 => {
            let arr = array.as_primitive::<arrow::datatypes::Float32Type>();
            format!("{:.6}", arr.value(row_index))
        }
        DataType::Float64 => {
            let arr = array.as_primitive::<arrow::datatypes::Float64Type>();
            format!("{:.6}", arr.value(row_index))
        }
        DataType::Utf8 => {
            // We already checked that the value isn't null with array.is_null(row_index)
            let str_array = array.as_string::<i32>();
            format!("\"{}\"", str_array.iter().nth(row_index).unwrap().unwrap())
        }
        DataType::LargeUtf8 => {
            // We already checked that the value isn't null with array.is_null(row_index)
            let str_array = array.as_string::<i64>();
            format!("\"{}\"", str_array.iter().nth(row_index).unwrap().unwrap())
        }
        DataType::Binary => {
            "<binary>".to_string()
        }
        DataType::Date32 => {
            let arr = array.as_primitive::<arrow::datatypes::Date32Type>();
            arr.value(row_index).to_string()
        }
        DataType::Date64 => {
            let arr = array.as_primitive::<arrow::datatypes::Date64Type>();
            // Convert milliseconds to a date string
            let millis = arr.value(row_index);
            let datetime = chrono::DateTime::from_timestamp_millis(millis);
            match datetime {
                Some(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
                None => format!("Invalid date: {}", millis),
            }
        }
        DataType::Struct(fields) => {
            // Handle structs by recursively formatting each field
            use arrow::array::StructArray;
            let struct_array = array.as_struct();
            
            // Get the field names
            let mut result = String::new();
            
            // Handle each field in the struct
            for (i, field) in fields.iter().enumerate() {
                if i > 0 {
                    result.push_str(", ");
                }
                
                // Get the field array and format it
                let field_array = struct_array.column(i);
                let field_value = format_array_value(field_array, row_index);
                
                result.push_str(&format!("{}: {}", field.name(), field_value));
            }
            
            format!("{{{}}}", result)
        }
        DataType::Timestamp(time_unit, _) => {
            match time_unit {
                arrow::datatypes::TimeUnit::Second => {
                    let arr = array.as_primitive::<arrow::datatypes::TimestampSecondType>();
                    let seconds = arr.value(row_index);
                    let datetime = chrono::DateTime::from_timestamp(seconds, 0);
                    match datetime {
                        Some(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
                        None => format!("Invalid timestamp: {}", seconds),
                    }
                }
                arrow::datatypes::TimeUnit::Millisecond => {
                    let arr = array.as_primitive::<arrow::datatypes::TimestampMillisecondType>();
                    let millis = arr.value(row_index);
                    let datetime = chrono::DateTime::from_timestamp_millis(millis);
                    match datetime {
                        Some(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
                        None => format!("Invalid timestamp: {}", millis),
                    }
                }
                arrow::datatypes::TimeUnit::Microsecond => {
                    let arr = array.as_primitive::<arrow::datatypes::TimestampMicrosecondType>();
                    let micros = arr.value(row_index);
                    let secs = micros / 1_000_000;
                    let nsecs = ((micros % 1_000_000) * 1000) as u32;
                    let datetime = chrono::DateTime::from_timestamp(secs, nsecs);
                    match datetime {
                        Some(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
                        None => format!("Invalid timestamp: {}", micros),
                    }
                }
                arrow::datatypes::TimeUnit::Nanosecond => {
                    let arr = array.as_primitive::<arrow::datatypes::TimestampNanosecondType>();
                    let nanos = arr.value(row_index);
                    let secs = nanos / 1_000_000_000;
                    let nsecs = (nanos % 1_000_000_000) as u32;
                    let datetime = chrono::DateTime::from_timestamp(secs, nsecs);
                    match datetime {
                        Some(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
                        None => format!("Invalid timestamp: {}", nanos),
                    }
                }
            }
        }
        _ => format!("<unsupported type: {:?}>", array.data_type()),
    }
}

/// Returns a colored representation of a value based on its type
pub fn colorize_value(value: &str, data_type: &DataType) -> ColoredString {
    match data_type {
        DataType::Null => value.bright_black(),
        DataType::Boolean => {
            if value == "true" {
                value.green()
            } else {
                value.red()
            }
        }
        DataType::Int8 | DataType::Int16 | DataType::Int32 | DataType::Int64 
        | DataType::UInt8 | DataType::UInt16 | DataType::UInt32 | DataType::UInt64 => {
            value.yellow()
        }
        DataType::Float32 | DataType::Float64 => value.yellow(),
        DataType::Utf8 | DataType::LargeUtf8 => value.bright_green(),
        DataType::Binary => value.purple(),
        DataType::Date32 | DataType::Date64 => value.cyan(),
        DataType::Timestamp(_, _) => value.cyan(),
        _ => value.normal(),
    }
}

/// Returns the column name and value for a record batch at the given row
pub fn get_row_values(
    batch: &RecordBatch, 
    row_index: usize,
    columns: Option<&[String]>
) -> Result<Vec<(String, String, DataType)>> {
    let schema = batch.schema();
    let mut result = Vec::new();

    for (col_idx, field) in schema.fields().iter().enumerate() {
        // Skip if columns are specified and this one isn't in the list
        if let Some(columns) = columns {
            if !columns.contains(&field.name().to_string()) {
                continue;
            }
        }

        let column = batch.column(col_idx);
        let value = format_array_value(column, row_index);
        result.push((field.name().to_string(), value, field.data_type().clone()));
    }

    Ok(result)
}

/// Extracts metadata values from a schema
pub fn extract_metadata(schema: &Arc<Schema>) -> HashMap<String, String> {
    schema.metadata().clone()
}

/// Pretty prints a record batch row with color formatting
pub fn pretty_print_row(
    batch: &RecordBatch, 
    row_index: usize, 
    use_color: bool,
    columns: Option<&[String]>
) -> Result<String> {
    let values = get_row_values(batch, row_index, columns)?;
    let mut result = String::new();

    result.push_str(&format!("Row {}:\n", row_index));
    
    let max_key_len = values.iter().map(|(name, _, _)| name.len()).max().unwrap_or(0);

    for (name, value, data_type) in values {
        let formatted_name = format!("{:width$}", name, width = max_key_len + 2);
        
        if use_color {
            let colored_name = formatted_name.bright_blue();
            let colored_value = colorize_value(&value, &data_type);
            result.push_str(&format!("  {}: {}\n", colored_name, colored_value));
        } else {
            result.push_str(&format!("  {}: {}\n", formatted_name, value));
        }
    }

    Ok(result)
}

/// Pretty prints a record batch with metadata
pub fn pretty_print_batch(
    batch: &RecordBatch, 
    use_color: bool,
    columns: Option<&[String]>,
    limit: Option<usize>
) -> Result<String> {
    let schema = batch.schema();
    let metadata = extract_metadata(&schema);
    let mut result = String::new();
    
    // Print metadata if it exists
    if !metadata.is_empty() {
        result.push_str("Metadata:\n");
        
        for (key, value) in metadata {
            if use_color {
                result.push_str(&format!("  {}: {}\n", key.bright_yellow(), value));
            } else {
                result.push_str(&format!("  {}: {}\n", key, value));
            }
        }
        result.push('\n');
    }

    // Print batch info
    let row_count = batch.num_rows();
    let row_info = if use_color {
        format!("Record Batch: {} rows", row_count.to_string().bright_white())
    } else {
        format!("Record Batch: {} rows", row_count)
    };
    result.push_str(&row_info);
    result.push('\n');
    
    // Print rows (with limit if specified)
    let limit = limit.unwrap_or(row_count);
    let rows_to_print = limit.min(row_count);
    
    for i in 0..rows_to_print {
        let row_text = pretty_print_row(batch, i, use_color, columns)?;
        result.push_str(&row_text);
        result.push('\n');
    }
    
    // Note if we truncated output
    if rows_to_print < row_count {
        if use_color {
            result.push_str(&format!("... {} more rows\n", (row_count - rows_to_print).to_string().yellow()));
        } else {
            result.push_str(&format!("... {} more rows\n", row_count - rows_to_print));
        }
    }
    
    Ok(result)
}

/// Gets the topic from record batch metadata
pub fn get_topic(batch: &RecordBatch) -> Option<String> {
    batch.schema().metadata().get("topic").cloned()
}

/// Gets the flag from record batch metadata
pub fn get_flag(batch: &RecordBatch) -> Option<String> {
    batch.schema().metadata().get("flag").cloned()
}

/// Formats a topic string for display
pub fn format_topic(topic: &str, use_color: bool) -> String {
    if use_color {
        format!("[{}]", topic.bright_magenta())
    } else {
        format!("[{}]", topic)
    }
} 