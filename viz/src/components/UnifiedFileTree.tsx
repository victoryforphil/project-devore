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
  onSelectColumn: (filePath: string, columnName: string) => void
  onRemoveFile: (path: string) => void
}

export function UnifiedFileTree({ files, metadata, onSelectColumn, onRemoveFile }: UnifiedFileTreeProps) {
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

    return root
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
            onClick={() => toggleExpanded(node.path)}
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
          <div>
            {node.metadata.columns
              .filter((col) => 
                !searchQuery || 
                col.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((column) => (
                <button
                  key={`${node.path}-${column.name}`}
                  onClick={() => onSelectColumn(node.path, column.name)}
                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-accent/50 transition-colors flex items-center gap-2 group"
                  style={{ paddingLeft: `${(node.level + 1) * 12 + 8}px` }}
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
      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {files.length} file{files.length !== 1 ? 's' : ''} • {metadata.reduce((sum, m) => sum + m.columns.length, 0)} column{metadata.reduce((sum, m) => sum + m.columns.length, 0) !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
