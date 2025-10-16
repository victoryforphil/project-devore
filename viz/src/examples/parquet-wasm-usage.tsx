/**
 * ParquetWasm Usage Examples
 * 
 * This file demonstrates how to use the ParquetWasmProvider and related hooks
 */

import { useParquetWasm } from '@/contexts/ParquetWasmContext'
import { useParquetSchema } from '@/hooks/useParquetSchema'

// ============================================================================
// Example 1: Using the ParquetWasm context directly
// ============================================================================

export function ExampleDirectUsage() {
  const { isInitialized, readSchema, readTable } = useParquetWasm()

  const handleFileUpload = async (file: File) => {
    if (!isInitialized) {
      console.error('WASM not initialized')
      return
    }

    // Read file as Uint8Array
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Read schema only
    const schema = await readSchema(uint8Array)
    console.log('Schema fields:', schema.fields)

    // Or read full table with data
    const table = await readTable(uint8Array)
    console.log('Table:', table.numRows, 'rows,', table.numCols, 'columns')
    console.log('Column names:', table.schema.fields.map(f => f.name))
  }

  return null // Component JSX here
}

// ============================================================================
// Example 2: Using the useParquetSchema hook (recommended for file metadata)
// ============================================================================

export function ExampleSchemaHook() {
  const { metadata, loadMetadata, isLoading } = useParquetSchema()

  const handleLoadFiles = async (files: FileSystemItem[]) => {
    try {
      const result = await loadMetadata(files)
      console.log('Loaded metadata for', result.length, 'files')
      
      result.forEach(file => {
        console.log(`File: ${file.name}`)
        console.log(`Columns: ${file.columns.map(c => `${c.name}: ${c.type}`).join(', ')}`)
      })
    } catch (err) {
      console.error('Failed to load metadata:', err)
    }
  }

  return null // Component JSX here
}

// ============================================================================
// Example 3: Fetching remote parquet file (like the documentation example)
// ============================================================================

export async function exampleFetchRemoteFile() {
  // Note: You need to be within a component that has access to ParquetWasmContext
  // This is just to show the pattern
  
  const resp = await fetch("https://example.com/file.parquet")
  const parquetUint8Array = new Uint8Array(await resp.arrayBuffer())
  
  // Then use the hook/context to read it
  // const { readSchema, readTable } = useParquetWasm()
  // const schema = await readSchema(parquetUint8Array)
  // const table = await readTable(parquetUint8Array)
}

// ============================================================================
// Example 4: Working with FileSystemFileHandle
// ============================================================================

export async function exampleFileSystemHandle(handle: FileSystemFileHandle) {
  const file = await handle.getFile()
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // Then use the hook/context
  // const { readSchema } = useParquetWasm()
  // const schema = await readSchema(uint8Array)
  
  return uint8Array
}

// ============================================================================
// Type definitions (for reference)
// ============================================================================

interface FileSystemItem {
  path: string
  name: string
  isDirectory: boolean
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
}
