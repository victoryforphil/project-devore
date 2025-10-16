import { useEffect, useMemo, useState } from "react"
import Plot from "react-plotly.js"
import type { Config, Data, Layout } from "plotly.js"
import { useData } from "@/hooks/useData"
import { useParquetWasm } from "@/contexts/ParquetWasmContext"
import { useFileSystem } from "@/contexts/FileSystemContext"
import { usePlayback } from "@/contexts/PlaybackContext"
import { Type } from "apache-arrow"

const mockTime = Array.from({ length: 60 }, (_, idx) => idx) // seconds

const altitudeTrace: Data = {
  type: "scatter",
  mode: "lines",
  name: "Altitude",
  x: mockTime,
  y: mockTime.map((t) => 120 + Math.sin(t / 6) * 18 + Math.cos(t / 14) * 9),
  line: {
    width: 2.5,
    color: "hsl(var(--primary))",
    shape: "spline",
  },
  hovertemplate: "%{x:.0f}s<br>Altitude: %{y:.1f} m<extra></extra>",
}

const velocityTrace: Data = {
  type: "scatter",
  mode: "lines",
  name: "Velocity",
  x: mockTime,
  y: mockTime.map((t) => 22 + Math.cos(t / 4) * 4 + Math.sin(t / 11) * 2.5),
  line: {
    width: 2.5,
    color: "hsl(var(--chart-2))",
    shape: "spline",
  },
  hovertemplate: "%{x:.0f}s<br>Velocity: %{y:.2f} m/s<extra></extra>",
  yaxis: "y2",
}

const baseLayout: Partial<Layout> = {
  margin: { l: 50, r: 50, t: 10, b: 40 },
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  hovermode: "x unified",
  hoverlabel: {
    bgcolor: "rgba(0, 0, 0, 0.9)",
    bordercolor: "rgba(255, 255, 255, 0.2)",
    font: {
      family: "var(--font-sans)",
      size: 12,
      color: "rgba(255, 255, 255, 0.95)",
    },
  },
  transition: {
    duration: 0,
  },
  legend: {
    font: { size: 11, color: "rgba(255, 255, 255, 0.7)" },
    orientation: "h",
    x: 0,
    y: 1.05,
    bgcolor: "transparent",
  },
  xaxis: {
    title: { text: "Time (s)", font: { size: 11 } },
    gridcolor: "rgba(255, 255, 255, 0.08)",
    gridwidth: 0.5,
    zeroline: false,
    tickfont: { color: "rgba(255, 255, 255, 0.6)", size: 10 },
    titlefont: { color: "rgba(255, 255, 255, 0.7)" },
  },
  yaxis: {
    title: { text: "Altitude (m)", font: { size: 11 } },
    gridcolor: "rgba(255, 255, 255, 0.08)",
    gridwidth: 0.5,
    zeroline: false,
    tickfont: { color: "rgba(255, 255, 255, 0.6)", size: 10 },
    titlefont: { color: "rgba(255, 255, 255, 0.7)" },
  },
  yaxis2: {
    title: { text: "Velocity (m/s)", font: { size: 11 } },
    overlaying: "y",
    side: "right",
    zeroline: false,
    tickfont: { color: "rgba(255, 255, 255, 0.6)", size: 10 },
    titlefont: { color: "rgba(255, 255, 255, 0.7)" },
    gridcolor: "transparent",
  },
  font: {
    family: "var(--font-sans)",
    color: "rgba(255, 255, 255, 0.9)",
  },
}

const config: Partial<Config> = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["toImage", "lasso2d", "select2d"],
  doubleClick: false,
  showAxisDragHandles: false,
  scrollZoom: false,
}

interface BaseColumnData {
  filePath: string
  columnName: string
  visible: boolean
  columnType?: string
}

interface NumericColumnData extends BaseColumnData {
  valueType: "number"
  data: Array<number | null>
}

interface StringColumnData extends BaseColumnData {
  valueType: "string"
  data: string[]
  states: string[]
}

type ColumnData = NumericColumnData | StringColumnData

// Define color palette for multiple columns (bright colors for dark background)
const colorPalette = [
  "#00d9ff", // cyan (primary-like)
  "#ff6b9d", // pink
  "#fbbf24", // amber
  "#34d399", // emerald
  "#60a5fa", // blue
  "#a78bfa", // purple
  "#f87171", // red
  "#fb923c", // orange
  "#4ade80", // green
  "#c084fc", // violet
]

