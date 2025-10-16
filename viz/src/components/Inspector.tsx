import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useDataSelection } from "@/contexts/DataSelectionContext"
import { JsonViewer } from "@/components/JsonViewer"
import { FileText, Columns3, X, Loader2 } from "lucide-react"

export function Inspector() {
  const { selection, isLoadingMetadata, clearSelection, toggleColumnVisibility, removeColumnFromSelection, setAxisMapping } = useDataSelection()

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <div className="h-full border-l border-border bg-muted/40 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">Inspector</h2>
        {selection && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={clearSelection}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {isLoadingMetadata ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading metadata...</p>
          </div>
        ) : selection?.type === 'file' ? (
          <div className="p-4 space-y-4">
            {/* File Header */}
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{selection.fileName}</h3>
                <p className="text-xs text-muted-foreground truncate">{selection.filePath}</p>
              </div>
            </div>

            <Separator />

            {/* File Stats */}
            {selection.metadata && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-1">Rows</div>
                  <div className="text-sm font-semibold">
                    {selection.metadata.numRows?.toLocaleString() || 'N/A'}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-1">Columns</div>
                  <div className="text-sm font-semibold">
                    {selection.metadata.numColumns || 'N/A'}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-1">File Size</div>
                  <div className="text-sm font-semibold">
                    {formatFileSize(selection.metadata.fileSize)}
                  </div>
                </div>

                <Separator />

                {/* Schema Metadata as JSON */}
                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-2">Schema</div>
                  <div className="bg-background/50 rounded-md p-3 overflow-x-auto">
                    <JsonViewer data={selection.metadata.rawMetadata} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : selection?.type === 'column' ? (
          <div className="p-4 space-y-4">
            {/* Column Header */}
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

            {/* Column Info */}
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground font-medium mb-1">Type</div>
                <div className="text-sm font-semibold font-mono">{selection.columnType}</div>
              </div>

              {selection.field && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium mb-1">Nullable</div>
                    <div className="text-sm font-semibold">
                      {selection.field.nullable ? 'Yes' : 'No'}
                    </div>
                  </div>
                </>
              )}

              {selection.fileMetadata && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium mb-1">File Rows</div>
                    <div className="text-sm font-semibold">
                      {selection.fileMetadata.numRows?.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                </>
              )}

              {/* Field Details as JSON */}
              {selection.field && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium mb-2">
                      Field Details
                    </div>
                    <div className="bg-background/50 rounded-md p-3 overflow-x-auto">
                      <JsonViewer
                        data={{
                          name: selection.field.name,
                          type: selection.field.type.toString(),
                          nullable: selection.field.nullable,
                          metadata: selection.field.metadata,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : selection?.type === 'columns' ? (
          <div className="flex flex-col h-full">
            {/* File Info Panel - Top Section */}
            {selection.fileMetadata && (
              <div className="p-4 space-y-3 border-b border-border bg-muted/20">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs truncate">{selection.fileMetadata.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selection.fileMetadata.numRows?.toLocaleString() || 'N/A'} rows
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Columns Panel - Scrollable Section */}
            <div className="flex-1 overflow-auto">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Selected Columns ({selection.columns.length})
                  </h3>
                </div>

                {/* 3D Axis Mapping Controls */}
                {selection.columns.length >= 2 && (
                  <div className="p-3 rounded-md bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 space-y-2">
                    <div className="text-xs font-semibold text-blue-300 mb-2">
                      🎯 3D Axis Mapping
                    </div>
                    
                    {/* X Axis */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-400 w-6">X:</span>
                      <select
                        value={selection.axisMapping?.x || ''}
                        onChange={(e) => setAxisMapping('x', e.target.value || null)}
                        className="flex-1 h-6 px-2 text-xs rounded bg-background/50 border border-border text-foreground"
                      >
                        <option value="">None</option>
                        {selection.columns.map((col) => (
                          <option key={col.columnName} value={col.columnName}>
                            {col.columnName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Y Axis */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-green-400 w-6">Y:</span>
                      <select
                        value={selection.axisMapping?.y || ''}
                        onChange={(e) => setAxisMapping('y', e.target.value || null)}
                        className="flex-1 h-6 px-2 text-xs rounded bg-background/50 border border-border text-foreground"
                      >
                        <option value="">None</option>
                        {selection.columns.map((col) => (
                          <option key={col.columnName} value={col.columnName}>
                            {col.columnName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Z Axis */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-400 w-6">Z:</span>
                      <select
                        value={selection.axisMapping?.z || ''}
                        onChange={(e) => setAxisMapping('z', e.target.value || null)}
                        className="flex-1 h-6 px-2 text-xs rounded bg-background/50 border border-border text-foreground"
                      >
                        <option value="">None</option>
                        {selection.columns.map((col) => (
                          <option key={col.columnName} value={col.columnName}>
                            {col.columnName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t border-border/50 my-2"></div>

                    {/* Scale Control */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-400 w-16">Scale:</span>
                      <input
                        type="range"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={selection.axisMapping?.scale || 1}
                        onChange={(e) => setAxisMapping('scale', parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0.01"
                        max="1000"
                        step="0.1"
                        value={selection.axisMapping?.scale || 1}
                        onChange={(e) => setAxisMapping('scale', parseFloat(e.target.value) || 1)}
                        className="w-16 h-6 px-1 text-xs rounded bg-background/50 border border-border text-foreground text-center"
                      />
                    </div>

                    <div className="text-xs text-muted-foreground/70 italic mt-2">
                      💡 Use scale to amplify small movements
                    </div>
                  </div>
                )}

                {selection.columns.map((col, index) => {
                  // Assign axis based on order
                  const axis = index === 0 ? 'X' : index === 1 ? 'Y' : index === 2 ? 'Z' : null
                  const axisColor = index === 0 ? 'text-red-400' : index === 1 ? 'text-green-400' : index === 2 ? 'text-blue-400' : ''

                  return (
                    <div
                      key={`${col.filePath}-${col.columnName}`}
                      className="p-2.5 rounded-md border border-border bg-background/50 space-y-1.5"
                    >
                      {/* Column Header with controls */}
                      <div className="flex items-start gap-2">
                        <div className="flex items-center gap-1.5">
                          <Columns3 className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                          {axis && (
                            <span className={`text-xs font-bold ${axisColor}`}>{axis}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs truncate">{col.columnName}</h4>
                          <p className="text-xs text-muted-foreground font-mono">{col.columnType}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => toggleColumnVisibility(col.filePath, col.columnName)}
                            title={col.visible ? "Hide from plot" : "Show in plot"}
                          >
                            {col.visible ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
                            ) : (
                              <span className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground"></span>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeColumnFromSelection(col.filePath, col.columnName)}
                            title="Remove from selection"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Column metadata - compact */}
                      <div className="flex items-center gap-3 pl-5 text-xs text-muted-foreground">
                        {col.field && (
                          <span>{col.field.nullable ? 'Nullable' : 'Required'}</span>
                        )}
                        <span className="flex items-center gap-1">
                          Plot: <span className="inline-block w-2.5 h-2.5 rounded-full" 
                            style={{ 
                              backgroundColor: ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index % 5]
                            }}
                          ></span>
                        </span>
                      </div>
                    </div>
                  )
                })}

                {selection.columns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No columns selected
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a file or column to view details
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
