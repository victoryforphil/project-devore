pub mod parquet_ops;
pub mod utils;

// Only include the TUI module when the 'tui' feature is enabled
#[cfg(feature = "tui")]
pub mod tui;

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};
    use crate::parquet_ops;
    
    #[test]
    fn test_find_parquet_files() {
        let files = parquet_ops::find_parquet_files(
            Path::new("../logs"), 
            true, 
            Some("heartbeat")
        ).unwrap();
        
        // Make sure we found at least some files
        assert!(!files.is_empty());
        
        // Make sure they are all parquet files
        for file in &files {
            assert!(file.extension().unwrap() == "parquet");
            assert!(file.file_name().unwrap().to_string_lossy().contains("heartbeat"));
        }
    }
} 