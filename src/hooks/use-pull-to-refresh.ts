import { useEffect, useRef, useState } from 'react'
import { useKV } from '@github/spark/hooks'

interface UsePullToRefreshProps {
  onRefresh: () => Promise<void> | void
  threshold?: number
  enabled?: boolean
}

export function usePullToRefresh({ onRefresh, threshold = 80, enabled = true }: UsePullToRefreshProps) {
  const [mobilePreferencesRaw] = useKV<any>('mobile-preferences', { pullToRefresh: true })
  const mobilePreferences = mobilePreferencesRaw ?? { pullToRefresh: true }
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const currentY = useRef(0)

  const isEnabled = enabled && (mobilePreferences?.pullToRefresh ?? true)

  useEffect(() => {
    if (!isEnabled) return

    let touchStartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY
        startY.current = touchStartY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY !== 0 || isRefreshing) return

      currentY.current = e.touches[0].clientY
      const distance = currentY.current - startY.current

      if (distance > 0 && distance < threshold * 2) {
        setIsPulling(true)
        setPullDistance(distance)
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setTimeout(() => {
            setIsRefreshing(false)
            setIsPulling(false)
            setPullDistance(0)
          }, 500)
        }
      } else {
        setIsPulling(false)
        setPullDistance(0)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isEnabled, onRefresh, threshold, isRefreshing, pullDistance])

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
  }
}
