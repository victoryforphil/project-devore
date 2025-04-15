# Log Utils

A command-line utility for working with Parquet log files, providing tools for viewing, merging, and analyzing structured log data.

## Features

- **Parquet File Viewing**: Display the contents of Parquet files with color formatting and filtering options
- **Smart Merging**: Combine multiple Parquet files by intelligently grouping compatible schemas
- **Schema Compatibility Handling**: Options for dealing with incompatible schema structures
- **Recursive Directory Searching**: Find and process log files throughout nested folders
- **Interactive TUI Mode**: Explore Parquet files in a terminal-based user interface (when built with the `tui` feature)

## Installation

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-username/log-utils.git
cd log-utils

# Build the basic version
cargo build --release

# Build with TUI support
cargo build --release --features tui
```

The compiled binary will be available at `target/release/log_utils`.

## Usage

### Viewing Parquet Files

```bash
# Basic usage
log_utils print -i /path/to/your/file.parquet

# Limit output to 10 rows
log_utils print -i /path/to/your/file.parquet -l 10

# Show only specific columns
log_utils print -i /path/to/your/file.parquet -C timestamp -C message -C level

# Process multiple files in directory
log_utils print -i /path/to/your/logs/ -r

# Filter files by pattern
log_utils print -i /path/to/your/logs/ -f "heartbeat" -r
```

### Merging Parquet Files

#### Standard Merge

Combines Parquet files with compatible schemas into a single output file:

```bash
# Basic merge
log_utils merge -i /path/to/logs/ -o merged.parquet

# Merge with recursive directory search
log_utils merge -i /path/to/logs/ -o merged.parquet -r

# Merge only files matching pattern
log_utils merge -i /path/to/logs/ -o merged.parquet -f "vfr_hud"

# Force merge with potentially incompatible schemas (may cause errors)
log_utils merge -i /path/to/logs/ -o merged.parquet -r -F
```

#### Smart Merge

Intelligently groups files by schema compatibility before merging, creating separate output files for each schema group:

```bash
# Smart merge
log_utils smart-merge -i /path/to/logs/ -o /output/directory/ -b base_name

# With recursive search and filtering
log_utils smart-merge -i /path/to/logs/ -o /output/directory/ -b base_name -r -f "final"
```

This will produce files like `base_name_1.parquet`, `base_name_2.parquet`, etc., with each file containing data from Parquet files with compatible schemas.

### Interactive TUI Mode (requires `tui` feature)

```bash
# Launch TUI explorer (if built with tui feature)
log_utils tui -i /path/to/logs/
```

Navigation in TUI mode:
- Tab/Shift+Tab: Change tabs
- Left/Right: Navigate between files
- Up/Down: Navigate rows
- q: Quit

## Handling Schema Incompatibilities

When working with Parquet files that have different schemas, you have two options:

1. **Force Merge**: Use the `-F` flag with the `merge` command to attempt combining files even with incompatible schemas. This may cause errors or data corruption.

2. **Smart Merge**: Use the `smart-merge` command to automatically group files by schema compatibility and merge each group separately.

## Working with Nested Data Structures

Parquet files often contain complex nested data structures, such as:
- Arrays of structs
- Structs containing arrays
- Multiple levels of nesting

These nested structures can cause compatibility issues when merging files, especially when dealing with:
- Different field types across files (e.g., a field that's Float64 in one file but Int64 in another)
- Varying levels of nesting (e.g., arrays of different depths)
- Null values in nested fields

The `smart-merge` command specifically addresses these challenges by:
1. Analyzing the schema of each file to determine compatibility
2. Grouping files with identical schema structures
3. Creating separate output files for each schema group
4. Handling errors gracefully without failing the entire operation

This approach solves common issues with Arrow/Parquet nested data compatibility, including those related to the bug documented in [Arrow RS issue #1744](https://github.com/apache/arrow-rs/issues/1744).

## Examples

### Processing UAV/Drone Logs

```bash
# View drone heartbeat data
log_utils print -i logs/20250409_235449/mavlink/heartbeat_final.parquet -l 5

# Merge all flight status records
log_utils smart-merge -i logs/20250409_235449/ -o merged_logs/ -b flight_data -r -f "status"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 