use arrow::array::{ArrayRef, RecordBatch, StructArray};
use arrow::datatypes::{DataType, Field, Fields, Schema, SchemaRef};
use arrow::json::reader::infer_json_schema_from_iterator;
use arrow::json::reader::{Decoder, ReaderBuilder};
use prettytable::{format, Cell, Row, Table};
use serde::de::DeserializeOwned;
use serde_json::to_value;
use std::collections::{HashMap, HashSet};
use std::str::FromStr;
use std::sync::Arc;

/// Path separator for flattened field names
const PATH_SEPARATOR: &str = ".";

/// Flattens a struct column into a list of fields and arrays.
///
/// This function recursively processes a struct column, expanding nested structs
/// into a flat list of columns with their paths joined by the path separator.
fn flatten_struct_column(
    prefix: &str,
    struct_array: &StructArray,
) -> Result<Vec<(Field, ArrayRef)>, anyhow::Error> {
    let mut flattened_columns = Vec::new();
    for (i, field) in struct_array.fields().iter().enumerate() {
        let col_name = if prefix.is_empty() {
            field.name().clone()
        } else {
            format!("{}{}{}", prefix, PATH_SEPARATOR, field.name())
        };
        let column = struct_array.column(i);

        match field.data_type() {
            DataType::Struct(_) => {
                let sub_struct_array = column
                    .as_any()
                    .downcast_ref::<StructArray>()
                    .ok_or_else(|| anyhow::anyhow!("Failed to downcast to StructArray"))?;
                let sub_flattened = flatten_struct_column(&col_name, sub_struct_array)?;
                flattened_columns.extend(sub_flattened);
            }
            _ => {
                let new_field = Field::new(&col_name, field.data_type().clone(), field.is_nullable());
                flattened_columns.push((new_field, column.clone()));
            }
        }
    }
    Ok(flattened_columns)
}

/// Flattens a RecordBatch, expanding struct columns into separate columns.
///
/// This process is similar to how Serde's `#[serde(flatten)]` attribute works,
/// bringing nested fields up to the top level with their paths joined.
pub fn flatten_record_batch(batch: &RecordBatch) -> Result<RecordBatch, anyhow::Error> {
    let mut flattened_fields = Vec::new();
    let mut flattened_columns = Vec::new();

    for (i, field) in batch.schema().fields().iter().enumerate() {
        let column = batch.column(i);
        match field.data_type() {
            DataType::Struct(_) => {
                let struct_array = column
                    .as_any()
                    .downcast_ref::<StructArray>()
                    .ok_or_else(|| anyhow::anyhow!("Failed to downcast to StructArray"))?;
                let struct_flattened = flatten_struct_column(field.name(), struct_array)?;
                for (f, c) in struct_flattened {
                    flattened_fields.push(Arc::new(f));
                    flattened_columns.push(c);
                }
            }
            _ => {
                flattened_fields.push(field.clone());
                flattened_columns.push(column.clone());
            }
        }
    }

    let flattened_schema = Arc::new(Schema::new_with_metadata(
        flattened_fields,
        batch.schema().metadata().clone(),
    ));
    RecordBatch::try_new(flattened_schema, flattened_columns)
        .map_err(|e| anyhow::anyhow!("Failed to create flattened RecordBatch: {}", e))
}

