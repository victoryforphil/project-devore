import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface PanelHeaderProps {
  title: string
  icon?: LucideIcon
  badge?: string | number
  action?: {
    icon: LucideIcon
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

export function PanelHeader({ title, icon: Icon, badge, action, children }: PanelHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h2 className="font-semibold text-sm">{title}</h2>
          {badge !== undefined && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {action && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={action.onClick}
          >
            <action.icon className="h-3.5 w-3.5" />
            <span className="ml-1.5 text-xs">{action.label}</span>
          </Button>
        )}
        {children}
      </div>
    </div>
  )
}
