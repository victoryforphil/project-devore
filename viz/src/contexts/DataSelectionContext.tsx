import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Schema, Field } from 'apache-arrow'
import { useParquetWasm } from './ParquetWasmContext'
import { useFileSystem } from './FileSystemContext'
import type {
  SelectionType,
  FileSelection,
  ColumnSelection,
  SelectedColumn,
  MultiColumnSelection,
  AxisMapping,
  ParquetFileMetadata,
  ParquetColumnMetadata,
  Selection
} from '@/types'

// Re-export types for backward compatibility
export type {
  SelectionType,
  FileSelection,
  ColumnSelection,
  SelectedColumn,
  MultiColumnSelection,
  AxisMapping,
  ParquetFileMetadata,
  ParquetColumnMetadata,
  Selection
}

interface DataSelectionContextValue {
  selection: Selection
  isLoadingMetadata: boolean
  error: string | null
  selectFile: (filePath: string) => Promise<void>
  selectColumn: (filePath: string, columnName: string) => void
  addColumnToSelection: (filePath: string, columnName: string) => void
  removeColumnFromSelection: (filePath: string, columnName: string) => void
  toggleColumnVisibility: (filePath: string, columnName: string) => void
  setAxisMapping: (axis: 'x' | 'y' | 'z' | 'scale', value: string | number | null) => void
  clearSelection: () => void
}

const DataSelectionContext = createContext<DataSelectionContextValue | undefined>(undefined)

