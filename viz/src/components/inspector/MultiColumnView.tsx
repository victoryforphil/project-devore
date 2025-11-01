import { Button } from "@/components/ui/button"
import { X, Columns3 } from "lucide-react"
import type { SelectedColumn, AxisMapping } from "@/types"

interface MultiColumnViewProps {
  columns: SelectedColumn[]
  axisMapping?: AxisMapping
  onToggleVisibility: (filePath: string, columnName: string) => void
  onRemoveColumn: (filePath: string, columnName: string) => void
  onSetAxisMapping: (axis: 'x' | 'y' | 'z' | 'scale', value: string | number | null) => void
}

const COLUMN_COLORS = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
const AXIS_LABELS = ['X', 'Y', 'Z']
const AXIS_COLORS = ['text-red-400', 'text-green-400', 'text-blue-400']

export function MultiColumnView({ 
  columns, 
  axisMapping, 
  onToggleVisibility, 
  onRemoveColumn,
  onSetAxisMapping 
}: MultiColumnViewProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Selected Columns ({columns.length})
      </h3>

      {columns.length >= 2 && (
        <AxisMappingControls
          columns={columns}
          axisMapping={axisMapping}
          onSetAxisMapping={onSetAxisMapping}
        />
      )}

      <div className="space-y-2">
        {columns.map((col, index) => (
          <ColumnCard
            key={`${col.filePath}-${col.columnName}`}
            column={col}
            index={index}
            onToggleVisibility={onToggleVisibility}
            onRemoveColumn={onRemoveColumn}
          />
        ))}
      </div>

      {columns.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-xs">
          No columns selected
        </div>
      )}
    </div>
  )
}

function AxisMappingControls({ 
  columns, 
  axisMapping, 
  onSetAxisMapping 
}: Pick<MultiColumnViewProps, 'columns' | 'axisMapping' | 'onSetAxisMapping'>) {
  return (
    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 space-y-2.5">
      <div className="text-xs font-semibold text-blue-300 mb-2">
        🎯 3D Axis Mapping
      </div>
      
      {(['x', 'y', 'z'] as const).map((axis, idx) => (
        <div key={axis} className="flex items-center gap-2">
          <span className={`text-xs font-bold ${AXIS_COLORS[idx]} w-6 uppercase`}>
            {axis}:
          </span>
          <select
            value={axisMapping?.[axis] || ''}
            onChange={(e) => onSetAxisMapping(axis, e.target.value || null)}
            className="flex-1 h-7 px-2 text-xs rounded bg-background/50 border border-border"
          >
            <option value="">None</option>
            {columns.map((col) => (
              <option key={col.columnName} value={col.columnName}>
                {col.columnName}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="border-t border-border/50 pt-2 mt-3" />

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-purple-400 w-16">Scale:</span>
        <input
          type="range"
          min="0.1"
          max="100"
          step="0.1"
          value={axisMapping?.scale || 1}
          onChange={(e) => onSetAxisMapping('scale', parseFloat(e.target.value))}
          className="flex-1 h-1.5 bg-white/10 rounded-lg cursor-pointer"
        />
        <input
          type="number"
          min="0.01"
          max="1000"
          step="0.1"
          value={axisMapping?.scale || 1}
          onChange={(e) => onSetAxisMapping('scale', parseFloat(e.target.value) || 1)}
          className="w-16 h-7 px-2 text-xs rounded bg-background/50 border border-border text-center"
        />
      </div>

      <p className="text-xs text-muted-foreground/70 italic">
        💡 Adjust scale to amplify small movements
      </p>
    </div>
  )
}

function ColumnCard({
  column,
  index,
  onToggleVisibility,
  onRemoveColumn,
}: {
  column: SelectedColumn
  index: number
  onToggleVisibility: (filePath: string, columnName: string) => void
  onRemoveColumn: (filePath: string, columnName: string) => void
}) {
  const axis = index < 3 ? AXIS_LABELS[index] : null
  const axisColor = index < 3 ? AXIS_COLORS[index] : ''
  const plotColor = COLUMN_COLORS[index % COLUMN_COLORS.length]

  return (
    <div className="p-2.5 rounded-md border border-border bg-background/50 hover:bg-background/80 transition-colors">
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1.5">
          <Columns3 className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
          {axis && (
            <span className={`text-xs font-bold ${axisColor}`}>{axis}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-xs truncate">{column.columnName}</h4>
          <p className="text-xs text-muted-foreground font-mono">{column.columnType}</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onToggleVisibility(column.filePath, column.columnName)}
            title={column.visible ? "Hide from plot" : "Show in plot"}
          >
            {column.visible ? (
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemoveColumn(column.filePath, column.columnName)}
            title="Remove from selection"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-5 mt-1.5 text-xs text-muted-foreground">
        {column.field && (
          <span>{column.field.nullable ? 'Nullable' : 'Required'}</span>
        )}
        <span className="flex items-center gap-1">
          Plot: <span 
            className="inline-block w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: plotColor }}
          />
        </span>
      </div>
    </div>
  )
}
