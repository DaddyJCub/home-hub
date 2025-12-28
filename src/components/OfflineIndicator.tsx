import { WifiSlash, ArrowsClockwise, Warning, ClockCounterClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { formatDistanceToNow } from 'date-fns'

export function OfflineIndicator() {
  const { isOnline, updateAvailable, applyUpdate } = useServiceWorker()
  const sync = useSyncStatus()
  const lastSync = sync.lastSuccess
    ? `Synced ${formatDistanceToNow(sync.lastSuccess, { addSuffix: true })}`
    : 'Not synced yet'

  return (
    <>
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <WifiSlash size={16} />
              <span>You're offline - Changes will sync when connection returns</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOnline && sync.state === 'syncing' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-auto md:right-4 md:max-w-sm z-50 bg-secondary text-secondary-foreground px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-2 text-sm">
              <ArrowsClockwise size={16} className="animate-spin" />
              <span>Syncing changes…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOnline && sync.state === 'error' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-auto md:right-4 md:max-w-sm z-50 bg-amber-100 text-amber-900 px-4 py-3 rounded-lg shadow-lg dark:bg-amber-900/30 dark:text-amber-50"
          >
            <div className="flex items-center gap-2 text-sm">
              <Warning size={16} />
              <span>Sync failed. Will retry when possible.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 left-4 md:left-6 z-40 flex items-center gap-2 bg-muted/80 backdrop-blur px-3 py-2 rounded-full text-xs text-muted-foreground shadow-sm">
        <ClockCounterClockwise size={14} />
        <span>{lastSync}</span>
      </div>

      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-accent text-accent-foreground px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowsClockwise size={18} />
                <span className="text-sm font-medium">Update available</span>
              </div>
              <Button onClick={applyUpdate} size="sm" variant="secondary">
                Update
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
