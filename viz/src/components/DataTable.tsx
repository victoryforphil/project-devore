import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { useData } from "@/hooks/useData"
import { useParquetWasm } from "@/contexts/ParquetWasmContext"
import { useFileSystem } from "@/contexts/FileSystemContext"

const MAX_ROWS_TO_DISPLAY = 500
const utf8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : null

interface TableColumn {
  name: string
  type: string
}

interface TableState {
  columns: TableColumn[]
  rows: Array<Record<string, string>>
  totalRows: number
  truncated: boolean
}

type EditedCellMap = Record<string, string>

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "bigint") {
    return value.toString()
  }

  if (typeof value === "object") {
    if (value instanceof Uint8Array) {
      if (utf8Decoder) {
        try {
          return utf8Decoder.decode(value)
        } catch {
          /* noop */
        }
      }

      return Array.from(value)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ")
    }

    if (Array.isArray(value)) {
      return value.map((entry) => formatCellValue(entry)).join(", ")
    }

    if (typeof (value as any).toJSON === "function") {
      try {
        return JSON.stringify((value as any).toJSON())
      } catch {
        /* noop */
      }
    }

    if (typeof (value as any).toString === "function") {
      const stringValue = (value as any).toString()
      if (stringValue !== "[object Object]") {
        return stringValue
      }
    }

    try {
      return JSON.stringify(value)
    } catch {
      return "[object]"
    }
  }

  return String(value)
}