/// Unflattens a previously flattened RecordBatch, reconstructing the original structure.
///
/// This is the inverse operation of `flatten_record_batch`. It takes a flattened RecordBatch
/// and reconstructs the nested structure based on the field path separators.
pub fn unflatten_record_batch(batch: &RecordBatch) -> Result<RecordBatch, anyhow::Error> {
    // If there are no fields with path separators, the batch is already unflattened
    if !batch.schema().fields().iter().any(|f| f.name().contains(PATH_SEPARATOR)) {
        return Ok(batch.clone());
    }

    let flattened_fields = batch.schema().fields().to_vec();
    let flattened_data = batch.columns().to_vec();
    let num_rows = batch.num_rows();

    // Group fields by their root (prefix before the first dot)
    let mut field_groups: HashMap<String, Vec<(String, Arc<Field>, ArrayRef)>> = HashMap::new();
    let mut top_level_fields = Vec::new();
    let mut top_level_data = Vec::new();

    // First, categorize each field
    for (i, field) in flattened_fields.iter().enumerate() {
        let field_name = field.name();
        
        if field_name.contains(PATH_SEPARATOR) {
            // This is a nested field that needs to be grouped
            let parts: Vec<&str> = field_name.split(PATH_SEPARATOR).collect();
            let root = parts[0].to_string();
            
            // Get the field name without the root prefix
            let local_name = if parts.len() > 1 {
                parts[1..].join(PATH_SEPARATOR)
            } else {
                parts[0].to_string()
            };
            
            field_groups
                .entry(root)
                .or_insert_with(Vec::new)
                .push((local_name, field.clone(), flattened_data[i].clone()));
        } else {
            // This is a top-level field that stays as is
            top_level_fields.push(field.clone());
            top_level_data.push(flattened_data[i].clone());
        }
    }

    // Helper function to recursively build struct arrays for nested fields
    fn build_nested_struct(
        fields: &[(String, Arc<Field>, ArrayRef)],
        num_rows: usize
    ) -> Result<(Vec<Arc<Field>>, Vec<ArrayRef>), anyhow::Error> {
        // Group fields by their root (first part before a separator)
        let mut field_groups: HashMap<String, Vec<(String, Arc<Field>, ArrayRef)>> = HashMap::new();
        let mut direct_fields = Vec::new();
        let mut direct_arrays = Vec::new();
        
        for (name, field, array) in fields {
            if name.contains(PATH_SEPARATOR) {
                // This field needs further nesting
                let parts: Vec<&str> = name.split(PATH_SEPARATOR).collect();
                let root = parts[0].to_string();
                
                // Get the field name without the root prefix
                let local_name = if parts.len() > 1 {
                    parts[1..].join(PATH_SEPARATOR)
                } else {
                    parts[0].to_string()
                };
                
                field_groups
                    .entry(root)
                    .or_insert_with(Vec::new)
                    .push((local_name, field.clone(), array.clone()));
            } else {
                // This is a direct field at this level
                let field_without_prefix = Field::new(
                    name,
                    field.data_type().clone(),
                    field.is_nullable(),
                );
                direct_fields.push(Arc::new(field_without_prefix));
                direct_arrays.push(array.clone());
            }
        }
        
        // Process nested struct fields recursively
        for (struct_name, struct_fields) in field_groups {
            let (nested_fields, nested_arrays) = build_nested_struct(&struct_fields, num_rows)?;
            
            // Create a nested struct field
            let nested_field_type = DataType::Struct(Fields::from(nested_fields.clone()));
            let nested_field = Field::new(
                &struct_name,
                nested_field_type.clone(),
                true, // Usually struct fields can be nullable
            );
            
            // Create the struct array
            let struct_array = StructArray::try_new(
                Fields::from(nested_fields),
                nested_arrays,
                None, // No validity bitmap for the struct itself
            )?;
            
            direct_fields.push(Arc::new(nested_field));
            direct_arrays.push(Arc::new(struct_array) as ArrayRef);
        }
        
        Ok((direct_fields, direct_arrays))
    }

    // Process each top-level struct
    let mut unflattened_fields = top_level_fields;
    let mut unflattened_data = top_level_data;

    for (struct_name, fields) in field_groups {
        let (struct_fields, struct_arrays) = build_nested_struct(&fields, num_rows)?;
        
        // Create the struct field at top level
        let field_type = DataType::Struct(Fields::from(struct_fields.clone()));
        let struct_field = Field::new(
            &struct_name,
            field_type,
            true, // Usually struct fields can be nullable
        );
        
        // Create the struct array
        let struct_array = StructArray::try_new(
            Fields::from(struct_fields),
            struct_arrays,
            None, // No validity bitmap for the struct itself
        )?;
        
        unflattened_fields.push(Arc::new(struct_field));
        unflattened_data.push(Arc::new(struct_array) as ArrayRef);
    }

    // Log some debug info
    eprintln!(
        "Unflattened schema has {} fields: {:?}",
        unflattened_fields.len(),
        unflattened_fields.iter().map(|f| f.name()).collect::<Vec<_>>()
    );

    // Create a new schema with unflattened fields
    let unflattened_schema = Arc::new(Schema::new_with_metadata(
        unflattened_fields,
        batch.schema().metadata().clone(),
    ));

    // Create a new record batch with unflattened data
    RecordBatch::try_new(unflattened_schema, unflattened_data)
        .map_err(|e| anyhow::anyhow!("Failed to create unflattened RecordBatch: {}", e))
}

