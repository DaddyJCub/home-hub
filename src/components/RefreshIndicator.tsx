import { motion, AnimatePresence } from 'framer-motion'
import { ArrowsClockwise } from '@phosphor-icons/react'

interface RefreshIndicatorProps {
  isPulling: boolean
  isRefreshing: boolean
  progress: number
}

export function RefreshIndicator({ isPulling, isRefreshing, progress }: RefreshIndicatorProps) {
  const show = isPulling || isRefreshing

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-4 bg-primary/10 backdrop-blur-sm"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : { rotate: progress * 360 }}
            transition={
              isRefreshing
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : { duration: 0 }
            }
          >
            <ArrowsClockwise
              size={24}
              className="text-primary"
              weight={isRefreshing ? 'bold' : 'regular'}
            />
          </motion.div>
          <span className="ml-2 text-sm font-medium text-primary">
            {isRefreshing ? 'Refreshing...' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default RefreshIndicator
