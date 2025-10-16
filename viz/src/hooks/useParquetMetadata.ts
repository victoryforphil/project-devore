import { useState, useCallback } from 'react'

export interface ParquetColumn {
  name: string
  type: string
}

export interface ParquetFileMetadata {
  path: string
  name: string
  columns: ParquetColumn[]
}

export interface UseParquetMetadataResult {
  metadata: ParquetFileMetadata[]
  isLoading: boolean
  error: string | null
  loadMetadata: (files: any[]) => Promise<ParquetFileMetadata[]>
  clearMetadata: () => void
}

/**
 * Hook for loading parquet file metadata (columns, types)
 * Will extract column names from parquet files
 */
export function useParquetMetadata(): UseParquetMetadataResult {
  const [metadata, setMetadata] = useState<ParquetFileMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load metadata from parquet files
   * For now, creates mock column structure
   * In production, would use parquetjs to read actual columns
   */
  const loadMetadata = useCallback(async (files: any[]) => {
    console.log('[useParquetMetadata] loadMetadata called with', files.length, 'files')
    setIsLoading(true)
    setError(null)

    try {
      const newMetadata: ParquetFileMetadata[] = []

      for (const file of files) {
        console.log('[useParquetMetadata] Processing file:', file.path)
        // TODO: Use parquetjs to read actual columns
        // For now, create mock data
        const mockColumns: ParquetColumn[] = [
          { name: 'timestamp', type: 'int64' },
          { name: 'gps_lat', type: 'double' },
          { name: 'gps_lon', type: 'double' },
          { name: 'altitude', type: 'float' },
          { name: 'speed', type: 'float' },
          { name: 'heading', type: 'float' },
          { name: 'roll', type: 'float' },
          { name: 'pitch', type: 'float' },
          { name: 'yaw', type: 'float' },
        ]

        newMetadata.push({
          path: file.path,
          name: file.name,
          columns: mockColumns,
        })
      }

      console.log('[useParquetMetadata] Created metadata for', newMetadata.length, 'files')
      console.log('[useParquetMetadata] Setting metadata state...')
      setMetadata(newMetadata)
      console.log('[useParquetMetadata] Metadata state set, returning result')
      return newMetadata
    } catch (err: any) {
      console.error('[useParquetMetadata] Error loading metadata:', err)
      setError(err.message || 'Failed to load metadata')
      throw err
    } finally {
      console.log('[useParquetMetadata] Setting isLoading to false')
      setIsLoading(false)
    }
  }, [])

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
