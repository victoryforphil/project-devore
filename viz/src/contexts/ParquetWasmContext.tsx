import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import initWasm, { readSchema, readParquet } from 'parquet-wasm'
import { tableFromIPC } from 'apache-arrow'
import type { Table, Schema } from 'apache-arrow'

interface ParquetWasmContextValue {
  isInitialized: boolean
  isInitializing: boolean
  error: string | null
  readSchema: (data: Uint8Array) => Promise<Schema>
  readTable: (data: Uint8Array) => Promise<Table>
}

const ParquetWasmContext = createContext<ParquetWasmContextValue | undefined>(undefined)

export function ParquetWasmProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize WASM on mount
  useEffect(() => {
    let mounted = true

    const initializeWasm = async () => {
      if (isInitialized || isInitializing) return

      console.log('[ParquetWasm] Initializing WebAssembly context...')
      setIsInitializing(true)
      setError(null)

      try {
        await initWasm()
        
        if (mounted) {
          console.log('[ParquetWasm] ✓ WebAssembly initialized successfully')
          setIsInitialized(true)
          setIsInitializing(false)
        }
      } catch (err: any) {
        console.error('[ParquetWasm] ✗ Failed to initialize WebAssembly:', err)
        
        if (mounted) {
          setError(err.message || 'Failed to initialize WebAssembly')
          setIsInitializing(false)
        }
      }
    }

    initializeWasm()

    return () => {
      mounted = false
    }
  }, [])

  /**
   * Read schema from a parquet file
   */
  const readSchemaFromData = useCallback(
    async (data: Uint8Array): Promise<Schema> => {
      if (!isInitialized) {
        throw new Error('ParquetWasm is not initialized')
      }

      console.log('[ParquetWasm] Reading schema from parquet data...')

      try {
        const arrowWasmSchema = readSchema(data)
        const arrowTable = tableFromIPC(arrowWasmSchema.intoIPCStream())
        const arrowSchema = arrowTable.schema

        console.log('[ParquetWasm] ✓ Schema read successfully:', arrowSchema.fields.length, 'fields')
        return arrowSchema
      } catch (err: any) {
        console.error('[ParquetWasm] ✗ Failed to read schema:', err)
        throw new Error(`Failed to read schema: ${err.message}`)
      }
    },
    [isInitialized]
  )

  /**
   * Read full table from a parquet file
   */
  const readTableFromData = useCallback(
    async (data: Uint8Array): Promise<Table> => {
      if (!isInitialized) {
        throw new Error('ParquetWasm is not initialized')
      }

      console.log('[ParquetWasm] Reading table from parquet data...')

      try {
        const arrowWasmTable = readParquet(data)
        const arrowTable = tableFromIPC(arrowWasmTable.intoIPCStream())

        console.log('[ParquetWasm] ✓ Table read successfully:', arrowTable.numRows, 'rows,', arrowTable.numCols, 'columns')
        return arrowTable
      } catch (err: any) {
        console.error('[ParquetWasm] ✗ Failed to read table:', err)
        throw new Error(`Failed to read table: ${err.message}`)
      }
    },
    [isInitialized]
  )

  const value: ParquetWasmContextValue = {
    isInitialized,
    isInitializing,
    error,
    readSchema: readSchemaFromData,
    readTable: readTableFromData,
  }

  return (
    <ParquetWasmContext.Provider value={value}>
      {children}
    </ParquetWasmContext.Provider>
  )
}

/**
 * Hook to access ParquetWasm context
 */
export function useParquetWasm() {
  const context = useContext(ParquetWasmContext)
  
  if (context === undefined) {
    throw new Error('useParquetWasm must be used within a ParquetWasmProvider')
  }
  
  return context
}
