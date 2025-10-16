import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { X, File } from "lucide-react"
import type { FileSystemItem } from "@/contexts/FileSystemContext"

interface OpenFilesProps {
  files: FileSystemItem[]
  onRemoveFile: (path: string) => void
  onClearAll: () => void
}

export function OpenFiles({ files, onRemoveFile, onClearAll }: OpenFilesProps) {
  if (files.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col h-full border-b border-border">
      <div className="px-4 py-2 flex items-center justify-between border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">
          Open Files ({files.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onClearAll}
        >
          Clear All
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 group text-xs"
              title={file.path}
            >
              <File className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate text-muted-foreground flex-1">
                {file.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveFile(file.path)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
