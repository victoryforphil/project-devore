use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};

use log_utils::parquet_ops;
use log_utils::utils;

#[derive(Parser)]
#[command(name = "log_utils")]
#[command(about = "Utility for working with Parquet log files", long_about = None)]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Merge multiple parquet files into a single file
    Merge {
        /// Input directory containing parquet files
        #[arg(short, long)]
        input: PathBuf,

        /// Output parquet file path
        #[arg(short, long)]
        output: PathBuf,

        /// Recursively search for parquet files in subdirectories
        #[arg(short, long, default_value_t = false)]
        recursive: bool,

        /// Filter files by pattern (e.g., "attitude" matches "attitude.parquet" and "attitude_final.parquet")
        #[arg(short, long)]
        filter: Option<String>,
        
        /// Force merge even if schemas are incompatible (may cause errors)
        #[arg(short = 'F', long, default_value_t = false)]
        force: bool,
    },
    /// Smart merge by automatically grouping files by schema compatibility
    SmartMerge {
        /// Input directory containing parquet files
        #[arg(short, long)]
        input: PathBuf,

        /// Output directory for merged files
        #[arg(short, long)]
        output_dir: PathBuf,
        
        /// Base filename for output files (will add _1, _2, etc. for different schema groups)
        #[arg(short, long)]
        base_name: String,

        /// Recursively search for parquet files in subdirectories
        #[arg(short, long, default_value_t = false)]
        recursive: bool,

        /// Filter files by pattern (e.g., "attitude" matches "attitude.parquet" and "attitude_final.parquet")
        #[arg(short, long)]
        filter: Option<String>,
    },
    /// Print contents of a parquet file or merged files
    Print {
        /// Input file or directory
        #[arg(short, long)]
        input: PathBuf,

        /// Use colored output formatting
        #[arg(short, long, default_value_t = true)]
        color: bool,

        /// Show only specific columns
        #[arg(short = 'C', long)]
        columns: Option<Vec<String>>,

        /// Filter files by pattern (e.g., "attitude" matches "attitude.parquet" and "attitude_final.parquet")
        #[arg(short, long)]
        filter: Option<String>,

        /// Recursively search for parquet files in subdirectories
        #[arg(short, long, default_value_t = false)]
        recursive: bool,

        /// Limit the number of rows printed
        #[arg(short, long)]
        limit: Option<usize>,
    },
    /// Run interactive TUI mode
    #[cfg(feature = "tui")]
    Tui {
        /// Input directory containing parquet files
        #[arg(short, long)]
        input: PathBuf,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Merge { input, output, recursive, filter, force } => {
            println!("Merging parquet files from {:?} to {:?}", input, output);
            merge_parquet_files(input, output, recursive, filter, force)?;
        }
        Commands::SmartMerge { input, output_dir, base_name, recursive, filter } => {
            println!("Smart merging parquet files from {:?} to {:?}", input, output_dir);
            smart_merge_parquet_files(input, output_dir, base_name, recursive, filter)?;
        }
        Commands::Print { input, color, columns, filter, recursive, limit } => {
            println!("Printing parquet files from {:?}", input);
            print_parquet_files(input, color, columns, filter, recursive, limit)?;
        }
        #[cfg(feature = "tui")]
        Commands::Tui { input } => {
            println!("Starting TUI mode with input directory {:?}", input);
            log_utils::tui::run_tui_app(input)?;
        }
    }

    Ok(())
}

