import { Separator } from "@/components/ui/separator"
import { JsonViewer } from "@/components/JsonViewer"
import type { ColumnSelection } from "@/types"
import { formatNumber } from "@/lib/formatters"

interface ColumnDetailsViewProps {
  selection: ColumnSelection
}

export function ColumnDetailsView({ selection }: ColumnDetailsViewProps) {
  return (
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
              {formatNumber(selection.fileMetadata.numRows)}
            </div>
          </div>
        </>
      )}

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
  )
}
