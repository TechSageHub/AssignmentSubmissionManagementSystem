import { AlertCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorState({ message = 'Something went wrong while loading this page.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div>
        <p className="font-medium text-foreground">Failed to load data</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>}
      </div>
      {action}
    </div>
  )
}