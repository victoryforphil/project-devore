# Parquet-WASM Integration Summary

## What Was Built

A complete system for loading, selecting, and inspecting parquet files in a React application using WebAssembly.

## New Files Created

### Contexts
- `src/contexts/ParquetWasmContext.tsx` - WASM initialization and parquet reading
- `src/contexts/DataSelectionContext.tsx` - File/column selection state management

### Hooks
- `src/hooks/useParquetSchema.ts` - Load schema metadata for multiple files
- `src/hooks/useData.ts` - Convenient typed access to selection state

### Components
- `src/components/JsonViewer.tsx` - Pretty JSON viewer with syntax highlighting
- `src/components/Inspector.tsx` - Enhanced inspector with metadata display

### Documentation & Examples
- `DATA_SELECTION.md` - Complete system documentation
- `src/examples/parquet-wasm-usage.tsx` - ParquetWasm usage examples
- `src/examples/data-selection-usage.tsx` - Selection system examples

## Modified Files

### Configuration
- `vite.config.ts` - Added WASM MIME type plugin and CORS headers

### Components
- `src/App.tsx` - Added ParquetWasmProvider and DataSelectionProvider
- `src/components/Sidebar.tsx` - Integrated file/column selection handlers
- `src/components/UnifiedFileTree.tsx` - Added onSelectFile callback

### Dependencies
- Added `apache-arrow` package for Arrow table operations

## Key Features

### 1. WASM Integration
```tsx
const { isInitialized, readSchema, readTable } = useParquetWasm()
```
- Automatic WASM initialization on app load
- Read parquet schema and full table data
- Error handling and loading states

### 2. File Selection
```tsx
const { selectFile } = useDataSelection()
await selectFile('/path/to/file.parquet')
```
- Click any file in the tree to load metadata
- Reads full schema and row counts
- Displays in Inspector panel

### 3. Column Selection
```tsx
const { selectColumn } = useDataSelection()
selectColumn('/path/to/file.parquet', 'columnName')
```
- Click any column to view its details
- Shows type, nullable, field metadata
- Pretty JSON display

### 4. Inspector Panel
- **File View**: Shows row count, column count, file size, full schema
- **Column View**: Shows type, nullable, field details
- **JSON Viewer**: Syntax-highlighted, color-coded metadata display
- **Loading States**: Spinner and loading messages
- **Empty State**: Friendly message when nothing selected

### 5. Type Safety
- Full TypeScript support
- Discriminated unions for file/column selections
- Typed hooks with helper methods

## How It Works

### Provider Hierarchy
```
AppProvider
  └─ ParquetWasmProvider (WASM init)
      └─ FileSystemProvider (file access)
          └─ DataSelectionProvider (selection state)
              └─ App Components
```

### Selection Flow
1. User clicks file in `UnifiedFileTree`
2. `Sidebar` calls `selectFile(filePath)`
3. `DataSelectionContext` loads file from FileSystem API
4. `ParquetWasm` reads schema and table
5. Metadata extracted and stored in selection state
6. `Inspector` displays metadata with `JsonViewer`

### Data Flow Diagram
```
FileSystemAPI → Uint8Array → ParquetWasm → Arrow Table → Schema
                                                          ↓
                                                    Metadata
                                                          ↓
                                              SelectionContext
                                                          ↓
                                                     Inspector
                                                          ↓
                                                    JsonViewer
```

## Usage Quick Start

### 1. Select a File
```tsx
import { useDataSelection } from '@/contexts/DataSelectionContext'

const { selectFile } = useDataSelection()
await selectFile('/logs/flight-data.parquet')
```

### 2. View Selection
```tsx
import { useData } from '@/hooks/useData'

const { isFile, fileSelection } = useData()
if (isFile && fileSelection) {
  console.log(`Rows: ${fileSelection.metadata?.numRows}`)
  console.log(`Columns: ${fileSelection.metadata?.numColumns}`)
}
```

### 3. Select a Column
```tsx
const { selectColumn } = useDataSelection()
selectColumn('/logs/flight-data.parquet', 'timestamp')
```

## Configuration Notes

### Vite Config
Added plugin to serve WASM with correct MIME type:
```ts
const wasmContentTypePlugin = {
  name: 'wasm-content-type-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm')
      }
      next()
    })
  },
}
```

Added CORS headers for SharedArrayBuffer support:
```ts
server: {
  headers: {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  },
}
```

## Testing the System

1. Start dev server: `bun run dev`
2. Open a folder with `.parquet` files
3. Click on any file in the sidebar
4. See metadata in the Inspector (right panel)
5. Click on any column name
6. See column details in Inspector

## Future Enhancements

- [ ] Column data preview (first N rows)
- [ ] Statistics (min, max, avg for numeric columns)
- [ ] Multi-column selection
- [ ] Export selected data
- [ ] Search within column values
- [ ] Column filtering and sorting

## Troubleshooting

### WASM Not Loading
- Check browser console for MIME type errors
- Ensure Vite dev server is running
- Check `isInitialized` state in ParquetWasmContext

### File Selection Not Working
- Ensure FileSystem API permissions granted
- Check file is actually a .parquet file
- Look for errors in DataSelectionContext logs

### Metadata Not Showing
- Check if file loaded successfully
- Ensure selection state is updated
- Verify Inspector is receiving selection prop

## Console Logging

All major operations log to console with prefixes:
- `[ParquetWasm]` - WASM initialization and operations
- `[DataSelection]` - Selection state changes
- `[Sidebar]` - UI interactions
- `[useParquetSchema]` - Schema loading

Enable verbose logging to debug issues.
