import { useCallback } from 'react'
import { useDataSelection } from '@/contexts/DataSelectionContext'
import { useToast } from '@/lib/toast'

/**
 * Hook to handle file and column selection logic
 */
export function useFileSelection() {
  const { selectFile, selectColumn, addColumnToSelection, removeColumnFromSelection, selection } = useDataSelection()
  const { success, error: showError, info } = useToast()

  const handleSelectFile = useCallback(async (filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath
    info(`Loading ${fileName}...`)
    
    try {
      await selectFile(filePath)
      success(`✓ Loaded file metadata`)
    } catch (err: any) {
      showError(`Failed to load file: ${err.message}`)
    }
  }, [selectFile, success, showError, info])

  const handleSelectColumn = useCallback((filePath: string, columnName: string) => {
    selectColumn(filePath, columnName)
    info(`Selected: ${columnName}`)
  }, [selectColumn, info])

  const handleToggleColumnSelection = useCallback((filePath: string, columnName: string) => {
    const selectedColumns = 
      selection?.type === 'columns' 
        ? selection.columns.map(c => ({ filePath: c.filePath, columnName: c.columnName }))
        : selection?.type === 'column'
        ? [{ filePath: selection.filePath, columnName: selection.columnName }]
        : []

    const isAlreadySelected = selectedColumns.some(
      sc => sc.filePath === filePath && sc.columnName === columnName
    )
    
    if (isAlreadySelected) {
      removeColumnFromSelection(filePath, columnName)
      info(`Removed: ${columnName}`)
    } else {
      addColumnToSelection(filePath, columnName)
      info(`Added: ${columnName}`)
    }
  }, [selection, addColumnToSelection, removeColumnFromSelection, info])

  const getSelectedColumns = useCallback(() => {
    if (selection?.type === 'columns') {
      return selection.columns.map(c => ({ filePath: c.filePath, columnName: c.columnName }))
    } else if (selection?.type === 'column') {
      return [{ filePath: selection.filePath, columnName: selection.columnName }]
    }
    return []
  }, [selection])

  return {
    handleSelectFile,
    handleSelectColumn,
    handleToggleColumnSelection,
    getSelectedColumns,
  }
}
