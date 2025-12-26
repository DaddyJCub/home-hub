import { useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Chore, CalendarEvent } from '@/lib/types'
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  checkAndScheduleNotifications,
} from '@/lib/notifications'

export function useNotifications(chores: Chore[], events: CalendarEvent[]) {
  const [preferencesRaw] = useKV<NotificationPreferences>(
    'notification-preferences',
    DEFAULT_NOTIFICATION_PREFERENCES
  )
  const preferences = preferencesRaw ?? DEFAULT_NOTIFICATION_PREFERENCES

  const scheduleNotifications = useCallback(() => {
    if (preferences.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      checkAndScheduleNotifications(chores, events, preferences)
    }
  }, [chores, events, preferences])

  useEffect(() => {
    scheduleNotifications()

    const interval = setInterval(() => {
      scheduleNotifications()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [scheduleNotifications])

  return { preferences, scheduleNotifications }
}