export function UavTelemetryPlot() {
  const { selection } = useData()
  const { readTable } = useParquetWasm()
  const { selectedFiles } = useFileSystem()
  const { currentIndex, setMaxIndex } = usePlayback()
  const [columnsData, setColumnsData] = useState<ColumnData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load column data when selection changes
  useEffect(() => {
    // Clear if no selection
    if (!selection || selection.type === 'file') {
      setColumnsData([])
      setError(null)
      return
    }

    const loadColumnsData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        let columnsToLoad: Array<{ filePath: string; columnName: string; visible: boolean; columnType?: string }> = []

        if (selection.type === 'column') {
          columnsToLoad = [{ 
            filePath: selection.filePath, 
            columnName: selection.columnName,
            visible: true,
            columnType: selection.columnType,
          }]
        } else if (selection.type === 'columns') {
          columnsToLoad = selection.columns.map(c => ({
            filePath: c.filePath,
            columnName: c.columnName,
            visible: c.visible,
            columnType: c.columnType,
          }))
        }

        console.log('[UavTelemetryPlot] Loading data for', columnsToLoad.length, 'columns')

        const loadedData: ColumnData[] = []

        for (const col of columnsToLoad) {
          try {
            // Find the file
            const fileItem = selectedFiles.find((f) => f.path === col.filePath)
            if (!fileItem) {
              console.warn(`File not found: ${col.filePath}`)
              continue
            }

            // Read file as Uint8Array
            const fileHandle = fileItem.handle as FileSystemFileHandle
            const fileObj = await fileHandle.getFile()
            const arrayBuffer = await fileObj.arrayBuffer()
            const uint8Array = new Uint8Array(arrayBuffer)

            // Read table
            const table = await readTable(uint8Array)
            
            // Get the column
            const column = table.getChild(col.columnName)
            if (!column) {
              console.warn(`Column not found: ${col.columnName}`)
              continue
            }

            const arrowTypeId =
              (column as { typeId?: number }).typeId ??
              column.type?.typeId ??
              null

            const treatedAsUtf8 =
              arrowTypeId === Type.Utf8 ||
              arrowTypeId === Type.LargeUtf8 ||
              (col.columnType?.toUpperCase().includes("UTF8") ?? false)

            if (treatedAsUtf8) {
              const values: string[] = []
              const seenStates = new Set<string>()
              const orderedStates: string[] = []

              for (let i = 0; i < column.length; i++) {
                const value = column.get(i)
                const stringValue =
                  value === null || value === undefined
                    ? "[null]"
                    : String(value)

                values.push(stringValue)

                if (!seenStates.has(stringValue)) {
                  seenStates.add(stringValue)
                  orderedStates.push(stringValue)
                }
              }

              loadedData.push({
                filePath: col.filePath,
                columnName: col.columnName,
                columnType: col.columnType,
                data: values,
                states: orderedStates,
                visible: col.visible,
                valueType: "string",
              })
            } else {
              const data: Array<number | null> = []
              for (let i = 0; i < column.length; i++) {
                const value = column.get(i)

                if (typeof value === "number") {
                  data.push(value)
                } else if (typeof value === "boolean") {
                  data.push(value ? 1 : 0)
                } else if (typeof value === "bigint") {
                  data.push(Number(value))
                } else if (value === null || value === undefined) {
                  data.push(null)
                } else {
                  const parsed = Number(value)
                  data.push(Number.isFinite(parsed) ? parsed : null)
                }
              }

              loadedData.push({
                filePath: col.filePath,
                columnName: col.columnName,
                columnType: col.columnType,
                data,
                visible: col.visible,
                valueType: "number",
              })
            }

            console.log('[UavTelemetryPlot] ✓ Loaded', column.length, 'rows for column:', col.columnName)
          } catch (err) {
            console.error(`Failed to load column ${col.columnName}:`, err)
          }
        }

        setColumnsData(loadedData)
        
        // Update max index for playback
        if (loadedData.length > 0 && loadedData[0].data.length > 0) {
          setMaxIndex(loadedData[0].data.length)
        }
      } catch (err: any) {
        console.error('[UavTelemetryPlot] Failed to load column data:', err)
        setError(err.message || 'Failed to load column data')
      } finally {
        setIsLoading(false)
      }
    }

    loadColumnsData()
  }, [selection, selectedFiles, readTable, setMaxIndex])

  const hasVisibleStringColumns = columnsData.some(
    (col) => col.visible && col.valueType === "string"
  )
  const hasVisibleNumericColumns = columnsData.some(
    (col) => col.visible && col.valueType === "number"
  )

  const stringCategories = useMemo(() => {
    const categories: string[] = []
    const seen = new Set<string>()

    columnsData
      .filter((col): col is StringColumnData => col.visible && col.valueType === "string")
      .forEach((col) => {
        col.states.forEach((state) => {
          if (!seen.has(state)) {
            seen.add(state)
            categories.push(state)
          }
        })
      })

    return categories
  }, [columnsData])

  const plotLayout = useMemo<Partial<Layout>>(() => {
    if (columnsData.length === 0) {
      return baseLayout
    }

    const layout: Partial<Layout> = {
      ...baseLayout,
      shapes: [
        // Vertical line at current playback position
        {
          type: 'line',
          x0: currentIndex,
          x1: currentIndex,
          y0: 0,
          y1: 1,
          yref: 'paper',
          line: {
            color: 'rgba(255, 255, 255, 0.5)',
            width: 2,
            dash: 'dot',
          },
        },
      ],
      yaxis: {
        ...(baseLayout.yaxis ?? {}),
      },
      yaxis2: baseLayout.yaxis2 ? { ...baseLayout.yaxis2 } : undefined,
    }

    if (hasVisibleStringColumns && hasVisibleNumericColumns) {
      layout.yaxis = {
        ...(baseLayout.yaxis ?? {}),
        title: {
          text: "Value",
          font: baseLayout.yaxis?.title?.font ?? { size: 11 },
        },
        type: "linear",
      }
      layout.yaxis2 = {
        ...(baseLayout.yaxis2 ?? baseLayout.yaxis ?? {}),
        title: {
          text: "State",
          font:
            baseLayout.yaxis2?.title?.font ??
            baseLayout.yaxis?.title?.font ??
            { size: 11 },
        },
        type: "category",
        overlaying: "y",
        side: "right",
        categoryorder: "array",
        categoryarray: stringCategories,
        tickfont: baseLayout.yaxis2?.tickfont ?? baseLayout.yaxis?.tickfont,
        showgrid: false,
        zeroline: false,
      }
    } else if (hasVisibleStringColumns) {
      layout.yaxis = {
        ...(baseLayout.yaxis ?? {}),
        title: { text: "State", font: baseLayout.yaxis?.title?.font ?? { size: 11 } },
        type: "category",
        categoryorder: "array",
        categoryarray: stringCategories,
        tickfont: baseLayout.yaxis?.tickfont,
        showgrid: false,
        zeroline: false,
      }

      if (layout.yaxis2) {
        layout.yaxis2 = {
          ...layout.yaxis2,
          visible: false,
          showgrid: false,
          showticklabels: false,
        }
      }
    } else {
      layout.yaxis = {
        ...(baseLayout.yaxis ?? {}),
        title: { text: "Value", font: baseLayout.yaxis?.title?.font ?? { size: 11 } },
        type: "linear",
      }

      if (layout.yaxis2) {
        layout.yaxis2 = {
          ...layout.yaxis2,
          visible: false,
          showgrid: false,
          showticklabels: false,
        }
      }
    }

    return layout
  }, [columnsData, hasVisibleNumericColumns, hasVisibleStringColumns, stringCategories, currentIndex])

  // Prepare plot data
  const plotData: Data[] = columnsData.length > 0
    ? columnsData
        .filter(col => col.visible)
        .map((col, index) => {
          const color = colorPalette[index % colorPalette.length]
          const xValues = Array.from({ length: col.data.length }, (_, i) => i)

          if (col.valueType === "string") {
            return {
              type: "scatter" as const,
              mode: "lines+markers" as const,
              name: col.columnName,
              x: xValues,
              y: col.data,
              line: {
                width: 2,
                color,
                shape: "hv",
              },
              marker: {
                size: 5,
                color,
              },
              hovertemplate: `${col.columnName}<br>Row %{x}<br>State: %{y}<extra></extra>`,
              yaxis: hasVisibleNumericColumns ? "y2" : "y",
            }
          }

          return {
            type: "scatter" as const,
            mode: "lines" as const,
            name: col.columnName,
            x: xValues,
            y: col.data,
            line: {
              width: 2.5,
              color,
              shape: "spline",
            },
            hovertemplate: `${col.columnName}<br>Row %{x}<br>Value: %{y:.2f}<extra></extra>`,
            yaxis: "y",
          }
        })
    : [altitudeTrace, velocityTrace]

  const statusText = columnsData.length > 0
    ? columnsData.length === 1
      ? `${columnsData[0].columnName} (${columnsData[0].data.length} rows)`
      : `${columnsData.filter(c => c.visible).length} of ${columnsData.length} columns`
    : "Altitude & Velocity"

  // Extract file name from selection
  const fileName = selection?.type === 'column' 
    ? selection.filePath.split('/').pop() || 'Unknown File'
    : selection?.type === 'columns' && selection.columns.length > 0
      ? selection.columns[0].filePath.split('/').pop() || 'Unknown File'
      : 'No File Selected'

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{fileName}</h3>
          <p className="text-xs text-white/60">{statusText}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10">
          {isLoading ? (
            <>
              <span className="h-1.5 w-1.5 animate-spin rounded-full border border-white/50 border-t-primary"></span>
              Loading
            </>
          ) : columnsData.length > 0 ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
              Data
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"></span>
              Mock
            </>
          )}
        </div>
      </div>
      {error ? (
        <div className="flex flex-1 items-center justify-center rounded-lg bg-black/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <div className="flex-1 rounded-lg bg-black/20 p-2">
          <Plot
            data={plotData}
            layout={plotLayout}
            config={config}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </div>
      )}
    </div>
  )
}
