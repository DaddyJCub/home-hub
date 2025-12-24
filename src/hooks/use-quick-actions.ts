import { useEffect, useRef, useState } from 'react'
import { useKV } from '@github/spark/hooks'

interface QuickActionConfig {
  enabled: boolean
  longPressDuration: number
}

const DEFAULT_CONFIG: QuickActionConfig = {
  enabled: true,
  longPressDuration: 500,
}

interface UseQuickActionsProps {
  onAction: () => void
  hapticFeedback?: boolean
}

export function useQuickActions({ onAction, hapticFeedback = true }: UseQuickActionsProps) {
  const [config = DEFAULT_CONFIG] = useKV<QuickActionConfig>('quick-actions-config', DEFAULT_CONFIG)
  const [mobilePreferences = { quickActions: true, hapticFeedback: true }] = useKV<any>('mobile-preferences', { quickActions: true, hapticFeedback: true })
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [isLongPressing, setIsLongPressing] = useState(false)

  const triggerHaptic = () => {
    if (hapticFeedback && (mobilePreferences?.hapticFeedback ?? true)) {
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }
  }

  const handleStart = () => {
    if (!config.enabled || !(mobilePreferences?.quickActions ?? true)) return

    timeoutRef.current = setTimeout(() => {
      setIsLongPressing(true)
      triggerHaptic()
      onAction()
    }, config.longPressDuration)
  }

  const handleEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsLongPressing(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchCancel: handleEnd,
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
    isLongPressing,
  }
}
