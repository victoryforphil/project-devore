import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore } from '@/lib/toast'
import { Button } from '@/components/ui/button'

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  if (toasts.length === 0) return null

  const typeConfig = {
    success: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600 dark:text-green-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-200 dark:border-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-600 dark:text-red-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Info,
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
  }

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-md">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type]
        const Icon = config.icon

        return (
          <div
            key={toast.id}
            className={`${config.bg} ${config.border} border rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-right-4 duration-200`}
          >
            <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
            <div className="flex-1 text-sm">
              <p className="text-foreground">{toast.message}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => removeToast(toast.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
