import { Separator } from "@/components/ui/separator"
import { JsonViewer } from "@/components/JsonViewer"
import type { ParquetFileMetadata } from "@/types"
import { formatFileSize, formatNumber } from "@/lib/formatters"

interface FileMetadataViewProps {
  metadata: ParquetFileMetadata
}

export function FileMetadataView({ metadata }: FileMetadataViewProps) {
  return (
    <div className="space-y-3">
      <MetadataField label="Rows" value={formatNumber(metadata.numRows)} />
      <Separator />
      <MetadataField label="Columns" value={formatNumber(metadata.numColumns)} />
      <Separator />
      <MetadataField label="File Size" value={formatFileSize(metadata.fileSize)} />
      <Separator />
      
      <div>
        <div className="text-xs text-muted-foreground font-medium mb-2">Schema</div>
        <div className="bg-background/50 rounded-md p-3 overflow-x-auto">
          <JsonViewer data={metadata.rawMetadata} />
        </div>
      </div>
    </div>
  )
}

function MetadataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground font-medium mb-1">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}
