import { useCallback } from 'react'
import { create } from 'zustand'

export interface FileSystemItem {
  path: string
  name: string
  isDirectory: boolean
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
}

interface FileSystemState {
  selectedFiles: FileSystemItem[]
  isLoading: boolean
  error: string | null
  setSelectedFiles: (files: FileSystemItem[] | ((prev: FileSystemItem[]) => FileSystemItem[])) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const useFileSystemStore = create<FileSystemState>((set) => ({
  selectedFiles: [],
  isLoading: false,
  error: null,
  setSelectedFiles: (files) => {
    if (typeof files === 'function') {
      set((state) => ({ selectedFiles: files(state.selectedFiles) }))
    } else {
      set({ selectedFiles: files })
    }
  },
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))

export interface UseFileSystemResult {
  selectedFiles: FileSystemItem[]
  isLoading: boolean
  error: string | null
  selectFilesOrFolder: () => Promise<void>
  clearSelection: () => void
  removeFile: (path: string) => void
}

/**
 * Hook for selecting files/folders using the Web FileSystem API
 * Automatically filters for .parquet files and recursively searches subdirectories
 */
export function useFileSystem(): UseFileSystemResult {
  const { selectedFiles, isLoading, error, setSelectedFiles, setIsLoading, setError } = useFileSystemStore()

  /**
   * Recursively search a directory for .parquet files
   */
  const searchDirectoryForParquetFiles = useCallback(
    async (
      dirHandle: FileSystemDirectoryHandle,
      basePath = ''
    ): Promise<FileSystemItem[]> => {
      console.log(`[useFileSystem] Searching directory: ${basePath || 'root'}`)
      const files: FileSystemItem[] = []

      try {
        for await (const [name, handle] of dirHandle.entries()) {
          const fullPath = basePath ? `${basePath}/${name}` : name

          if (handle.kind === 'file') {
            console.log(`[useFileSystem] Found file: ${fullPath}`)
            // Check if it's a .parquet file
            if (name.toLowerCase().endsWith('.parquet')) {
              console.log(`[useFileSystem] ✓ Parquet file found: ${fullPath}`)
              files.push({
                path: fullPath,
                name: name,
                isDirectory: false,
                handle: handle as FileSystemFileHandle,
              })
            } else {
              console.log(`[useFileSystem] ✗ Skipping non-parquet file: ${fullPath}`)
            }
          } else if (handle.kind === 'directory') {
            console.log(`[useFileSystem] Found directory: ${fullPath}, recursing...`)
            // Recursively search subdirectory
            const subFiles = await searchDirectoryForParquetFiles(
              handle as FileSystemDirectoryHandle,
              fullPath
            )
            console.log(`[useFileSystem] Directory ${fullPath} returned ${subFiles.length} files`)
            files.push(...subFiles)
          }
        }
      } catch (err) {
        console.error(`[useFileSystem] Error searching directory ${basePath}:`, err)
      }

      console.log(`[useFileSystem] Total files found in ${basePath || 'root'}: ${files.length}`)
      return files
    },
    []
  )

  /**
   * Open file/folder picker and select parquet files
   */
  const selectFilesOrFolder = useCallback(async () => {
    console.log('[useFileSystem] selectFilesOrFolder called')
    setIsLoading(true)
    setError(null)

    try {
      // Try directory picker first, fall back to file picker
      let handles: FileSystemHandle[] = []
      
      try {
        console.log('[useFileSystem] Attempting to open directory picker...')
        // Try to open directory picker
        const dirHandle = await (window as any).showDirectoryPicker()
        console.log('[useFileSystem] Directory picker opened:', dirHandle.name)
        handles = [dirHandle]
      } catch (err: any) {
        console.log('[useFileSystem] Directory picker error:', err.name, err.message)
        // If directory picker fails, try file picker
        if (err.name !== 'AbortError') {
          try {
            console.log('[useFileSystem] Falling back to file picker...')
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
            console.log('[useFileSystem] File picker returned', handles.length, 'handles')
          } catch (fileErr: any) {
            console.log('[useFileSystem] File picker error:', fileErr.name, fileErr.message)
            if (fileErr.name !== 'AbortError') {
              throw fileErr
            }
            return
          }
        } else {
          console.log('[useFileSystem] User cancelled picker')
          return
        }
      }

      console.log('[useFileSystem] Processing', handles.length, 'handle(s)')
      const newFiles: FileSystemItem[] = []

      for (const handle of handles) {
        console.log('[useFileSystem] Handle type:', handle.kind, 'name:', (handle as any).name)
        if (handle.kind === 'file') {
          // Single file selected
          console.log('[useFileSystem] Processing file:', (handle as any).name)
          if ((handle as any).name.toLowerCase().endsWith('.parquet')) {
            console.log('[useFileSystem] Adding parquet file:', (handle as any).name)
            newFiles.push({
              path: (handle as any).name,
              name: (handle as any).name,
              isDirectory: false,
              handle: handle as FileSystemFileHandle,
            })
          } else {
            console.log('[useFileSystem] Skipping non-parquet file:', (handle as any).name)
          }
        } else if (handle.kind === 'directory') {
          // Folder selected - recursively search for parquet files
          console.log('[useFileSystem] Processing directory:', (handle as any).name)
          const parquetFiles = await searchDirectoryForParquetFiles(
            handle as FileSystemDirectoryHandle,
            (handle as any).name
          )
          console.log('[useFileSystem] Directory search returned', parquetFiles.length, 'parquet files')
          newFiles.push(...parquetFiles)
        }
      }

      console.log('[useFileSystem] Total new files collected:', newFiles.length)
      if (newFiles.length === 0) {
        console.warn('[useFileSystem] No parquet files found')
        setError('No .parquet files found')
        setIsLoading(false)
        return
      }

      // Add new files to existing selection (avoid duplicates)
      setSelectedFiles((prev) => {
        const existing = new Set(prev.map((f) => f.path))
        const filtered = newFiles.filter((f) => !existing.has(f.path))
        console.log('[useFileSystem] Adding', filtered.length, 'new files (', newFiles.length - filtered.length, 'duplicates)')
        console.log('[useFileSystem] File paths:', filtered.map(f => f.path))
        return [...prev, ...filtered]
      })
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[useFileSystem] File selection error:', err)
        setError(err.message || 'Failed to select files')
      }
    } finally {
      console.log('[useFileSystem] selectFilesOrFolder complete')
      setIsLoading(false)
    }
  }, [searchDirectoryForParquetFiles])

  /**
   * Clear all selected files
   */
  const clearSelection = useCallback(() => {
    setSelectedFiles([])
    setError(null)
  }, [])

  /**
   * Remove a specific file from selection
   */
  const removeFile = useCallback((path: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.path !== path))
  }, [])

  return {
    selectedFiles,
    isLoading,
    error,
    selectFilesOrFolder,
    clearSelection,
    removeFile,
  }
}
