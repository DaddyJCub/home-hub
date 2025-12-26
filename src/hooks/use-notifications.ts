import { useEffect, useCallback, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Chore, CalendarEvent } from '@/lib/types'
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  checkAndScheduleNotifications,
  initSmartChoreNotifications,
} from '@/lib/notifications'

export function useNotifications(chores: Chore[], events: CalendarEvent[]) {
  const [preferencesRaw] = useKV<NotificationPreferences>(
    'notification-preferences',
    DEFAULT_NOTIFICATION_PREFERENCES
  )
  // Merge with defaults to ensure new properties are always available
  const preferences = preferencesRaw 
    ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...preferencesRaw }
    : DEFAULT_NOTIFICATION_PREFERENCES

  // Track smart notification timers
  const smartTimersRef = useRef<{ morningTimer: NodeJS.Timeout | null; eveningTimer: NodeJS.Timeout | null }>({
    morningTimer: null,
    eveningTimer: null,
  })

  const scheduleNotifications = useCallback(() => {
    if (preferences.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      checkAndScheduleNotifications(chores, events, preferences)
    }
  }, [chores, events, preferences])

  // Initialize smart chore notifications
  useEffect(() => {
    if (!preferences.enabled || !preferences.smartChoreReminders) return

    // Clear existing smart timers
    if (smartTimersRef.current.morningTimer) {
      clearTimeout(smartTimersRef.current.morningTimer)
    }
    if (smartTimersRef.current.eveningTimer) {
      clearTimeout(smartTimersRef.current.eveningTimer)
    }

    // Initialize smart notifications
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      smartTimersRef.current = initSmartChoreNotifications(chores, preferences)
    }

    return () => {
      if (smartTimersRef.current.morningTimer) {
        clearTimeout(smartTimersRef.current.morningTimer)
      }
      if (smartTimersRef.current.eveningTimer) {
        clearTimeout(smartTimersRef.current.eveningTimer)
      }
    }
  }, [chores, preferences])

  useEffect(() => {
    scheduleNotifications()

    const interval = setInterval(() => {
      scheduleNotifications()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [scheduleNotifications])

  return { preferences, scheduleNotifications }
}