#[derive(Clone, PartialEq)]
pub struct Record {
    record_batch: RecordBatch,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RecordFlag {
    PublishPacket,
    SubscribePacket,
}

impl std::fmt::Display for RecordFlag {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl FromStr for RecordFlag {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "PublishPacket" => RecordFlag::PublishPacket,
            "SubscribePacket" => RecordFlag::SubscribePacket,
            _ => return Err(anyhow::anyhow!("Invalid record flag: {}", s)),
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RecordError {
    #[error("Topic metadata not set")]
    TopicMetadataNotSet,

    #[error(transparent)]
    Other(#[from] anyhow::Error),

    #[error("Flag metadata not set")]
    FlagMetadataNotSet,
}

impl Record {
    pub fn from_serde<T: serde::Serialize>(value: &T) -> Result<Self, anyhow::Error> {
        // Convert the value to a serde_json::Value
        let json_value = to_value(value)?;

        // If this is an array with a single item, unwrap it to avoid serialization issues
        let single_item = match &json_value {
            serde_json::Value::Array(items) if items.len() == 1 => items[0].clone(),
            _ => json_value.clone(),
        };

        // Infer schema from the JSON value
        let inferred_schema =
            infer_json_schema_from_iterator(std::iter::once(Ok(single_item.clone())))?;

        // Create a decoder with the inferred schema
        let mut decoder = ReaderBuilder::new(Arc::new(inferred_schema)).build_decoder()?;

        // Serialize the value into the decoder
        if let serde_json::Value::Array(items) = &json_value {
            for item in items {
                decoder.serialize(std::slice::from_ref(item))?;
            }
        } else {
            decoder.serialize(std::slice::from_ref(&json_value))?;
        }

        // Get the record batch
        let record_batch = decoder
            .flush()?
            .ok_or_else(|| anyhow::anyhow!("Failed to create record batch"))?;

        Ok(Self { record_batch })
    }

    /// Creates a Record from a JSON string
    /// 
    /// This method parses a JSON string and creates a Record from it.
    /// The schema is inferred from the JSON data.
    pub fn from_json(json_str: &str) -> Result<Self, anyhow::Error> {
        // Parse the JSON string to a serde_json::Value
        let json_value: serde_json::Value = serde_json::from_str(json_str)?;

        // If this is an array with a single item, unwrap it to avoid serialization issues
        let single_item = match &json_value {
            serde_json::Value::Array(items) if items.len() == 1 => items[0].clone(),
            _ => json_value.clone(),
        };

        // Infer schema from the JSON value
        let inferred_schema =
            infer_json_schema_from_iterator(std::iter::once(Ok(single_item.clone())))?;

        // Create a decoder with the inferred schema
        let mut decoder = ReaderBuilder::new(Arc::new(inferred_schema)).build_decoder()?;

        // Serialize the value into the decoder
        if let serde_json::Value::Array(items) = &json_value {
            for item in items {
                decoder.serialize(std::slice::from_ref(item))?;
            }
        } else {
            decoder.serialize(std::slice::from_ref(&json_value))?;
        }

        // Get the record batch
        let record_batch = decoder
            .flush()?
            .ok_or_else(|| anyhow::anyhow!("Failed to create record batch"))?;

        Ok(Self { record_batch })
    }

    pub fn from_record_batch(record_batch: RecordBatch) -> Self {
        Self { record_batch }
    }

    pub fn to_record_batch_cloned(&self) -> RecordBatch {
        self.record_batch.clone()
    }

    pub fn to_record_batch(&self) -> &RecordBatch {
        &self.record_batch
    }

    /// Flattens the internal RecordBatch, expanding struct columns.
    pub fn to_flattened_record_batch(&self) -> Result<RecordBatch, anyhow::Error> {
        flatten_record_batch(&self.record_batch)
    }

    /// Creates a flattened Record from this Record
    pub fn flatten(&self) -> Result<Self, anyhow::Error> {
        let flattened_batch = self.to_flattened_record_batch()?;
        Ok(Self::from_record_batch(flattened_batch))
    }

    /// Unflattens the internal RecordBatch, reconstructing nested struct columns.
    pub fn to_unflattened_record_batch(&self) -> Result<RecordBatch, anyhow::Error> {
        unflatten_record_batch(&self.record_batch)
    }

    /// Creates an unflattened Record from this Record
    pub fn unflatten(&self) -> Result<Self, anyhow::Error> {
        let unflattened_batch = self.to_unflattened_record_batch()?;
        Ok(Self::from_record_batch(unflattened_batch))
    }

    pub fn concat(&self, other: &Self) -> Result<Self, anyhow::Error> {
        let schema = Arc::new(self.record_batch.schema().clone());
        let combined_batch = arrow::compute::concat_batches(
            &schema,
            &[self.record_batch.clone(), other.record_batch.clone()],
        )?;
        Ok(Self::from_record_batch(combined_batch))
    }

    pub fn set_topic(&mut self, topic: String) -> Result<(), anyhow::Error> {
        let schema = self.record_batch.schema().clone();
        let mut metadata = schema.metadata().clone();
        metadata.insert("topic".to_string(), topic);
        let new_schema =
            arrow::datatypes::Schema::new_with_metadata(schema.fields().clone(), metadata);

        // Create a new record batch with the updated schema
        let columns = self.record_batch.columns().to_vec();
        self.record_batch = RecordBatch::try_new(std::sync::Arc::new(new_schema), columns)?;
        Ok(())
    }

    pub fn try_get_topic(&self) -> Result<String, RecordError> {
        self.record_batch
            .schema()
            .metadata()
            .get("topic")
            .map(|s| s.to_string())
            .ok_or(RecordError::TopicMetadataNotSet)
    }

    pub fn set_flag(&mut self, flag: RecordFlag) -> Result<(), anyhow::Error> {
        let mut metadata = self.record_batch.schema().metadata().clone();
        metadata.insert("flag".to_string(), flag.to_string());
        let new_schema = arrow::datatypes::Schema::new_with_metadata(
            self.record_batch.schema().fields().clone(),
            metadata,
        );
        let columns = self.record_batch.columns().to_vec();
        self.record_batch = RecordBatch::try_new(std::sync::Arc::new(new_schema), columns)?;
        Ok(())
    }

    pub fn get_flag(&self) -> Result<RecordFlag, RecordError> {
        self.record_batch
            .schema()
            .metadata()
            .get("flag")
            .map(|s| RecordFlag::from_str(s).unwrap())
            .ok_or(RecordError::FlagMetadataNotSet)
    }

    pub fn get_n_latest_rows(&self, n: usize) -> Result<Self, anyhow::Error> {
        let schema = self.record_batch.schema();
        let columns = self
            .record_batch
            .slice(self.record_batch.num_rows() - n, n)
            .columns()
            .to_vec();
        let record_batch = RecordBatch::try_new(schema, columns)?;
        Ok(Self::from_record_batch(record_batch))
    }

    pub fn to_serde<T: DeserializeOwned>(&self) -> Result<Vec<T>, anyhow::Error> {
        let record_batch = self.to_record_batch_cloned();

        // Use arrow_json::ArrayWriter to convert record batch to JSON
        let buf = Vec::new();
        let mut writer = arrow::json::writer::ArrayWriter::new(buf);
        writer.write_batches(&[&record_batch])?;
        writer.finish()?;
        let json_data = writer.into_inner();

        // Parse the JSON string as an array of objects
        let json_values: Vec<serde_json::Value> = serde_json::from_slice(&json_data)?;

        if json_values.is_empty() {
            return Err(anyhow::anyhow!("No data in record batch"));
        }

        // Deserialize the first row
        let result: Vec<T> = serde_json::from_slice(&json_data)?;
        Ok(result)
    }
}

impl std::fmt::Debug for Record {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // Format the Record for debug output
        let schema = self.record_batch.schema();
        let num_rows = self.record_batch.num_rows();
        let num_cols = self.record_batch.num_columns();

        // Try to get topic if available
        let topic_str = match self.try_get_topic() {
            Ok(topic) => format!("topic: {}", topic),
            Err(_) => "topic: <not set>".to_string(),
        };

        writeln!(
            f,
            "Record → [{}] ({} rows, {} columns)",
            topic_str, num_rows, num_cols
        )?;
        writeln!(f, "Schema:")?;

        // Print schema fields
        for (i, field) in schema.fields().iter().enumerate() {
            writeln!(f, "  {}: {} ({})", i, field.name(), field.data_type())?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use arrow::array::{Float64Array, Int32Array, ListArray, StringArray};
    use arrow::datatypes::{DataType, Field, Fields, Schema, SchemaRef};
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, Debug, Default)]
    struct TestPose {
        pub x: f64,
        pub y: f64,
        pub z: f64,
    }
    #[derive(Serialize, Deserialize, Debug, Default)]
    struct TestStruct {
        pub id: i32,
        pub name: String,
        pub value: f64,
        pub last_pose: TestPose,
        pub poses: Vec<TestPose>,
    }

    #[test]
    fn test_from_serde() {
        let _ = pretty_env_logger::try_init();

        let test_struct = TestStruct::default();
        let record = Record::from_serde(&test_struct);
        assert!(record.is_ok());
        println!("{:?}", record);
    }

    #[test]
    fn test_from_record_batch() {
        let test_struct = TestStruct::default();
        let record_serde = Record::from_serde(&test_struct).unwrap();
        let record_batch = record_serde.to_record_batch_cloned();
        let record = Record::from_record_batch(record_batch.clone());
        println!("{:?}", record);
        assert_eq!(record.to_record_batch_cloned(), record_batch);
    }

    #[test]
    fn test_topics() {
        let test_struct = TestStruct::default();
        let mut record = Record::from_serde(&test_struct).unwrap();
        assert!(record.try_get_topic().is_err());
        record.set_topic("test_topic".to_string()).unwrap();
        assert_eq!(record.try_get_topic().unwrap(), "test_topic");

        let rb = record.to_record_batch_cloned();
        let record2 = Record::from_record_batch(rb);
        assert_eq!(record2.try_get_topic().unwrap(), "test_topic");
    }

    #[test]
    fn test_flag() {
        let test_struct = TestStruct::default();
        let mut record = Record::from_serde(&test_struct).unwrap();
        assert!(record.get_flag().is_err());
        record.set_flag(RecordFlag::PublishPacket).unwrap();
        assert_eq!(record.get_flag().unwrap(), RecordFlag::PublishPacket);
    }

    #[test]
    fn test_flatten_record_batch_simple() {
        let _ = pretty_env_logger::try_init();
        #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct Inner {
            a: i32,
            b: String,
        }
        #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct Outer {
            id: i32,
            inner: Inner,
            value: f64,
        }

