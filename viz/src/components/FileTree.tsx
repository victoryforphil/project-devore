import { useState } from 'react'
import { ChevronDown, ChevronRight, Database, Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ParquetFileMetadata } from '@/hooks/useParquetMetadata'

interface FileTreeProps {
  metadata: ParquetFileMetadata[]
  onSelectColumn: (filePath: string, columnName: string) => void
}

export function FileTree({ metadata, onSelectColumn }: FileTreeProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(metadata.map((m) => m.path))
  )

  const toggleFile = (filePath: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath)
    } else {
      newExpanded.add(filePath)
    }
    setExpandedFiles(newExpanded)
  }

  if (metadata.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>No files loaded</p>
        <p className="text-xs mt-1">Select a parquet file to view columns</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {metadata.map((file) => (
          <div key={file.path}>
            {/* File Node */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm font-medium h-8"
              onClick={() => toggleFile(file.path)}
            >
              {expandedFiles.has(file.path) ? (
                <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
              )}
              <Database className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{file.name}</span>
            </Button>

            {/* Columns List */}
            {expandedFiles.has(file.path) && (
              <div className="pl-6 space-y-0.5">
                {file.columns.map((column) => (
                  <button
                    key={`${file.path}-${column.name}`}
                    onClick={() => onSelectColumn(file.path, column.name)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent/50 transition-colors flex items-center gap-2 group"
                  >
                    <Columns3 className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{column.name}</span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0">
                      {column.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
