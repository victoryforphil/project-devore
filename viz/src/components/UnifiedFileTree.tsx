import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Folder, File as FileIcon, Columns3, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import type { ParquetFileMetadata } from '@/hooks/useParquetMetadata'
import type { FileSystemItem } from '@/contexts/FileSystemContext'

interface TreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  children?: TreeNode[]
  metadata?: ParquetFileMetadata
  level: number
}

interface UnifiedFileTreeProps {
  files: FileSystemItem[]
  metadata: ParquetFileMetadata[]
  onSelectFile?: (filePath: string) => void
  onSelectColumn: (filePath: string, columnName: string) => void
  onAddColumnToSelection: (filePath: string, columnName: string) => void
  onRemoveFile: (path: string) => void
  selectedColumns?: Array<{ filePath: string; columnName: string }>
}

export function UnifiedFileTree({ files, metadata, onSelectFile, onSelectColumn, onAddColumnToSelection, onRemoveFile, selectedColumns = [] }: UnifiedFileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Build tree structure from file paths
  const tree = useMemo(() => {
    const root: TreeNode[] = []

    files.forEach((file) => {
      const parts = file.path.split('/')
      let currentLevel = root
      let currentPath = ''

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        const isFile = index === parts.length - 1

        let node = currentLevel.find((n) => n.name === part)
        
        if (!node) {
          node = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            level: index,
            children: isFile ? undefined : [],
          }

          if (isFile) {
            node.metadata = metadata.find((m) => m.path === file.path)
          }

          currentLevel.push(node)
        }

        if (!isFile && node.children) {
          currentLevel = node.children
        }
      })
    })

    // Sort nodes recursively by name
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.sort((a, b) => {
        // Folders first, then files
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1
        }
        // Alphabetical within same type
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      }).map(node => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined
      }))
    }

    return sortNodes(root)
  }, [files, metadata])

  // Filter tree based on search
  const filterTree = (nodes: TreeNode[]): TreeNode[] => {
    if (!searchQuery) return nodes

    const query = searchQuery.toLowerCase()
    
    return nodes.reduce<TreeNode[]>((acc, node) => {
      const nameMatches = node.name.toLowerCase().includes(query)
      const columnsMatch = node.metadata?.columns.some((col) =>
        col.name.toLowerCase().includes(query)
      )

      if (node.type === 'folder' && node.children) {
        const filteredChildren = filterTree(node.children)
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren })
        }
      } else if (nameMatches || columnsMatch) {
        acc.push(node)
      }

      return acc
    }, [])
  }

  const filteredTree = useMemo(() => filterTree(tree), [tree, searchQuery])

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  const renderNode = (node: TreeNode) => {
    const isExpanded = expandedPaths.has(node.path)
    const hasChildren = node.children && node.children.length > 0
    const hasColumns = node.metadata && node.metadata.columns.length > 0

    return (
      <div key={node.path}>
        {/* Node Button */}
        <div className="flex items-center gap-1 group">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-sm h-7 px-2"
            onClick={() => {
              if (node.type === 'file') {
                // Always expand file when clicked
                if (!expandedPaths.has(node.path)) {
                  setExpandedPaths(new Set(expandedPaths).add(node.path))
                } else {
                  toggleExpanded(node.path)
                }
                // Also call onSelectFile if provided
                if (onSelectFile) {
                  onSelectFile(node.path)
                }
              } else {
                toggleExpanded(node.path)
              }
            }}
            style={{ paddingLeft: `${node.level * 12 + 8}px` }}
          >
            {(hasChildren || hasColumns) && (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 mr-1 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 mr-1 flex-shrink-0" />
                )}
              </>
            )}
            {node.type === 'folder' ? (
              <Folder className="h-3 w-3 mr-1.5 flex-shrink-0 text-muted-foreground" />
            ) : (
              <FileIcon className="h-3 w-3 mr-1.5 flex-shrink-0 text-blue-500" />
            )}
            <span className="truncate text-xs">{node.name}</span>
            {node.metadata && (
              <span className="text-xs text-muted-foreground ml-auto">
                ({node.metadata.columns.length})
              </span>
            )}
          </Button>
          {node.type === 'file' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => onRemoveFile(node.path)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Render children (folders) */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => renderNode(child))}
          </div>
        )}

        {/* Render columns */}
        {isExpanded && hasColumns && node.metadata && (
          <div className="space-y-0.5 py-1">
            {node.metadata.columns
              .filter((col) => 
                !searchQuery || 
                col.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((column) => {
                const isSelected = selectedColumns.some(
                  (sc) => sc.filePath === node.path && sc.columnName === column.name
                )
                return (
                  <button
                    key={`${node.path}-${column.name}`}
                    onClick={() => {
                      // Toggle selection
                      if (isSelected) {
                        // If already selected, it's part of multi-selection, so remove it
                        // We need to check if it's the only one selected
                        if (selectedColumns.length === 1) {
                          // Clear selection completely
                          onSelectColumn(node.path, column.name) // This will replace with single
                          setTimeout(() => onSelectColumn(node.path, ''), 0) // Then clear
                        } else {
                          // Remove from multi-selection (handled by Inspector)
                          onSelectColumn(node.path, column.name) // Deselect by selecting same
                        }
                      } else {
                        // Add to selection
                        onAddColumnToSelection(node.path, column.name)
                      }
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-all flex items-center gap-2 group relative ${
                      isSelected 
                        ? 'bg-primary/15 hover:bg-primary/20 border-l-2 border-primary' 
                        : 'hover:bg-accent/50'
                    }`}
                    style={{ paddingLeft: `${(node.level + 1) * 12 + 8}px` }}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                    
                    <Columns3 className={`h-3 w-3 flex-shrink-0 transition-colors ${
                      isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`} />
                    
                    <span className={`truncate flex-1 transition-all ${
                      isSelected ? 'font-semibold text-primary' : 'group-hover:translate-x-0.5'
                    }`}>
                      {column.name}
                    </span>
                    
                    <span className={`text-xs font-mono transition-opacity flex-shrink-0 ${
                      isSelected 
                        ? 'opacity-70 text-primary' 
                        : 'opacity-0 group-hover:opacity-60 text-muted-foreground'
                    }`}>
                      {column.type}
                    </span>
                  </button>
                )
              })}
          </div>
        )}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-sm text-muted-foreground p-4">
          Open a folder with parquet files to begin
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files and columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 pr-7 text-xs"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredTree.length > 0 ? (
            filteredTree.map((node) => renderNode(node))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Stats Footer */}
      <div className="border-t border-border px-3 py-2 space-y-1">
        <div className="text-xs text-muted-foreground">
          {files.length} file{files.length !== 1 ? 's' : ''} • {metadata.reduce((sum, m) => sum + m.columns.length, 0)} column{metadata.reduce((sum, m) => sum + m.columns.length, 0) !== 1 ? 's' : ''}
        </div>
        <div className="text-xs text-muted-foreground/70 italic">
          💡 Click columns to toggle selection
        </div>
      </div>
    </div>
  )
}
