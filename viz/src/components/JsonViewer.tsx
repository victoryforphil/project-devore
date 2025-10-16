import { useMemo } from 'react'

interface JsonViewerProps {
  data: any
  level?: number
}

export function JsonViewer({ data, level = 0 }: JsonViewerProps) {
  const indent = level * 16

  const renderValue = useMemo(() => {
    if (data === null) {
      return <span className="text-purple-500">null</span>
    }

    if (data === undefined) {
      return <span className="text-purple-500">undefined</span>
    }

    if (typeof data === 'boolean') {
      return <span className="text-orange-500">{String(data)}</span>
    }

    if (typeof data === 'number') {
      return <span className="text-blue-500">{data}</span>
    }

    if (typeof data === 'string') {
      return <span className="text-green-600">"{data}"</span>
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <span className="text-muted-foreground">[]</span>
      }

      return (
        <div className="space-y-1">
          <span className="text-muted-foreground">[</span>
          {data.map((item, index) => (
            <div key={index} style={{ paddingLeft: `${indent + 16}px` }}>
              <JsonViewer data={item} level={level + 1} />
              {index < data.length - 1 && <span className="text-muted-foreground">,</span>}
            </div>
          ))}
          <div style={{ paddingLeft: `${indent}px` }}>
            <span className="text-muted-foreground">]</span>
          </div>
        </div>
      )
    }

    if (typeof data === 'object') {
      const entries = Object.entries(data)
      
      if (entries.length === 0) {
        return <span className="text-muted-foreground">{'{}'}</span>
      }

      return (
        <div className="space-y-1">
          <span className="text-muted-foreground">{'{'}</span>
          {entries.map(([key, value], index) => (
            <div key={key} style={{ paddingLeft: `${indent + 16}px` }} className="flex gap-2">
              <span className="text-cyan-600 font-medium">"{key}":</span>
              <JsonViewer data={value} level={level + 1} />
              {index < entries.length - 1 && <span className="text-muted-foreground">,</span>}
            </div>
          ))}
          <div style={{ paddingLeft: `${indent}px` }}>
            <span className="text-muted-foreground">{'}'}</span>
          </div>
        </div>
      )
    }

    return <span className="text-muted-foreground">{String(data)}</span>
  }, [data, level, indent])

  return <div className="font-mono text-xs leading-relaxed">{renderValue}</div>
}
