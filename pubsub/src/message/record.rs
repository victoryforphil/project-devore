use arrow::array::{ArrayRef, RecordBatch, StructArray};
use arrow::datatypes::{DataType, Field, Schema, SchemaRef};
use arrow::json::reader::infer_json_schema_from_iterator;
use arrow::json::reader::{Decoder, ReaderBuilder};
use prettytable::{format, Cell, Row, Table};
use serde::de::DeserializeOwned;
use serde_json::to_value;
use std::str::FromStr;
use std::sync::Arc;

fn flatten_struct_column(
    prefix: &str,
    struct_array: &StructArray,
) -> Result<Vec<(Field, ArrayRef)>, anyhow::Error> {
    let mut flattened_columns = Vec::new();
    for (i, field) in struct_array.fields().iter().enumerate() {
        let col_name = if prefix.is_empty() {
            field.name().clone()
        } else {
            format!("{}.{}", prefix, field.name())
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

        // Infer schema from the JSON value
        let inferred_schema =
            infer_json_schema_from_iterator(std::iter::once(Ok(json_value.clone())))?;

        // Create a decoder with the inferred schema
        let mut decoder = ReaderBuilder::new(Arc::new(inferred_schema)).build_decoder()?;

        // Serialize the value into the decoder
        decoder.serialize(std::slice::from_ref(value))?;

        // Get the record batch
        let record_batch = decoder
            .flush()?
            .ok_or_else(|| anyhow::anyhow!("Failed to create record batch"))?;

        Ok(Self { record_batch })
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

        let data = vec![
            Outer { id: 1, inner: Inner { a: 10, b: "hello".to_string() }, value: 1.1 },
            Outer { id: 2, inner: Inner { a: 20, b: "world".to_string() }, value: 2.2 },
        ];

        let record = Record::from_serde(&data).expect("Failed to create record from serde");
        let flattened_batch = flatten_record_batch(record.to_record_batch()).expect("Flattening failed");

        assert_eq!(flattened_batch.num_columns(), 4);
        assert_eq!(flattened_batch.num_rows(), 2);

        let schema = flattened_batch.schema();
        let field_names: Vec<&str> = schema.fields().iter().map(|f| f.name().as_str()).collect();
        assert_eq!(field_names, vec!["id", "inner.a", "inner.b", "value"]);

        // Check data types
        assert_eq!(schema.field_with_name("id").unwrap().data_type(), &DataType::Int64); // Note: Serde JSON infers Int64
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

        let data = vec![
             Outer { id: 1, inner: Inner { a: 10, deep: DeepInner { x: 100.1 } } },
             Outer { id: 2, inner: Inner { a: 20, deep: DeepInner { x: 200.2 } } },
         ];

        let record = Record::from_serde(&data).expect("Failed to create record from serde");
        let flattened_batch = flatten_record_batch(record.to_record_batch()).expect("Flattening failed");

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

    // Add more tests for edge cases like empty structs, lists of structs (should remain lists), etc.
}
