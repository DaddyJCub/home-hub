import { WifiSlash, ArrowsClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { motion, AnimatePresence } from 'framer-motion'

export function OfflineIndicator() {
  const { isOnline, updateAvailable, applyUpdate } = useServiceWorker()

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

export default OfflineIndicator
