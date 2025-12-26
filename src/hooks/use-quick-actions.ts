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
  const [configRaw] = useKV<QuickActionConfig>('quick-actions-config', DEFAULT_CONFIG)
  const [mobilePreferencesRaw] = useKV<any>('mobile-preferences', { quickActions: true, hapticFeedback: true })
  const config = configRaw ?? DEFAULT_CONFIG
  const mobilePreferences = mobilePreferencesRaw ?? { quickActions: true, hapticFeedback: true }
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