fn merge_parquet_files(
    input: PathBuf, 
    output: PathBuf, 
    recursive: bool, 
    filter: Option<String>,
    force: bool,
) -> Result<()> {
    // Check if input exists
    if !input.exists() {
        return Err(anyhow::anyhow!("Input path does not exist: {}", input.display()));
    }
    
    // Find all parquet files in the input directory
    let filter_str = filter.as_deref();
    let files = if input.is_dir() {
        parquet_ops::find_parquet_files(&input, recursive, filter_str)?
    } else if input.is_file() {
        vec![input.clone()]
    } else {
        return Err(anyhow::anyhow!("Input path is neither a file nor directory: {}", input.display()));
    };
    
    // Make sure we found at least one file
    if files.is_empty() {
        return Err(anyhow::anyhow!("No parquet files found matching filter"));
    }
    
    // Merge the files
    println!("Found {} parquet files to merge", files.len());
    
    // Create parent directories for output if necessary
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
    }
    
    // Merge files and write output
    parquet_ops::merge_parquet_files_to_output(&files, &output, force)?;
    
    println!("Successfully merged {} files into {}", files.len(), output.display());
    
    Ok(())
}

fn smart_merge_parquet_files(
    input: PathBuf,
    output_dir: PathBuf,
    base_name: String,
    recursive: bool,
    filter: Option<String>,
) -> Result<()> {
    // Check if input exists
    if !input.exists() {
        return Err(anyhow::anyhow!("Input path does not exist: {}", input.display()));
    }
    
    // Find all parquet files in the input directory
    let filter_str = filter.as_deref();
    let files = if input.is_dir() {
        parquet_ops::find_parquet_files(&input, recursive, filter_str)?
    } else if input.is_file() {
        vec![input.clone()]
    } else {
        return Err(anyhow::anyhow!("Input path is neither a file nor directory: {}", input.display()));
    };
    
    // Make sure we found at least one file
    if files.is_empty() {
        return Err(anyhow::anyhow!("No parquet files found matching filter"));
    }
    
    println!("Found {} parquet files to merge", files.len());
    
    // Create parent directories for output if necessary
    std::fs::create_dir_all(&output_dir)
        .with_context(|| format!("Failed to create directory: {}", output_dir.display()))?;
    
    // Smart merge files by grouping according to schema
    let output_files = parquet_ops::merge_parquet_files_by_schema_groups(
        &files, 
        &output_dir,
        &base_name
    )?;
    
    println!("Successfully created {} merged files", output_files.len());
    
    Ok(())
}

fn print_parquet_files(
    input: PathBuf, 
    color: bool, 
    columns: Option<Vec<String>>, 
    filter: Option<String>, 
    recursive: bool,
    limit: Option<usize>
) -> Result<()> {
    // Check if input exists
    if !input.exists() {
        return Err(anyhow::anyhow!("Input path does not exist: {}", input.display()));
    }
    
    let filter_str = filter.as_deref();
    let files = if input.is_dir() {
        // Find all parquet files in the directory
        parquet_ops::find_parquet_files(&input, recursive, filter_str)?
    } else if input.is_file() {
        // Just use the single file
        vec![input.clone()]
    } else {
        return Err(anyhow::anyhow!("Input path is neither a file nor directory: {}", input.display()));
    };
    
    // Make sure we found at least one file
    if files.is_empty() {
        return Err(anyhow::anyhow!("No parquet files found matching filter"));
    }
    
    println!("Found {} parquet files to print", files.len());
    
    // Process each file
    for file_path in &files {
        // Print separator between files if multiple
        if files.len() > 1 {
            println!("\n{}", "=".repeat(80));
            println!("File: {}", file_path.display());
            println!("{}", "=".repeat(80));
        }
        
        // Read the record batches
        let batches = parquet_ops::collect_record_batches(file_path)?;
        
        if batches.is_empty() {
            println!("No data in file: {}", file_path.display());
            continue;
        }
        
        // Print metadata
        println!("{}", parquet_ops::get_parquet_metadata(file_path)?);
        
        // Print each batch
        for (i, batch) in batches.iter().enumerate() {
            if batches.len() > 1 {
                println!("\nBatch {}/{}:", i + 1, batches.len());
            }
            
            let column_refs = columns.as_ref().map(|c| c.as_slice());
            let output = utils::pretty_print_batch(batch, color, column_refs, limit)?;
            println!("{}", output);
        }
    }
    
    Ok(())
}
