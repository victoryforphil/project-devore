/**
 * Data Selection System Usage Examples
 * 
 * Demonstrates how to use the data selection context and hooks
 */

import { useData } from '@/hooks/useData'
import { useDataSelection } from '@/contexts/DataSelectionContext'
import { Button } from '@/components/ui/button'
import { FileText, Columns3 } from 'lucide-react'

// ============================================================================
// Example 1: Simple file selector with current selection display
// ============================================================================

export function SimpleFileSelector() {
  const { selection, selectFile, isLoadingMetadata } = useDataSelection()

  const handleSelectFile = async () => {
    try {
      await selectFile('/path/to/your/file.parquet')
      console.log('File selected successfully')
    } catch (err) {
      console.error('Failed to select file:', err)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Button onClick={handleSelectFile} disabled={isLoadingMetadata}>
        {isLoadingMetadata ? 'Loading...' : 'Select File'}
      </Button>

      {selection && (
        <div className="p-4 border rounded">
          <pre>{JSON.stringify(selection, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Example 2: Using the useData hook for typed access
// ============================================================================

export function TypedSelectionDisplay() {
  const {
    isFile,
    isColumn,
    fileSelection,
    columnSelection,
    getSelectedFileName,
    getSelectedColumnName,
  } = useData()

  if (isFile && fileSelection) {
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h3 className="font-semibold">{fileSelection.fileName}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {fileSelection.metadata?.numRows?.toLocaleString()} rows
        </p>
        <p className="text-sm text-muted-foreground">
          {fileSelection.metadata?.numColumns} columns
        </p>
      </div>
    )
  }

  if (isColumn && columnSelection) {
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Columns3 className="h-4 w-4" />
          <h3 className="font-semibold">{columnSelection.columnName}</h3>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {columnSelection.columnType}
        </p>
        <p className="text-sm text-muted-foreground">
          From: {getSelectedFileName()}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 text-muted-foreground">
      No selection
    </div>
  )
}

// ============================================================================
// Example 3: Column selector with metadata display
// ============================================================================

export function ColumnSelector() {
  const { selectColumn, selection } = useDataSelection()

  const columns = [
    { name: 'timestamp', type: 'int64' },
    { name: 'latitude', type: 'double' },
    { name: 'longitude', type: 'double' },
    { name: 'altitude', type: 'float' },
  ]

  return (
    <div className="p-4 space-y-2">
      <h3 className="font-semibold mb-4">Select a column:</h3>
      
      {columns.map((col) => (
        <button
          key={col.name}
          onClick={() => selectColumn('/path/to/file.parquet', col.name)}
          className="w-full text-left p-2 rounded hover:bg-accent transition-colors flex items-center gap-2"
        >
          <Columns3 className="h-4 w-4" />
          <span className="flex-1">{col.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{col.type}</span>
        </button>
      ))}

      {selection?.type === 'column' && (
        <div className="mt-4 p-3 bg-accent/50 rounded">
          <p className="text-sm">
            Selected: <strong>{selection.columnName}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Example 4: File metadata viewer
// ============================================================================

export function FileMetadataViewer() {
  const { isFile, fileSelection } = useData()

  if (!isFile || !fileSelection?.metadata) {
    return <div className="p-4">No file selected</div>
  }

  const { metadata } = fileSelection

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">{fileSelection.fileName}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Rows</p>
          <p className="text-lg font-bold">{metadata.numRows?.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Columns</p>
          <p className="text-lg font-bold">{metadata.numColumns}</p>
        </div>
      </div>

      {metadata.schema && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Schema Fields</p>
          <ul className="space-y-1">
            {metadata.schema.fields.map((field) => (
              <li key={field.name} className="text-sm font-mono">
                {field.name}: {field.type.toString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Example 5: Selection state management
// ============================================================================

export function SelectionManager() {
  const { selection, clearSelection, error, isLoadingMetadata } = useDataSelection()

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Current Selection</h3>
        {selection && (
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear
          </Button>
        )}
      </div>

      {isLoadingMetadata && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <p className="text-sm">Loading metadata...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {selection && !isLoadingMetadata && (
        <div className="p-4 bg-accent/50 rounded">
          <p className="text-sm mb-2">
            <strong>Type:</strong> {selection.type}
          </p>
          {selection.type === 'file' && (
            <>
              <p className="text-sm mb-2">
                <strong>File:</strong> {selection.fileName}
              </p>
              <p className="text-sm">
                <strong>Path:</strong> {selection.filePath}
              </p>
            </>
          )}
          {selection.type === 'column' && (
            <>
              <p className="text-sm mb-2">
                <strong>Column:</strong> {selection.columnName}
              </p>
              <p className="text-sm">
                <strong>Type:</strong> {selection.columnType}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