export function DataSelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { readSchema, readTable, isInitialized } = useParquetWasm()
  const { selectedFiles } = useFileSystem()

  /**
   * Select a parquet file and load its metadata
   */
  const selectFile = useCallback(
    async (filePath: string) => {
      console.log('[DataSelection] Selecting file:', filePath)
      
      if (!isInitialized) {
        console.error('[DataSelection] ParquetWasm not initialized')
        setError('ParquetWasm is not initialized')
        return
      }

      setIsLoadingMetadata(true)
      setError(null)

      try {
        // Find the file in selectedFiles
        const fileItem = selectedFiles.find((f) => f.path === filePath)
        
        if (!fileItem) {
          throw new Error(`File not found: ${filePath}`)
        }

        // Read file as Uint8Array
        const fileHandle = fileItem.handle as FileSystemFileHandle
        const fileObj = await fileHandle.getFile()
        const arrayBuffer = await fileObj.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        console.log('[DataSelection] Reading schema for file:', filePath)
        
        // Read schema
        const schema = await readSchema(uint8Array)
        
        // Read full table to get row count and more detailed metadata
        console.log('[DataSelection] Reading table for metadata...')
        const table = await readTable(uint8Array)

        // Extract metadata
        const columns: ParquetColumnMetadata[] = schema.fields.map((field) => ({
          name: field.name,
          type: field.type.toString(),
          field: field,
          nullable: field.nullable,
          metadata: field.metadata,
        }))

        const metadata: ParquetFileMetadata = {
          path: filePath,
          name: fileItem.name,
          numRows: table.numRows,
          numColumns: table.numCols,
          fileSize: uint8Array.length,
          schema: schema,
          columns: columns,
          rawMetadata: {
            fields: columns.map(col => ({
              name: col.name,
              type: col.type,
              nullable: col.nullable,
            })),
            schemaMetadata: schema.metadata,
          },
        }

        console.log('[DataSelection] ✓ File metadata loaded:', metadata)

        // Set selection
        const fileSelection: FileSelection = {
          type: 'file',
          filePath,
          fileName: fileItem.name,
          schema,
          metadata,
        }

        setSelection(fileSelection)
      } catch (err: any) {
        console.error('[DataSelection] Failed to load file metadata:', err)
        setError(err.message || 'Failed to load file metadata')
      } finally {
        setIsLoadingMetadata(false)
      }
    },
    [readSchema, readTable, isInitialized, selectedFiles]
  )

  /**
   * Select a column from a parquet file (single selection, replaces current)
   */
  const selectColumn = useCallback(
    (filePath: string, columnName: string) => {
      console.log('[DataSelection] Selecting column:', columnName, 'from', filePath)

      // If we already have the file loaded, get the schema from it
      let schema: Schema | undefined
      let fileMetadata: ParquetFileMetadata | undefined

      if (selection?.type === 'file' && selection.filePath === filePath) {
        schema = selection.schema
        fileMetadata = selection.metadata
      }

      // Find the field in the schema
      const field = schema?.fields.find((f) => f.name === columnName)

      const columnSelection: ColumnSelection = {
        type: 'column',
        filePath,
        columnName,
        columnType: field?.type.toString() || 'unknown',
        field,
        fileMetadata,
      }

      setSelection(columnSelection)
    },
    [selection]
  )

  /**
   * Add a column to multi-selection (creates multi-selection or adds to existing)
   */
  const addColumnToSelection = useCallback(
    (filePath: string, columnName: string) => {
      console.log('[DataSelection] Adding column to selection:', columnName, 'from', filePath)

      // Get schema and metadata
      let schema: Schema | undefined
      let fileMetadata: ParquetFileMetadata | undefined

      if (selection?.type === 'file' && selection.filePath === filePath) {
        schema = selection.schema
        fileMetadata = selection.metadata
      } else if (selection?.type === 'columns' && selection.columns.length > 0) {
        fileMetadata = selection.fileMetadata
      }

      const field = schema?.fields.find((f) => f.name === columnName)

      const newColumn: SelectedColumn = {
        filePath,
        columnName,
        columnType: field?.type.toString() || 'unknown',
        field,
        visible: true,
      }

      if (!selection || selection.type === 'file') {
        // Create new multi-selection with this column
        const multiSelection: MultiColumnSelection = {
          type: 'columns',
          columns: [newColumn],
          fileMetadata,
          axisMapping: { x: columnName, y: null, z: null, scale: 1 }, // Auto-assign to X
        }
        setSelection(multiSelection)
      } else if (selection.type === 'column') {
        // Convert single column to multi-selection
        const existingColumn: SelectedColumn = {
          filePath: selection.filePath,
          columnName: selection.columnName,
          columnType: selection.columnType,
          field: selection.field,
          visible: true,
        }
        const multiSelection: MultiColumnSelection = {
          type: 'columns',
          columns: [existingColumn, newColumn],
          fileMetadata: selection.fileMetadata || fileMetadata,
          axisMapping: { x: existingColumn.columnName, y: columnName, z: null, scale: 1 }, // Auto-assign
        }
        setSelection(multiSelection)
      } else if (selection.type === 'columns') {
        // Add to existing multi-selection
        const exists = selection.columns.some(
          (col) => col.filePath === filePath && col.columnName === columnName
        )
        if (!exists) {
          const newColumns = [...selection.columns, newColumn]
          const currentMapping = selection.axisMapping || { x: null, y: null, z: null, scale: 1 }
          
          // Auto-assign to next available axis
          let newMapping = { ...currentMapping }
          if (!currentMapping.x) newMapping.x = columnName
          else if (!currentMapping.y) newMapping.y = columnName
          else if (!currentMapping.z) newMapping.z = columnName

          const multiSelection: MultiColumnSelection = {
            ...selection,
            columns: newColumns,
            axisMapping: newMapping,
          }
          setSelection(multiSelection)
        }
      }
    },
    [selection]
  )

  /**
   * Remove a column from multi-selection
   */
  const removeColumnFromSelection = useCallback(
    (filePath: string, columnName: string) => {
      console.log('[DataSelection] Removing column from selection:', columnName, 'from', filePath)

      if (selection?.type === 'columns') {
        const filteredColumns = selection.columns.filter(
          (col) => !(col.filePath === filePath && col.columnName === columnName)
        )

        if (filteredColumns.length === 0) {
          // No columns left, clear selection
          setSelection(null)
        } else if (filteredColumns.length === 1) {
          // Only one column left, convert back to single selection
          const col = filteredColumns[0]
          const columnSelection: ColumnSelection = {
            type: 'column',
            filePath: col.filePath,
            columnName: col.columnName,
            columnType: col.columnType,
            field: col.field,
            fileMetadata: selection.fileMetadata,
          }
          setSelection(columnSelection)
        } else {
          // Update multi-selection
          const multiSelection: MultiColumnSelection = {
            ...selection,
            columns: filteredColumns,
          }
          setSelection(multiSelection)
        }
      }
    },
    [selection]
  )

  /**
   * Toggle visibility of a column in the plot
   */
  const toggleColumnVisibility = useCallback(
    (filePath: string, columnName: string) => {
      console.log('[DataSelection] Toggling visibility for:', columnName)

      if (selection?.type === 'columns') {
        const updatedColumns = selection.columns.map((col) =>
          col.filePath === filePath && col.columnName === columnName
            ? { ...col, visible: !col.visible }
            : col
        )

        const multiSelection: MultiColumnSelection = {
          ...selection,
          columns: updatedColumns,
        }
        setSelection(multiSelection)
      }
    },
    [selection]
  )

  /**
   * Set axis mapping for 3D visualization
   */
  const setAxisMapping = useCallback(
    (axis: 'x' | 'y' | 'z' | 'scale', value: string | number | null) => {
      console.log('[DataSelection] Setting axis mapping:', axis, '=', value)

      if (selection?.type === 'columns') {
        const currentMapping = selection.axisMapping || { x: null, y: null, z: null, scale: 1 }
        const newMapping: AxisMapping = {
          ...currentMapping,
          [axis]: value,
        }

        const multiSelection: MultiColumnSelection = {
          ...selection,
          axisMapping: newMapping,
        }
        setSelection(multiSelection)
      }
    },
    [selection]
  )

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    console.log('[DataSelection] Clearing selection')
    setSelection(null)
    setError(null)
  }, [])

  const value: DataSelectionContextValue = {
    selection,
    isLoadingMetadata,
    error,
    selectFile,
    selectColumn,
    addColumnToSelection,
    removeColumnFromSelection,
    toggleColumnVisibility,
    setAxisMapping,
    clearSelection,
  }

  return (
    <DataSelectionContext.Provider value={value}>
      {children}
    </DataSelectionContext.Provider>
  )
}

/**
 * Hook to access data selection context
 */
export function useDataSelection() {
  const context = useContext(DataSelectionContext)
  
  if (context === undefined) {
    throw new Error('useDataSelection must be used within a DataSelectionProvider')
  }
  
  return context
}