export function DataTablePanel() {
  const { selection, isLoadingMetadata, getSelectedFileName, isFile, isColumn, isMultiColumn } =
    useData()
  const { readTable, isInitialized, isInitializing } = useParquetWasm()
  const { selectedFiles } = useFileSystem()

  const [tableState, setTableState] = useState<TableState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editedCells, setEditedCells] = useState<EditedCellMap>({})

  const selectedFileName = getSelectedFileName()

  const resolvedFilePath = useMemo(() => {
    if (!selection) {
      return null
    }

    if (isFile && selection.type === "file") {
      return selection.filePath
    }

    if (isColumn && selection.type === "column") {
      return selection.filePath
    }

    if (isMultiColumn && selection.type === "columns" && selection.columns.length > 0) {
      const uniquePaths = new Set(selection.columns.map((col) => col.filePath))
      return uniquePaths.size === 1 ? selection.columns[0]!.filePath : null
    }

    return null
  }, [selection, isFile, isColumn, isMultiColumn])

  const displayFileName = useMemo(() => {
    if (selectedFileName) {
      return selectedFileName
    }
    if (!resolvedFilePath) {
      return null
    }
    const parts = resolvedFilePath.split("/")
    return parts[parts.length - 1] || resolvedFilePath
  }, [selectedFileName, resolvedFilePath])

  const selectionMetadata = useMemo(() => {
    if (!selection) {
      return undefined
    }

    if (selection.type === "file") {
      return selection.metadata
    }

    if (selection.type === "column") {
      return selection.fileMetadata
    }

    if (selection.type === "columns") {
      return selection.fileMetadata
    }

    return undefined
  }, [selection])

  useEffect(() => {
    let cancelled = false

    const loadTable = async () => {
      if (!resolvedFilePath) {
        setTableState(null)
        setError(null)
        setEditedCells({})
        setIsLoading(false)
        return
      }

      if (!isInitialized) {
        setTableState(null)
        setEditedCells({})
        setIsLoading(isInitializing)
        if (!isInitializing) {
          setError("Parquet engine is not initialized yet.")
        } else {
          setError(null)
        }
        return
      }

      const fileItem = selectedFiles.find((file) => file.path === resolvedFilePath)

      if (!fileItem || fileItem.isDirectory) {
        setTableState(null)
        setEditedCells({})
        setError("Selected file could not be found in the current session.")
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const fileHandle = fileItem.handle as FileSystemFileHandle
        const fileObj = await fileHandle.getFile()
        const buffer = await fileObj.arrayBuffer()
        const table = await readTable(new Uint8Array(buffer))

        if (cancelled) {
          return
        }

        const columns: TableColumn[] = table.schema.fields.map((field) => ({
          name: field.name,
          type: field.type?.toString?.() ?? "unknown",
        }))

        const limit = Math.min(table.numRows, MAX_ROWS_TO_DISPLAY)
        const rows: Array<Record<string, string>> = []
        const columnVectors = columns.map((column) => table.getChild(column.name))

        for (let rowIndex = 0; rowIndex < limit; rowIndex++) {
          const row: Record<string, string> = {}

          columnVectors.forEach((vector, columnIndex) => {
            const value = vector?.get(rowIndex)
            row[columns[columnIndex].name] = formatCellValue(value)
          })

          rows.push(row)
        }

        setTableState({
          columns,
          rows,
          totalRows: table.numRows,
          truncated: table.numRows > limit,
        })
        setEditedCells({})
      } catch (err: any) {
        if (!cancelled) {
          console.error("[DataTablePanel] Failed to load table:", err)
          setTableState(null)
          setEditedCells({})
          setError(err?.message ?? "Failed to load data table.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadTable()

    return () => {
      cancelled = true
    }
  }, [resolvedFilePath, selectedFiles, readTable, isInitialized, isInitializing])

  const handleCellChange = (rowIndex: number, columnName: string, nextValue: string) => {
    const cellKey = `${rowIndex}:${columnName}`
    setEditedCells((prev) => ({
      ...prev,
      [cellKey]: nextValue,
    }))
  }

  const resetEdits = () => {
    setEditedCells({})
  }

  const hasEdits = Object.keys(editedCells).length > 0

  if (!selection) {
    return (
      <div className="flex h-full items-center justify-center border border-dashed border-white/20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-md text-center">
          <div className="mb-2 text-sm font-medium text-white/80">No File Selected</div>
          <div className="text-xs text-white/50">
            Select a parquet file from the file tree to view its data table.
          </div>
        </div>
      </div>
    )
  }

  if (!resolvedFilePath) {
    return (
      <div className="flex h-full items-center justify-center border border-dashed border-white/20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-md text-center">
          <div className="mb-2 text-sm font-medium text-white/80">Multi-File Selection</div>
          <div className="text-xs text-white/50">
            Select a single file to view its table. Multi-file selections are not yet supported.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-6 py-4 backdrop-blur-xl">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-white">
            {displayFileName || resolvedFilePath}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
            {selectionMetadata?.numRows !== undefined && (
              <span>Total rows: {selectionMetadata.numRows.toLocaleString()}</span>
            )}
            {tableState && (
              <span>
                Showing {tableState.rows.length.toLocaleString()} rows
                {tableState.truncated ? " (partial)" : ""}
              </span>
            )}
            {tableState && (
              <span>Columns: {tableState.columns.length.toLocaleString()}</span>
            )}
            {selectionMetadata?.fileSize !== undefined && (
              <span>
                File size: {(selectionMetadata.fileSize / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasEdits && (
            <>
              <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
                {Object.keys(editedCells).length} edited
              </span>
              <button
                type="button"
                onClick={resetEdits}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-black/20">
        {isLoading || isLoadingMetadata ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="text-sm font-medium text-white/70">Loading table data…</div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md text-center">
              <div className="mb-2 text-sm font-medium text-red-400">Error Loading Data</div>
              <div className="text-xs text-red-300/80">{error}</div>
            </div>
          </div>
        ) : tableState ? (
          <div className="h-full w-full overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 border-b border-white/10 bg-black/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm">
                    #
                  </th>
                  {tableState.columns.map((column) => (
                    <th
                      key={column.name}
                      className="whitespace-nowrap border-b border-white/10 bg-black/60 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white/90">{column.name}</span>
                        <span className="text-[10px] font-normal normal-case tracking-normal text-white/40">
                          {column.type}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableState.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`transition-colors hover:bg-white/5 ${
                      rowIndex % 2 === 0 ? "bg-black/20" : "bg-black/10"
                    }`}
                  >
                    <td className="sticky left-0 z-10 border-b border-white/5 bg-black/40 px-4 py-2 text-xs font-mono font-medium text-white/50 backdrop-blur-sm">
                      {rowIndex + 1}
                    </td>
                    {tableState.columns.map((column) => {
                      const cellKey = `${rowIndex}:${column.name}`
                      const originalValue = row[column.name] ?? ""
                      const currentValue =
                        editedCells[cellKey] !== undefined ? editedCells[cellKey] : originalValue
                      const isEdited = editedCells[cellKey] !== undefined

                      return (
                        <td
                          key={column.name}
                          className={`border-b border-white/5 px-0 py-0 align-top ${
                            isEdited ? "bg-primary/15" : "bg-transparent"
                          }`}
                        >
                          <input
                            value={currentValue}
                            onChange={(event) =>
                              handleCellChange(rowIndex, column.name, event.target.value)
                            }
                            className={`w-full border border-transparent bg-transparent px-4 py-2 font-mono text-sm text-white/90 outline-none transition placeholder:text-white/30 focus:border-primary/60 focus:bg-primary/10 focus:text-white ${
                              isEdited ? "border-primary/40 bg-primary/5" : ""
                            }`}
                            placeholder="—"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {tableState.truncated && (
              <div className="sticky bottom-0 border-t border-white/10 bg-black/60 px-6 py-3 text-xs text-white/60 backdrop-blur-sm">
                Showing the first {tableState.rows.length.toLocaleString()} of{" "}
                {tableState.totalRows.toLocaleString()} rows.
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center border border-dashed border-white/20">
            <div className="max-w-md text-center">
              <div className="mb-2 text-sm font-medium text-white/80">No Data</div>
              <div className="text-xs text-white/50">
                No rows were returned for this file. Try selecting a different file.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
