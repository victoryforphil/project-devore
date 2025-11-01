import { useEffect } from "react"
import { FolderOpen } from "lucide-react"
import { UnifiedFileTree } from "./UnifiedFileTree"
import { PanelHeader } from "./common/PanelHeader"
import { EmptyState } from "./common/EmptyState"
import { useFileSystem } from "@/contexts/FileSystemContext"
import { useParquetSchema } from "@/hooks/useParquetSchema"
import { useFileSelection } from "@/hooks/useFileSelection"
import { useToast } from "@/lib/toast"

export function Sidebar() {
  const { selectedFiles, removeFile, clearSelection, selectFilesOrFolder } = useFileSystem()
  const { metadata, loadMetadata, isLoading } = useParquetSchema()
  const { handleSelectFile, handleSelectColumn, handleToggleColumnSelection, getSelectedColumns } = useFileSelection()
  const { success, error: showError, info } = useToast()

  // Load metadata when files change
  useEffect(() => {
    if (selectedFiles.length > 0) {
      info(`Reading ${selectedFiles.length} parquet file(s)...`)
      loadMetadata(selectedFiles)
        .then((result) => {
          const totalColumns = result.reduce((sum, f) => sum + f.columns.length, 0)
          success(`✓ Loaded ${selectedFiles.length} file(s) with ${totalColumns} columns`)
        })
        .catch((err) => {
          showError(`Failed to load files: ${err.message}`)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles])

  const selectedColumns = getSelectedColumns()
  const hasFiles = selectedFiles.length > 0 || metadata.length > 0

  return (
    <div className="h-full border-r border-border bg-muted/40 flex flex-col">
      <PanelHeader 
        title="Files"
        badge={selectedColumns.length > 1 ? selectedColumns.length : undefined}
        action={selectedFiles.length > 0 ? {
          icon: FolderOpen,
          label: "Clear",
          onClick: clearSelection
        } : undefined}
      />

      {hasFiles ? (
        <UnifiedFileTree
          files={selectedFiles}
          metadata={metadata}
          onSelectFile={handleSelectFile}
          onSelectColumn={handleSelectColumn}
          onAddColumnToSelection={handleToggleColumnSelection}
          onRemoveFile={removeFile}
          selectedColumns={selectedColumns}
        />
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="No files opened"
          description="Open a folder with parquet files to begin exploring your data"
          action={{
            label: "Open Folder",
            onClick: selectFilesOrFolder,
            disabled: isLoading
          }}
        />
      )}
    </div>
  )
}