        // Create data for testing
        let data = vec![
            Outer { id: 1, inner: Inner { a: 10, b: "hello".to_string() }, value: 1.1 },
            Outer { id: 2, inner: Inner { a: 20, b: "world".to_string() }, value: 2.2 },
        ];

        // Create schema manually for the test
        let inner_fields = Fields::from(vec![
            Arc::new(Field::new("a", DataType::Int64, true)),
            Arc::new(Field::new("b", DataType::Utf8, true)),
        ]);
        
        // Create the original RecordBatch with struct data
        let schema = Arc::new(Schema::new(vec![
            Field::new("id", DataType::Int64, false),
            Field::new("inner", DataType::Struct(inner_fields), true),
            Field::new("value", DataType::Float64, false),
        ]));
        
        // Create arrays for the data
        let id_array = Arc::new(arrow::array::Int64Array::from(vec![1, 2]));
        let value_array = Arc::new(Float64Array::from(vec![1.1, 2.2]));
        
        // Create the inner struct arrays
        let inner_a_array = Arc::new(arrow::array::Int64Array::from(vec![10, 20]));
        let inner_b_array = Arc::new(StringArray::from(vec!["hello", "world"]));
        
        let inner_struct = StructArray::try_new(
            Fields::from(vec![
                Arc::new(Field::new("a", DataType::Int64, true)),
                Arc::new(Field::new("b", DataType::Utf8, true)),
            ]),
            vec![inner_a_array, inner_b_array],
            None,
        ).unwrap();
        
