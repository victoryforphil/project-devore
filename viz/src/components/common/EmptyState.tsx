import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
