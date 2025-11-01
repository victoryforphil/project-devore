import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { FileSystemItem } from '@/types'

// Re-export for backward compatibility
export type { FileSystemItem }

interface FileSystemContextValue {
  selectedFiles: FileSystemItem[]
  isLoading: boolean
  error: string | null
  selectFilesOrFolder: () => Promise<void>
  clearSelection: () => void
  removeFile: (path: string) => void
}

const FileSystemContext = createContext<FileSystemContextValue | undefined>(undefined)

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const [selectedFiles, setSelectedFiles] = useState<FileSystemItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Recursively search a directory for .parquet files
   */
  const searchDirectoryForParquetFiles = useCallback(
    async (
      dirHandle: FileSystemDirectoryHandle,
      basePath = ''
    ): Promise<FileSystemItem[]> => {
      console.log(`[FileSystemContext] Searching directory: ${basePath || 'root'}`)
      const files: FileSystemItem[] = []

      try {
        for await (const [name, handle] of dirHandle.entries()) {
          const fullPath = basePath ? `${basePath}/${name}` : name

          if (handle.kind === 'file') {
            console.log(`[FileSystemContext] Found file: ${fullPath}`)
            // Check if it's a .parquet file
            if (name.toLowerCase().endsWith('.parquet')) {
              console.log(`[FileSystemContext] ✓ Parquet file found: ${fullPath}`)
              files.push({
                path: fullPath,
                name: name,
                isDirectory: false,
                handle: handle as FileSystemFileHandle,
              })
            } else {
              console.log(`[FileSystemContext] ✗ Skipping non-parquet file: ${fullPath}`)
            }
          } else if (handle.kind === 'directory') {
            console.log(`[FileSystemContext] Found directory: ${fullPath}, recursing...`)
            // Recursively search subdirectory
            const subFiles = await searchDirectoryForParquetFiles(
              handle as FileSystemDirectoryHandle,
              fullPath
            )
            console.log(`[FileSystemContext] Directory ${fullPath} returned ${subFiles.length} files`)
            files.push(...subFiles)
          }
        }
      } catch (err) {
        console.error(`[FileSystemContext] Error searching directory ${basePath}:`, err)
      }

      console.log(`[FileSystemContext] Total files found in ${basePath || 'root'}: ${files.length}`)
      return files
    },
    []
  )

  /**
   * Open file/folder picker and select parquet files
   */
  const selectFilesOrFolder = useCallback(async () => {
    console.log('[FileSystemContext] selectFilesOrFolder called')
    setIsLoading(true)
    setError(null)

    try {
      // Try directory picker first, fall back to file picker
      let handles: FileSystemHandle[] = []
      
      try {
        console.log('[FileSystemContext] Attempting to open directory picker...')
        // Try to open directory picker
        const dirHandle = await (window as any).showDirectoryPicker()
        console.log('[FileSystemContext] Directory picker opened:', dirHandle.name)
        handles = [dirHandle]
      } catch (err: any) {
        console.log('[FileSystemContext] Directory picker error:', err.name, err.message)
        // If directory picker fails, try file picker
        if (err.name !== 'AbortError') {
          try {
            console.log('[FileSystemContext] Falling back to file picker...')
            handles = await (window as any).showOpenFilePicker({
              types: [
                {
                  description: 'Parquet Files',
                  accept: { 'application/octet-stream': ['.parquet'] },
                },
                {
                  description: 'All Files',
                  accept: { '*/*': [] },
                },
              ],
              multiple: true,
            })
            console.log('[FileSystemContext] File picker returned', handles.length, 'handles')
          } catch (fileErr: any) {
            console.log('[FileSystemContext] File picker error:', fileErr.name, fileErr.message)
            if (fileErr.name !== 'AbortError') {
              throw fileErr
            }
            return
          }
        } else {
          console.log('[FileSystemContext] User cancelled picker')
          return
        }
      }

      console.log('[FileSystemContext] Processing', handles.length, 'handle(s)')
      const newFiles: FileSystemItem[] = []

      for (const handle of handles) {
        console.log('[FileSystemContext] Handle type:', handle.kind, 'name:', (handle as any).name)
        if (handle.kind === 'file') {
          // Single file selected
          console.log('[FileSystemContext] Processing file:', (handle as any).name)
          if ((handle as any).name.toLowerCase().endsWith('.parquet')) {
            console.log('[FileSystemContext] Adding parquet file:', (handle as any).name)
            newFiles.push({
              path: (handle as any).name,
              name: (handle as any).name,
              isDirectory: false,
              handle: handle as FileSystemFileHandle,
            })
          } else {
            console.log('[FileSystemContext] Skipping non-parquet file:', (handle as any).name)
          }
        } else if (handle.kind === 'directory') {
          // Folder selected - recursively search for parquet files
          console.log('[FileSystemContext] Processing directory:', (handle as any).name)
          const parquetFiles = await searchDirectoryForParquetFiles(
            handle as FileSystemDirectoryHandle,
            (handle as any).name
          )
          console.log('[FileSystemContext] Directory search returned', parquetFiles.length, 'parquet files')
          newFiles.push(...parquetFiles)
        }
      }

      console.log('[FileSystemContext] Total new files collected:', newFiles.length)
      if (newFiles.length === 0) {
        console.warn('[FileSystemContext] No parquet files found')
        setError('No .parquet files found')
        setIsLoading(false)
        return
      }

      // Add new files to existing selection (avoid duplicates)
      setSelectedFiles((prev) => {
        const existing = new Set(prev.map((f) => f.path))
        const filtered = newFiles.filter((f) => !existing.has(f.path))
        console.log('[FileSystemContext] Adding', filtered.length, 'new files (', newFiles.length - filtered.length, 'duplicates)')
        console.log('[FileSystemContext] File paths:', filtered.map(f => f.path))
        const result = [...prev, ...filtered]
        console.log('[FileSystemContext] New selectedFiles state will have', result.length, 'files')
        return result
      })
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[FileSystemContext] File selection error:', err)
        setError(err.message || 'Failed to select files')
      }
    } finally {
      console.log('[FileSystemContext] selectFilesOrFolder complete')
      setIsLoading(false)
    }
  }, [searchDirectoryForParquetFiles])

  /**
   * Clear all selected files
   */
  const clearSelection = useCallback(() => {
    console.log('[FileSystemContext] Clearing selection')
    setSelectedFiles([])
    setError(null)
  }, [])

  /**
   * Remove a specific file from selection
   */
  const removeFile = useCallback((path: string) => {
    console.log('[FileSystemContext] Removing file:', path)
    setSelectedFiles((prev) => prev.filter((f) => f.path !== path))
  }, [])

  const value: FileSystemContextValue = {
    selectedFiles,
    isLoading,
    error,
    selectFilesOrFolder,
    clearSelection,
    removeFile,
  }

  console.log('[FileSystemContext] Providing state:', {
    filesCount: selectedFiles.length,
    isLoading,
    hasError: !!error
  })

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  )
}

export function useFileSystem() {
  const context = useContext(FileSystemContext)
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider')
  }
  return context
}
