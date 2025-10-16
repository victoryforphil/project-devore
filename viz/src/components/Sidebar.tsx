import { useEffect } from "react"
import { UnifiedFileTree } from "./UnifiedFileTree"
import { useFileSystem } from "@/contexts/FileSystemContext"
import { useParquetMetadata } from "@/hooks/useParquetMetadata"
import { useToast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { FolderOpen } from "lucide-react"

export function Sidebar() {
  const { selectedFiles, removeFile, clearSelection, selectFilesOrFolder } = useFileSystem()
  const { metadata, loadMetadata, isLoading } = useParquetMetadata()
  const { success, error: showError, info } = useToast()

  console.log('[Sidebar] Render - selectedFiles:', selectedFiles.length, 'metadata:', metadata.length, 'isLoading:', isLoading)

  // Load metadata when files change
  useEffect(() => {
    if (selectedFiles.length > 0) {
      console.log('[Sidebar] Loading metadata for files:', selectedFiles.map(f => f.path))
      info(`Reading ${selectedFiles.length} parquet file(s)...`)
      loadMetadata(selectedFiles).then((result) => {
        const totalColumns = result.reduce((sum, f) => sum + f.columns.length, 0)
        console.log('[Sidebar] Metadata loaded successfully:', result.length, 'files with', totalColumns, 'total columns')
        success(`✓ Loaded ${selectedFiles.length} file(s) with ${totalColumns} columns`)
      }).catch((err) => {
        console.error('[Sidebar] Failed to load metadata:', err)
        showError(`Failed to load files: ${err.message}`)
      })
    }
  }, [selectedFiles])

  const handleSelectColumn = (_filePath: string, columnName: string) => {
    console.log('[Sidebar] Column selected:', columnName, 'from', _filePath)
    info(`Selected: ${columnName}`)
  }

  console.log('[Sidebar] Rendering state:', {
    hasFiles: selectedFiles.length > 0,
    hasMetadata: metadata.length > 0,
    isLoading,
    willShowFileTree: selectedFiles.length > 0 && metadata.length > 0
  })

  return (
    <div className="h-full border-r border-border bg-muted/40 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">Files {isLoading && '...'}</h2>
        {selectedFiles.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearSelection}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Unified Tree or Empty State */}
      {selectedFiles.length > 0 || metadata.length > 0 ? (
        <UnifiedFileTree
          files={selectedFiles}
          metadata={metadata}
          onSelectColumn={handleSelectColumn}
          onRemoveFile={removeFile}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Open a folder with parquet files to begin
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={selectFilesOrFolder}
            disabled={isLoading}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Open Folder
          </Button>
        </div>
      )}
    </div>
  )
}
