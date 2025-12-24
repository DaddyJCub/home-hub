import type { Chore, CalendarEvent } from './types'

export interface NotificationPreferences {
  enabled: boolean
  choresEnabled: boolean
  eventsEnabled: boolean
  shoppingEnabled: boolean
  mealsEnabled: boolean
  choreReminderMinutes: number
  eventReminderMinutes: number
  shoppingReminderMinutes: number
  mealReminderMinutes: number
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  dailySummaryEnabled: boolean
  dailySummaryTime: string
  weeklyReviewEnabled: boolean
  weeklyReviewDay: number
  weeklyReviewTime: string
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  choresEnabled: true,
  eventsEnabled: true,
  shoppingEnabled: false,
  mealsEnabled: true,
  choreReminderMinutes: 60,
  eventReminderMinutes: 30,
  shoppingReminderMinutes: 1440,
  mealReminderMinutes: 120,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  soundEnabled: true,
  vibrationEnabled: true,
  dailySummaryEnabled: false,
  dailySummaryTime: '08:00',
  weeklyReviewEnabled: false,
  weeklyReviewDay: 1,
  weeklyReviewTime: '18:00',
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export function isInQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHoursEnabled) return false

  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const start = preferences.quietHoursStart
  const end = preferences.quietHoursEnd

  if (start < end) {
    return currentTime >= start && currentTime < end
  } else {
    return currentTime >= start || currentTime < end
  }
}

export function shouldSendNotification(preferences: NotificationPreferences, type: 'chore' | 'event'): boolean {
  if (!preferences.enabled) return false
  if (isInQuietHours(preferences)) return false
  if (type === 'chore' && !preferences.choresEnabled) return false
  if (type === 'event' && !preferences.eventsEnabled) return false
  return true
}

export function showNotification(title: string, options?: NotificationOptions, preferences?: NotificationPreferences): void {
  if (Notification.permission === 'granted') {
    const prefs = preferences || DEFAULT_NOTIFICATION_PREFERENCES
    const defaultOptions: NotificationOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: false,
      silent: !prefs.soundEnabled,
      ...options,
    }

    const vibrationPattern = prefs.vibrationEnabled ? [200, 100, 200] : undefined

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          ...defaultOptions,
          vibrate: vibrationPattern,
        } as any)
      })
    } else {
      new Notification(title, defaultOptions)
    }
  }
}

export function scheduleChoreNotification(chore: Chore, reminderMinutes: number, preferences?: NotificationPreferences): void {
  if (!chore.nextDue) return

  const dueTime = new Date(chore.nextDue)
  const notificationTime = new Date(dueTime.getTime() - reminderMinutes * 60 * 1000)
  const now = new Date()

  if (notificationTime <= now) return

  const timeUntilNotification = notificationTime.getTime() - now.getTime()

  if (timeUntilNotification > 0 && timeUntilNotification < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      showNotification(`Chore Reminder: ${chore.title}`, {
        body: `Due ${formatRelativeTime(dueTime)}${chore.assignedTo ? ` • Assigned to ${chore.assignedTo}` : ''}`,
        tag: `chore-${chore.id}`,
        data: { type: 'chore', choreId: chore.id },
      }, preferences)
    }, timeUntilNotification)
  }
}

export function scheduleEventNotification(event: CalendarEvent, reminderMinutes: number, preferences?: NotificationPreferences): void {
  const eventDateTime = parseEventDateTime(event)
  if (!eventDateTime) return

  const notificationTime = new Date(eventDateTime.getTime() - reminderMinutes * 60 * 1000)
  const now = new Date()

  if (notificationTime <= now) return

  const timeUntilNotification = notificationTime.getTime() - now.getTime()

  if (timeUntilNotification > 0 && timeUntilNotification < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      showNotification(`Event Reminder: ${event.title}`, {
        body: `${formatRelativeTime(eventDateTime)}${event.location ? ` • ${event.location}` : ''}`,
        tag: `event-${event.id}`,
        data: { type: 'event', eventId: event.id },
      }, preferences)
    }, timeUntilNotification)
  }
}

function parseEventDateTime(event: CalendarEvent): Date | null {
  if (!event.date) return null

  const dateStr = event.startTime
    ? `${event.date}T${event.startTime}`
    : `${event.date}T00:00`

  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 0) return 'now'
  if (diffMins < 60) return `in ${diffMins} min`
  if (diffMins < 120) return 'in 1 hour'
  if (diffMins < 1440) return `in ${Math.floor(diffMins / 60)} hours`
  if (diffMins < 2880) return 'tomorrow'
  return `in ${Math.floor(diffMins / 1440)} days`
}

export function getUpcomingChores(chores: Chore[], hours: number = 24): Chore[] {
  const now = new Date().getTime()
  const cutoff = now + hours * 60 * 60 * 1000

  return chores.filter(chore => {
    if (chore.completed || !chore.nextDue) return false
    return chore.nextDue > now && chore.nextDue <= cutoff
  })
}

export function getUpcomingEvents(events: CalendarEvent[], hours: number = 24): CalendarEvent[] {
  const now = new Date()
  const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000)

  return events.filter(event => {
    const eventDate = parseEventDateTime(event)
    if (!eventDate) return false
    return eventDate > now && eventDate <= cutoff
  })
}

export function checkAndScheduleNotifications(
  chores: Chore[],
  events: CalendarEvent[],
  preferences: NotificationPreferences
): void {
  if (!preferences.enabled) return

  if (preferences.choresEnabled) {
    const upcomingChores = getUpcomingChores(chores)
    upcomingChores.forEach(chore => {
      if (shouldSendNotification(preferences, 'chore')) {
        scheduleChoreNotification(chore, preferences.choreReminderMinutes, preferences)
      }
    })
  }

  if (preferences.eventsEnabled) {
    const upcomingEvents = getUpcomingEvents(events)
    upcomingEvents.forEach(event => {
      if (shouldSendNotification(preferences, 'event')) {
        scheduleEventNotification(event, preferences.eventReminderMinutes, preferences)
      }
    })
  }
}
