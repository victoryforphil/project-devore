import { useState, useCallback } from 'react'
import { useParquetWasm } from '@/contexts/ParquetWasmContext'
import type { Schema } from 'apache-arrow'

export interface ParquetColumn {
  name: string
  type: string
}

export interface ParquetFileMetadata {
  path: string
  name: string
  columns: ParquetColumn[]
  schema?: Schema
}

export interface UseParquetSchemaResult {
  metadata: ParquetFileMetadata[]
  isLoading: boolean
  error: string | null
  loadMetadata: (files: any[]) => Promise<ParquetFileMetadata[]>
  clearMetadata: () => void
}

/**
 * Hook for loading parquet file schemas using parquet-wasm
 * Reads actual schema from parquet files using WebAssembly
 */
export function useParquetSchema(): UseParquetSchemaResult {
  const [metadata, setMetadata] = useState<ParquetFileMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { readSchema, isInitialized } = useParquetWasm()

  /**
   * Load metadata from parquet files using parquet-wasm
   */
  const loadMetadata = useCallback(
    async (files: any[]) => {
      console.log('[useParquetSchema] loadMetadata called with', files.length, 'files')

      if (!isInitialized) {
        const err = 'ParquetWasm is not initialized'
        console.error('[useParquetSchema]', err)
        setError(err)
        throw new Error(err)
      }

      setIsLoading(true)
      setError(null)

      try {
        const newMetadata: ParquetFileMetadata[] = []

        for (const file of files) {
          console.log('[useParquetSchema] Processing file:', file.path)

          try {
            // Read file as Uint8Array
            const fileHandle = file.handle as FileSystemFileHandle
            const fileObj = await fileHandle.getFile()
            const arrayBuffer = await fileObj.arrayBuffer()
            const uint8Array = new Uint8Array(arrayBuffer)

            console.log('[useParquetSchema] File size:', uint8Array.length, 'bytes')

            // Read schema using parquet-wasm
            const schema = await readSchema(uint8Array)

            // Convert schema fields to column metadata
            const columns: ParquetColumn[] = schema.fields.map((field) => ({
              name: field.name,
              type: field.type.toString(),
            }))

            console.log('[useParquetSchema] ✓ Loaded schema with', columns.length, 'columns')

            newMetadata.push({
              path: file.path,
              name: file.name,
              columns,
              schema,
            })
          } catch (err: any) {
            console.error('[useParquetSchema] ✗ Failed to process file:', file.path, err)
            // Continue processing other files even if one fails
            throw new Error(`Failed to read ${file.name}: ${err.message}`)
          }
        }

        console.log('[useParquetSchema] Created metadata for', newMetadata.length, 'files')
        setMetadata(newMetadata)
        return newMetadata
      } catch (err: any) {
        console.error('[useParquetSchema] Error loading metadata:', err)
        setError(err.message || 'Failed to load metadata')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [readSchema, isInitialized]
  )

  const clearMetadata = useCallback(() => {
    setMetadata([])
    setError(null)
  }, [])

  return {
    metadata,
    isLoading,
    error,
    loadMetadata,
    clearMetadata,
  }
}
