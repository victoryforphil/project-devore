# Data Selection System

A comprehensive context-based system for selecting and loading parquet files and columns with metadata inspection.

## Overview

The data selection system provides:
- **File Selection**: Click on files to load their metadata
- **Column Selection**: Click on columns to view their details
- **Metadata Display**: Automatic loading and display of parquet file schemas
- **JSON Viewer**: Pretty-printed, colored JSON view of metadata

## Architecture

### Contexts

#### `ParquetWasmContext`
Provides WASM initialization and parquet reading functions.

```tsx
const { isInitialized, readSchema, readTable } = useParquetWasm()
```

#### `DataSelectionContext`
Manages file and column selection state with metadata loading.

```tsx
const { selection, selectFile, selectColumn, clearSelection } = useDataSelection()
```

### Hooks

#### `useData()`
Convenient hook with typed access to selections and helper methods.

```tsx
const {
  selection,
  isFile,
  isColumn,
  fileSelection,
  columnSelection,
  selectFile,
  selectColumn,
} = useData()
```

#### `useParquetSchema()`
Loads schema metadata for multiple files.

```tsx
const { metadata, loadMetadata, isLoading } = useParquetSchema()
```

## Usage Examples

### Selecting a File

```tsx
import { useDataSelection } from '@/contexts/DataSelectionContext'

function MyComponent() {
  const { selectFile } = useDataSelection()
  
  const handleFileClick = async (filePath: string) => {
    await selectFile(filePath) // Loads full metadata
  }
  
  return <button onClick={() => handleFileClick('/path/to/file.parquet')}>
    Load File
  </button>
}
```

### Selecting a Column

```tsx
import { useDataSelection } from '@/contexts/DataSelectionContext'

function MyComponent() {
  const { selectColumn } = useDataSelection()
  
  const handleColumnClick = (filePath: string, columnName: string) => {
    selectColumn(filePath, columnName)
  }
  
  return <button onClick={() => handleColumnClick('/path/to/file.parquet', 'timestamp')}>
    Select Column
  </button>
}
```

### Reading Current Selection

```tsx
import { useData } from '@/hooks/useData'

function Inspector() {
  const { selection, isFile, isColumn, fileSelection } = useData()
  
  if (isFile && fileSelection) {
    return (
      <div>
        <h3>{fileSelection.fileName}</h3>
        <p>Rows: {fileSelection.metadata?.numRows}</p>
        <p>Columns: {fileSelection.metadata?.numColumns}</p>
      </div>
    )
  }
  
  return <div>No selection</div>
}
```

## Components

### `Inspector`
Right sidebar component that displays metadata for selected files/columns.

**Features:**
- File metadata with row count, column count, file size
- Column details with type and nullable info
- JSON viewer for schema and field details
- Pretty formatted with syntax highlighting

### `JsonViewer`
Recursive component for displaying JSON data with syntax highlighting.

**Features:**
- Color-coded by data type
- Nested object/array rendering
- Monospace font for readability
- Proper indentation

### `UnifiedFileTree`
File tree with click handlers for file and column selection.

**Props:**
```tsx
interface UnifiedFileTreeProps {
  files: FileSystemItem[]
  metadata: ParquetFileMetadata[]
  onSelectFile?: (filePath: string) => void
  onSelectColumn: (filePath: string, columnName: string) => void
  onRemoveFile: (path: string) => void
}
```

## Data Types

### `FileSelection`
```tsx
interface FileSelection {
  type: 'file'
  filePath: string
  fileName: string
  schema?: Schema
  metadata?: ParquetFileMetadata
}
```

### `ColumnSelection`
```tsx
interface ColumnSelection {
  type: 'column'
  filePath: string
  columnName: string
  columnType: string
  field?: Field
  fileMetadata?: ParquetFileMetadata
}
```

### `ParquetFileMetadata`
```tsx
interface ParquetFileMetadata {
  path: string
  name: string
  numRows?: number
  numColumns?: number
  fileSize?: number
  createdBy?: string
  version?: string
  schema?: Schema
  rawMetadata?: Record<string, any>
}
```

## Provider Setup

Add providers to your app in this order:

```tsx
<AppProvider>
  <ParquetWasmProvider>
    <FileSystemProvider>
      <DataSelectionProvider>
        <YourApp />
      </DataSelectionProvider>
    </FileSystemProvider>
  </ParquetWasmProvider>
</AppProvider>
```

## Flow Diagram

```
User clicks file in tree
  ↓
UnifiedFileTree.onSelectFile
  ↓
Sidebar.handleSelectFile
  ↓
DataSelectionContext.selectFile
  ↓
Loads file via FileSystemAPI
  ↓
Reads schema and table via ParquetWasm
  ↓
Extracts metadata (rows, columns, size)
  ↓
Updates selection state
  ↓
Inspector displays metadata
  ↓
JsonViewer renders schema
```

## Key Features

✅ **Type-safe** - Full TypeScript support with proper typing
✅ **Async loading** - Non-blocking metadata loading with loading states
✅ **Error handling** - Comprehensive error catching and display
✅ **Pretty JSON** - Syntax-highlighted JSON viewer
✅ **Context-based** - Clean separation of concerns
✅ **Reusable hooks** - Multiple hooks for different use cases

## Notes

- WASM must be initialized before file selection works
- File reading uses FileSystemAPI (requires user permission)
- Metadata is loaded lazily on file selection
- Schema metadata is cached in selection state
- Large files may take time to load full table metadata
