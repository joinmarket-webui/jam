import { useMemo, useState } from 'react'
import { AlertCircleIcon, CloudOffIcon, ListRestartIcon, RefreshCwIcon, Trash2Icon, WifiIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn, shortenStringMiddle } from '@/lib/utils'
import { selectConnectionUnavailable, connectivityStore } from '@/store/connectivityStore'
import { getOfflineActionLabel, offlineActionQueueStore, type OfflineAction } from '@/store/offlineActionQueueStore'

const actionStatusLabel: Record<OfflineAction['status'], string> = {
  queued: 'Queued',
  retrying: 'Retrying',
  failed: 'Failed',
}

const actionStatusBadgeVariant = (status: OfflineAction['status']) => {
  switch (status) {
    case 'retrying':
      return 'secondary' as const
    case 'failed':
      return 'destructive' as const
    case 'queued':
      return 'outline' as const
    default:
      return 'outline' as const
  }
}

const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

interface OfflineActionRowProps {
  action: OfflineAction
  onRetry: (action: OfflineAction) => void
  onCancel: (action: OfflineAction) => void
}

const OfflineActionRow = ({ action, onRetry, onCancel }: OfflineActionRowProps) => {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">{getOfflineActionLabel(action)}</p>
          {action.meta?.summary && (
            <p className="text-muted-foreground text-xs" title={action.meta.summary}>
              {shortenStringMiddle(action.meta.summary, 88)}
            </p>
          )}
        </div>
        <Badge variant={actionStatusBadgeVariant(action.status)}>{actionStatusLabel[action.status]}</Badge>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
        <span>Attempts: {action.attempts}</span>
        <span>Created: {formatDateTime(action.createdAt)}</span>
        {action.nextRetryAt && <span>Next retry: {formatDateTime(action.nextRetryAt)}</span>}
      </div>

      {action.lastError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircleIcon />
          <AlertDescription>{action.lastError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRetry(action)}
          disabled={action.status === 'retrying'}
          title="Retry this action now"
        >
          <ListRestartIcon />
          Retry now
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onCancel(action)} title="Cancel this queued action">
          <Trash2Icon />
          Cancel
        </Button>
      </div>
    </div>
  )
}

export const OfflineActionQueueWidget = () => {
  const [open, setOpen] = useState(false)

  const actions = useStore(offlineActionQueueStore, (state) => state.actions)
  const requestRetry = useStore(offlineActionQueueStore, (state) => state.requestRetry)
  const removeAction = useStore(offlineActionQueueStore, (state) => state.remove)

  const browserOnline = useStore(connectivityStore, (state) => state.browserOnline)
  const connectionUnavailable = useStore(connectivityStore, selectConnectionUnavailable)

  const sortedActions = useMemo(() => {
    return actions.toSorted((a, b) => b.createdAt - a.createdAt)
  }, [actions])

  const retryingCount = useMemo(() => actions.filter((action) => action.status === 'retrying').length, [actions])
  const failedCount = useMemo(() => actions.filter((action) => action.status === 'failed').length, [actions])
  const queuedCount = useMemo(() => actions.filter((action) => action.status === 'queued').length, [actions])

  const shouldShowWidget = connectionUnavailable || actions.length > 0

  const handleRetry = (action: OfflineAction) => {
    requestRetry(action.id)
    toast.info(`${getOfflineActionLabel(action)} will retry shortly.`)
  }

  const handleCancel = (action: OfflineAction) => {
    removeAction(action.id)
    toast.info(`${getOfflineActionLabel(action)} was canceled.`)
  }

  if (!shouldShowWidget) {
    return null
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('fixed right-4 bottom-4 z-50 h-auto gap-2 px-3 py-2 shadow-lg', {
          'light:bg-yellow-200 light:text-yellow-900 bg-yellow-700 text-white hover:bg-yellow-600':
            connectionUnavailable,
          'light:bg-red-200 light:text-red-900 bg-red-700 text-white hover:bg-red-600': failedCount > 0,
        })}
        variant={connectionUnavailable || failedCount > 0 ? 'default' : 'outline'}
      >
        {retryingCount > 0 ? <RefreshCwIcon className="motion-safe:animate-spin" /> : <CloudOffIcon />}
        <span className="text-xs font-medium">Action queue</span>
        <Badge variant="secondary" className="ml-1">
          {actions.length}
        </Badge>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Offline action queue</DialogTitle>
            <DialogDescription>
              Retryable wallet operations are queued here when the app is offline or the API is unreachable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {connectionUnavailable ? (
              <Alert variant="warning">
                <CloudOffIcon />
                <AlertTitle>{browserOnline ? 'API unreachable' : 'You are offline'}</AlertTitle>
                <AlertDescription>
                  Actions are queued and retried automatically with backoff until connectivity is restored.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="success">
                <WifiIcon />
                <AlertTitle>Connection healthy</AlertTitle>
                <AlertDescription>
                  {retryingCount > 0
                    ? 'Queued actions are currently being retried.'
                    : 'New actions run immediately while queued ones continue in the background.'}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
              <span>Queued: {queuedCount}</span>
              <span>Retrying: {retryingCount}</span>
              <span>Failed: {failedCount}</span>
            </div>

            {sortedActions.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border p-4 text-sm">No queued actions.</div>
            ) : (
              <div className="space-y-3">
                {sortedActions.map((action) => (
                  <OfflineActionRow key={action.id} action={action} onRetry={handleRetry} onCancel={handleCancel} />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