        // Create the original batch with a struct column
        let original_batch = RecordBatch::try_new(
            schema,
            vec![id_array, Arc::new(inner_struct), value_array],
        ).unwrap();
        
        // Now flatten it using our function
        let flattened_batch = flatten_record_batch(&original_batch).expect("Flattening failed");

        assert_eq!(flattened_batch.num_columns(), 4);
        assert_eq!(flattened_batch.num_rows(), 2);

        let schema = flattened_batch.schema();
        let field_names: Vec<&str> = schema.fields().iter().map(|f| f.name().as_str()).collect();
        assert_eq!(field_names, vec!["id", "inner.a", "inner.b", "value"]);

        // Check data types
        assert_eq!(schema.field_with_name("id").unwrap().data_type(), &DataType::Int64);
        assert_eq!(schema.field_with_name("inner.a").unwrap().data_type(), &DataType::Int64);
        assert_eq!(schema.field_with_name("inner.b").unwrap().data_type(), &DataType::Utf8);
        assert_eq!(schema.field_with_name("value").unwrap().data_type(), &DataType::Float64);

        // Check some values
        let id_col = flattened_batch.column(0).as_any().downcast_ref::<arrow::array::Int64Array>().unwrap();
        assert_eq!(id_col.value(0), 1);
        assert_eq!(id_col.value(1), 2);

