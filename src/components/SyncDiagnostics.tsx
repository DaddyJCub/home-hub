import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { retrySyncNow, clearSyncQueue } from '@/shims/spark-hooks'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface SyncDiagnosticsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SyncDiagnostics({ open, onOpenChange }: SyncDiagnosticsProps) {
  const status = useSyncStatus()

  const lastSuccessLabel = useMemo(() => {
    if (!status.lastSuccess) return 'Never'
    return formatDistanceToNow(status.lastSuccess, { addSuffix: true })
  }, [status.lastSuccess])

  const handleRetry = async () => {
    await retrySyncNow()
    toast.info('Retrying sync')
  }

  const handleClearQueue = () => {
    clearSyncQueue()
    toast.success('Cleared pending sync queue')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sync diagnostics</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{status.state}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Online</span>
            <span className="font-medium">{status.isOnline ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last success</span>
            <span className="font-medium">{lastSuccessLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pending queue</span>
            <span className="font-medium">{status.queueSize ?? 0}</span>
          </div>
          {status.lastError && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-2.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last error</p>
              <p className="text-sm font-medium">{status.lastError.message}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(status.lastError.timestamp, { addSuffix: true })}
              </p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleRetry} className="flex-1">
              Retry sync
            </Button>
            <Button variant="secondary" onClick={handleClearQueue}>
              Clear queue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
