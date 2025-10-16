import { useCallback } from 'react'
import { useDataSelection } from '@/contexts/DataSelectionContext'
import type { Selection, FileSelection, ColumnSelection } from '@/contexts/DataSelectionContext'

export interface UseDataResult {
  // Current selection
  selection: Selection
  isFile: boolean
  isColumn: boolean
  isMultiColumn: boolean
  
  // File selection data
  fileSelection?: FileSelection
  
  // Column selection data
  columnSelection?: ColumnSelection
  
  // Multi-column selection data
  multiColumnSelection?: import('@/contexts/DataSelectionContext').MultiColumnSelection
  
  // Loading state
  isLoadingMetadata: boolean
  error: string | null
  
  // Actions
  selectFile: (filePath: string) => Promise<void>
  selectColumn: (filePath: string, columnName: string) => void
  addColumnToSelection: (filePath: string, columnName: string) => void
  removeColumnFromSelection: (filePath: string, columnName: string) => void
  toggleColumnVisibility: (filePath: string, columnName: string) => void
  setAxisMapping: (axis: 'x' | 'y' | 'z' | 'scale', value: string | number | null) => void
  clearSelection: () => void
  
  // Helpers
  getSelectedFileName: () => string | null
  getSelectedColumnName: () => string | null
}

/**
 * Convenient hook for working with data selection
 * Provides typed access to file and column selections with helper methods
 */
export function useData(): UseDataResult {
  const {
    selection,
    isLoadingMetadata,
    error,
    selectFile,
    selectColumn,
    addColumnToSelection,
    removeColumnFromSelection,
    toggleColumnVisibility,
    setAxisMapping,
    clearSelection,
  } = useDataSelection()

  const isFile = selection?.type === 'file'
  const isColumn = selection?.type === 'column'
  const isMultiColumn = selection?.type === 'columns'

  const fileSelection = isFile ? (selection as FileSelection) : undefined
  const columnSelection = isColumn ? (selection as ColumnSelection) : undefined
  const multiColumnSelection = isMultiColumn ? (selection as import('@/contexts/DataSelectionContext').MultiColumnSelection) : undefined

  const getSelectedFileName = useCallback(() => {
    if (isFile && fileSelection) {
      return fileSelection.fileName
    }
    if (isColumn && columnSelection) {
      return columnSelection.filePath.split('/').pop() || null
    }
    if (isMultiColumn && multiColumnSelection && multiColumnSelection.fileMetadata) {
      return multiColumnSelection.fileMetadata.name
    }
    return null
  }, [isFile, isColumn, isMultiColumn, fileSelection, columnSelection, multiColumnSelection])

  const getSelectedColumnName = useCallback(() => {
    if (isColumn && columnSelection) {
      return columnSelection.columnName
    }
    return null
  }, [isColumn, columnSelection])

  return {
    selection,
    isFile,
    isColumn,
    isMultiColumn,
    fileSelection,
    columnSelection,
    multiColumnSelection,
    isLoadingMetadata,
    error,
    selectFile,
    selectColumn,
    addColumnToSelection,
    removeColumnFromSelection,
    toggleColumnVisibility,
    setAxisMapping,
    clearSelection,
    getSelectedFileName,
    getSelectedColumnName,
  }
}