        let inner_a_col = flattened_batch.column(1).as_any().downcast_ref::<arrow::array::Int64Array>().unwrap();
        assert_eq!(inner_a_col.value(0), 10);
        assert_eq!(inner_a_col.value(1), 20);

        let inner_b_col = flattened_batch.column(2).as_any().downcast_ref::<StringArray>().unwrap();
        assert_eq!(inner_b_col.value(0), "hello");
        assert_eq!(inner_b_col.value(1), "world");

        let value_col = flattened_batch.column(3).as_any().downcast_ref::<Float64Array>().unwrap();
        assert_eq!(value_col.value(0), 1.1);
        assert_eq!(value_col.value(1), 2.2);
    }

     #[test]
    fn test_flatten_record_batch_nested() {
         #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct DeepInner {
            x: f64,
        }
        #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct Inner {
            a: i32,
            deep: DeepInner,
        }
       #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct Outer {
            id: i32,
            inner: Inner,
        }

        // Create schema with nested structs manually
        let deep_inner_fields = Fields::from(vec![
            Arc::new(Field::new("x", DataType::Float64, true)),
        ]);
        
        let inner_fields = Fields::from(vec![
            Arc::new(Field::new("a", DataType::Int64, true)),
            Arc::new(Field::new("deep", DataType::Struct(deep_inner_fields), true)),
        ]);
        
        let schema = Arc::new(Schema::new(vec![
            Field::new("id", DataType::Int64, false),
            Field::new("inner", DataType::Struct(inner_fields), true),
        ]));
        
        // Create arrays for the data
        let id_array = Arc::new(arrow::array::Int64Array::from(vec![1, 2]));
        let inner_a_array = Arc::new(arrow::array::Int64Array::from(vec![10, 20]));
        
        // Create the deep inner struct
        let deep_x_array = Arc::new(Float64Array::from(vec![100.1, 200.2]));
        let deep_struct = StructArray::try_new(
            Fields::from(vec![
                Arc::new(Field::new("x", DataType::Float64, true)),
            ]),
            vec![deep_x_array],
            None,
        ).unwrap();
        
        // Create the inner struct with the deep struct inside
        let inner_struct = StructArray::try_new(
            Fields::from(vec![
                Arc::new(Field::new("a", DataType::Int64, true)),
                Arc::new(Field::new("deep", DataType::Struct(Fields::from(vec![
                    Arc::new(Field::new("x", DataType::Float64, true)),
                ])), true)),
            ]),
            vec![inner_a_array, Arc::new(deep_struct)],
            None,
        ).unwrap();
        
        // Create the batch with nested structs
        let batch = RecordBatch::try_new(
            schema,
            vec![id_array, Arc::new(inner_struct)],
        ).unwrap();
        
        // Now flatten it
        let flattened_batch = flatten_record_batch(&batch).expect("Flattening failed");

        assert_eq!(flattened_batch.num_columns(), 3);
        assert_eq!(flattened_batch.num_rows(), 2);

        let schema = flattened_batch.schema();
        let field_names: Vec<&str> = schema.fields().iter().map(|f| f.name().as_str()).collect();
        assert_eq!(field_names, vec!["id", "inner.a", "inner.deep.x"]);

        // Check data types
        assert_eq!(schema.field_with_name("id").unwrap().data_type(), &DataType::Int64);
        assert_eq!(schema.field_with_name("inner.a").unwrap().data_type(), &DataType::Int64);
        assert_eq!(schema.field_with_name("inner.deep.x").unwrap().data_type(), &DataType::Float64);
    }

    #[test]
    fn test_flatten_record_batch_no_structs() {
        let schema = Arc::new(Schema::new(vec![
            Field::new("a", DataType::Int32, false),
            Field::new("b", DataType::Utf8, true),
        ]));
        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(Int32Array::from(vec![1, 2])),
                Arc::new(StringArray::from(vec![Some("x"), None])),
            ],
        )
        .unwrap();

        let flattened_batch = flatten_record_batch(&batch).expect("Flattening failed");

        assert_eq!(flattened_batch.schema(), batch.schema()); // Schema should be identical
        assert_eq!(flattened_batch.num_columns(), 2);
        assert_eq!(flattened_batch.num_rows(), 2);
    }

    #[test]
    fn test_unflatten_record_batch_simple() {
        #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct Inner {
            a: i32,
            b: String,
        }
        #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct Outer {
            id: i32,
            inner: Inner,
            value: f64,
        }

        // Create sample data - not used directly but kept for reference
        let _data = vec![
            Outer { id: 1, inner: Inner { a: 10, b: "hello".to_string() }, value: 1.1 },
            Outer { id: 2, inner: Inner { a: 20, b: "world".to_string() }, value: 2.2 },
        ];
        
        // Create schema manually for the test
        let schema = Arc::new(Schema::new(vec![
            Field::new("id", DataType::Int64, false),
            Field::new("inner.a", DataType::Int64, true),
            Field::new("inner.b", DataType::Utf8, true),
            Field::new("value", DataType::Float64, false),
        ]));
        
        // Create arrays for the flattened data
        let id_array = Arc::new(arrow::array::Int64Array::from(vec![1, 2]));
        let inner_a_array = Arc::new(arrow::array::Int64Array::from(vec![10, 20]));
        let inner_b_array = Arc::new(StringArray::from(vec!["hello", "world"]));
        let value_array = Arc::new(Float64Array::from(vec![1.1, 2.2]));
        
        // Create the flattened RecordBatch
        let flattened_batch = RecordBatch::try_new(
            schema,
            vec![id_array, inner_a_array, inner_b_array, value_array],
        ).expect("Failed to create flattened batch");
        
        // Create a Record from the flattened batch
        let record = Record::from_record_batch(flattened_batch);
        
        // Debug original record schema
        println!("Original record schema: {:?}", record.to_record_batch().schema().fields());
        
        // Now unflatten it
        let unflattened_batch = unflatten_record_batch(record.to_record_batch()).expect("Unflattening failed");
        
        // Debug unflattened batch schema and columns
        println!("Unflattened schema: {:?}", unflattened_batch.schema().fields());
        println!("Unflattened num columns: {}", unflattened_batch.num_columns());
        println!("Unflattened columns: {:?}", unflattened_batch.columns());
        
        // Check structure - unflatten should create 3 columns: id, inner, value
        assert_eq!(unflattened_batch.num_columns(), 3, 
            "Expected 3 columns in unflattened batch, found {} columns: {:?}",
            unflattened_batch.num_columns(),
            unflattened_batch.schema().fields().iter().map(|f| f.name()).collect::<Vec<_>>()
        );
        
        // Check that inner is a struct
        let schema = unflattened_batch.schema();
        let inner_field = schema.field_with_name("inner").unwrap();
        match inner_field.data_type() {
            DataType::Struct(fields) => {
                assert_eq!(fields.len(), 2);
                assert!(fields.iter().any(|f| f.name() == "a"));
                assert!(fields.iter().any(|f| f.name() == "b"));
            },
            _ => panic!("Expected inner to be a struct"),
        }
        
        // Verify we can round-trip from flattened -> unflattened -> flattened
        let reflattened_batch = flatten_record_batch(&unflattened_batch).expect("Re-flattening failed");
        
        // Debug reflattened batch
        println!("Reflattened schema: {:?}", reflattened_batch.schema().fields());
        println!("Reflattened num columns: {}", reflattened_batch.num_columns());
        
        // Should have the same columns as the original flattened batch
        assert_eq!(reflattened_batch.num_columns(), 4);
        
        // Field names should match after round-trip (using sets because order might differ)
        let original_names: HashSet<_> = record.to_record_batch().schema().fields().iter().map(|f| f.name().clone()).collect();
        let round_trip_names: HashSet<_> = reflattened_batch.schema().fields().iter().map(|f| f.name().clone()).collect();
        assert_eq!(original_names, round_trip_names);
    }

    #[test]
    fn test_unflatten_record_batch_nested() {
        #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct DeepInner {
            x: f64,
        }
        #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct Inner {
            a: i32,
            deep: DeepInner,
        }
        #[derive(Serialize, Deserialize, Debug, Default, Clone)]
        struct Outer {
            id: i32,
            inner: Inner,
        }

        // Create schema manually for the test
        let schema = Arc::new(Schema::new(vec![
            Field::new("id", DataType::Int64, false),
            Field::new("inner.a", DataType::Int64, true),
            Field::new("inner.deep.x", DataType::Float64, true),
        ]));
        
        // Create arrays for the flattened data
        let id_array = Arc::new(arrow::array::Int64Array::from(vec![1, 2]));
        let inner_a_array = Arc::new(arrow::array::Int64Array::from(vec![10, 20]));
        let inner_deep_x_array = Arc::new(Float64Array::from(vec![100.1, 200.2]));
        
        // Create the flattened RecordBatch
        let flattened_batch = RecordBatch::try_new(
            schema,
            vec![id_array, inner_a_array, inner_deep_x_array],
        ).expect("Failed to create flattened batch");
        
        // Create a Record from the flattened batch
        let record = Record::from_record_batch(flattened_batch);
        
        // Check flattened structure
        assert_eq!(record.to_record_batch().num_columns(), 3);
        
        // Now unflatten it
        let unflattened_batch = unflatten_record_batch(record.to_record_batch()).expect("Unflattening failed");
        
        // Check unflattened structure
        assert_eq!(unflattened_batch.num_columns(), 2); // id, inner
        
        // Check that inner is a struct with nested struct
        let schema = unflattened_batch.schema();
        let inner_field = schema.field_with_name("inner").unwrap();
        match inner_field.data_type() {
            DataType::Struct(fields) => {
                assert_eq!(fields.len(), 2);
                assert!(fields.iter().any(|f| f.name() == "a"));
                let deep_field = fields.iter().find(|f| f.name() == "deep").unwrap();
                match deep_field.data_type() {
                    DataType::Struct(deep_fields) => {
                        assert_eq!(deep_fields.len(), 1);
                        assert!(deep_fields.iter().any(|f| f.name() == "x"));
                    },
                    _ => panic!("Expected deep to be a struct"),
                }
            },
            _ => panic!("Expected inner to be a struct"),
        }
        
        // Verify the record's flatten/unflatten methods work correctly
        let flattened_record = record.flatten().expect("Failed to flatten record");
        let unflattened_record = flattened_record.unflatten().expect("Failed to unflatten record");
        
        // The original batch has 3 columns, the unflattened should have 2 (id and inner)
        assert_eq!(unflattened_record.to_record_batch().schema().fields().len(), 2);
    }

    #[test]
    fn test_partial_unflatten() {
        // Test case where some fields need to be unflattened but others don't
        let schema = Arc::new(Schema::new(vec![
            Field::new("id", DataType::Int32, false),
            Field::new("regular_field", DataType::Utf8, true),
            Field::new("nested.a", DataType::Int32, true),
            Field::new("nested.b", DataType::Utf8, true),
        ]));
        
        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(Int32Array::from(vec![1, 2])),
                Arc::new(StringArray::from(vec![Some("regular"), None])),
                Arc::new(Int32Array::from(vec![10, 20])),
                Arc::new(StringArray::from(vec![Some("nested_a"), Some("nested_b")])),
            ],
        ).unwrap();
        
        let unflattened_batch = unflatten_record_batch(&batch).expect("Unflattening failed");
        
        // Check structure - should have 3 columns: id, regular_field, nested
        assert_eq!(unflattened_batch.num_columns(), 3);
        
        // nested should be a struct with a and b fields
        let schema = unflattened_batch.schema();
        let nested_field = schema.field_with_name("nested").unwrap();
        match nested_field.data_type() {
            DataType::Struct(fields) => {
                assert_eq!(fields.len(), 2);
                assert!(fields.iter().any(|f| f.name() == "a"));
                assert!(fields.iter().any(|f| f.name() == "b"));
            },
            _ => panic!("Expected nested to be a struct"),
        }
        
        // Flattening it back should give us the original structure
        let reflattened_batch = flatten_record_batch(&unflattened_batch).expect("Re-flattening failed");
        assert_eq!(reflattened_batch.num_columns(), 4);
    }

    // Add more tests for edge cases like empty structs, lists of structs (should remain lists), etc.
}

