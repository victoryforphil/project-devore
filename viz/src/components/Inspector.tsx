import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { FileText, Columns3, X } from "lucide-react"
import { PanelHeader } from "./common/PanelHeader"
import { LoadingState } from "./common/LoadingState"
import { EmptyState } from "./common/EmptyState"
import { FileMetadataView } from "./inspector/FileMetadataView"
import { ColumnDetailsView } from "./inspector/ColumnDetailsView"
import { MultiColumnView } from "./inspector/MultiColumnView"
import { useDataSelection } from "@/contexts/DataSelectionContext"
import { formatNumber } from "@/lib/formatters"

export function Inspector() {
  const { 
    selection, 
    isLoadingMetadata, 
    clearSelection, 
    toggleColumnVisibility, 
    removeColumnFromSelection, 
    setAxisMapping 
  } = useDataSelection()

  return (
    <div className="h-full border-l border-border bg-muted/40 flex flex-col">
      <PanelHeader 
        title="Inspector"
        action={selection ? {
          icon: X,
          label: "Clear",
          onClick: clearSelection
        } : undefined}
      />

      <ScrollArea className="flex-1">
        {isLoadingMetadata ? (
          <LoadingState message="Loading metadata..." />
        ) : selection?.type === 'file' ? (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{selection.fileName}</h3>
                <p className="text-xs text-muted-foreground truncate">{selection.filePath}</p>
              </div>
            </div>
            <Separator />
            {selection.metadata && <FileMetadataView metadata={selection.metadata} />}
          </div>
        ) : selection?.type === 'column' ? (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Columns3 className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{selection.columnName}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {selection.filePath.split('/').pop()}
                </p>
              </div>
            </div>
            <Separator />
            <ColumnDetailsView selection={selection} />
          </div>
        ) : selection?.type === 'columns' ? (
          <div className="flex flex-col h-full">
            {selection.fileMetadata && (
              <div className="p-4 space-y-3 border-b border-border bg-muted/20">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs truncate">{selection.fileMetadata.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(selection.fileMetadata.numRows)} rows
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                <MultiColumnView
                  columns={selection.columns}
                  axisMapping={selection.axisMapping}
                  onToggleVisibility={toggleColumnVisibility}
                  onRemoveColumn={removeColumnFromSelection}
                  onSetAxisMapping={setAxisMapping}
                />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No selection"
            description="Select a file or column to view details"
          />
        )}
      </ScrollArea>
    </div>
  )
}
