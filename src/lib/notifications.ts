import type { Chore, CalendarEvent } from './types'
import { normalizeChore } from './chore-utils'
import { startOfDay, isSameDay, differenceInDays, format, formatDistanceToNow } from 'date-fns'
import { addSoftLog } from './softLog'

type NotificationKind = 'chore' | 'event' | 'shopping' | 'system'

export interface NotificationLogEntry {
  id: string
  title: string
  body?: string
  tag?: string
  type?: NotificationKind
  timestamp: number
  reason?: string
  data?: Record<string, any>
}

const SENT_CACHE_KEY = 'hh_notification_sent'
const LOG_KEY = 'hh_notification_log'

const MAX_LOG = 20
const scheduledTimers = new Map<string, number>()

function readSentCache(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(SENT_CACHE_KEY) || '{}')
  } catch (err) {
    console.warn('Failed to read notification sent cache', err)
    return {}
  }
}

function writeSentCache(cache: Record<string, number>) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SENT_CACHE_KEY, JSON.stringify(cache))
}

function canSendTag(tag?: string): boolean {
  if (!tag) return true
  const cache = readSentCache()
  const last = cache[tag]
  const now = Date.now()
  // expire entries after 3 days
  Object.keys(cache).forEach(k => {
    if (now - (cache[k] || 0) > 3 * 24 * 60 * 60 * 1000) {
      delete cache[k]
    }
  })
  if (last) {
    writeSentCache(cache)
    return false
  }
  cache[tag] = now
  writeSentCache(cache)
  return true
}

function appendNotificationLog(entry: NotificationLogEntry) {
  if (typeof localStorage === 'undefined') return
  try {
    const existing: NotificationLogEntry[] = JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
    const next = [{ ...entry, id: entry.id || `${entry.tag || 'log'}-${entry.timestamp}` }, ...existing]
      .slice(0, MAX_LOG)
    localStorage.setItem(LOG_KEY, JSON.stringify(next))
  } catch (err) {
    console.warn('Failed to append notification log', err)
  }
}

export function getNotificationLog(): NotificationLogEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
  } catch {
    return []
  }
}

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
  // Smart notification settings
  smartChoreReminders: boolean
  morningReminderTime: string
  eveningFollowUpTime: string
  urgentOverdueThreshold: number // days overdue before urgent notifications
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
  // Smart notification defaults
  smartChoreReminders: true,
  morningReminderTime: '09:00',
  eveningFollowUpTime: '19:00',
  urgentOverdueThreshold: 2,
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    addSoftLog('Notifications not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      addSoftLog('Notification permission denied')
    }
    return permission === 'granted'
  }

  addSoftLog('Notification permission blocked')
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

export function shouldSendNotification(preferences: NotificationPreferences, type: NotificationKind): boolean {
  if (!preferences.enabled) return false
  if (isInQuietHours(preferences)) return false
  if (type === 'chore' && !preferences.choresEnabled) return false
  if (type === 'event' && !preferences.eventsEnabled) return false
  if (type === 'shopping' && !preferences.shoppingEnabled) return false
  return true
}

export function showNotification(
  title: string,
  options?: (NotificationOptions & { reason?: string; type?: NotificationKind }),
  preferences?: NotificationPreferences
): void {
  if (Notification.permission === 'granted') {
    const prefs = preferences || DEFAULT_NOTIFICATION_PREFERENCES
    const { reason, type, ...restOptions } = options || {}
    const tag = (restOptions as any)?.tag as string | undefined

    if (tag && !canSendTag(tag)) {
      return
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: false,
      silent: !prefs.soundEnabled,
      ...restOptions,
    }

    const vibrationPattern = prefs.vibrationEnabled ? [200, 100, 200] : undefined
    const timestamp = Date.now()

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          ...defaultOptions,
          data: {
            version: 1,
            ...(defaultOptions as any).data
          },
          vibrate: vibrationPattern,
        } as any)
      })
    } else {
      new Notification(title, {
        ...defaultOptions,
        data: {
          version: 1,
          ...(defaultOptions as any).data
        }
      })
    }

    appendNotificationLog({
      id: tag ? `${tag}-${timestamp}` : `log-${timestamp}`,
      title,
      body: restOptions?.body,
      tag,
      timestamp,
      type,
      reason,
      data: (restOptions as any)?.data || undefined
    })
  } else {
    addSoftLog('Notification dropped: permission not granted', { title })
  }
}

export function scheduleChoreNotification(chore: Chore, reminderMinutes: number, preferences?: NotificationPreferences): void {
  const dueMs = chore.dueAt || (chore as any).nextDue
  if (!dueMs) return

  const dueTime = new Date(dueMs)
  const notificationTime = new Date(dueTime.getTime() - reminderMinutes * 60 * 1000)
  const now = new Date()
  const tag = `chore-${chore.id}-${dueMs}`

  if (notificationTime <= now) return

  const timeUntilNotification = notificationTime.getTime() - now.getTime()
  if (timeUntilNotification <= 0 || timeUntilNotification > 24 * 60 * 60 * 1000) return

  if (scheduledTimers.has(tag)) return

  const timerId = window.setTimeout(() => {
    scheduledTimers.delete(tag)
    showNotification(
      `Chore due: ${chore.title}`,
      {
        body: `${chore.assignedTo ? `${chore.assignedTo} • ` : ''}${format(dueTime, 'eee, h:mm a')} (${formatDistanceToNow(dueTime, { addSuffix: true })})`,
        tag,
        data: { type: 'chore', choreId: chore.id, url: '/?tab=chores&highlight=' + chore.id },
        reason: 'chore-upcoming',
        type: 'chore'
      },
      preferences
    )
  }, timeUntilNotification)

  scheduledTimers.set(tag, timerId)
}

export function scheduleEventNotification(event: CalendarEvent, reminderMinutes: number, preferences?: NotificationPreferences): void {
  const eventDateTime = parseEventDateTime(event)
  if (!eventDateTime) return

  const notificationTime = new Date(eventDateTime.getTime() - reminderMinutes * 60 * 1000)
  const now = new Date()
  const tag = `event-${event.id}-${eventDateTime.getTime()}`

  if (notificationTime <= now) return

  const timeUntilNotification = notificationTime.getTime() - now.getTime()

  if (timeUntilNotification > 0 && timeUntilNotification < 24 * 60 * 60 * 1000) {
    if (scheduledTimers.has(tag)) return
    const timerId = window.setTimeout(() => {
      scheduledTimers.delete(tag)
      showNotification(`Event reminder: ${event.title}`, {
        body: `${format(eventDateTime, 'eee, h:mm a')} (${formatDistanceToNow(eventDateTime, { addSuffix: true })})${event.location ? ` • ${event.location}` : ''}`,
        tag,
        data: { type: 'event', eventId: event.id, url: '/?tab=calendar&highlight=' + event.id },
        reason: 'event-upcoming',
        type: 'event'
      }, preferences)
    }, timeUntilNotification)
    scheduledTimers.set(tag, timerId)
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
    const due = chore.dueAt || chore.nextDue
    if (chore.completed || !due) return false
    return due > now && due <= cutoff
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

// ========== SMART CHORE NOTIFICATIONS ==========

/**
 * Gets chores that need attention today (overdue, due today, or due soon)
 */
export function getChoresNeedingAttention(chores: Chore[]): {
  overdue: Chore[]
  dueToday: Chore[]
  dueSoon: Chore[]
  highPriority: Chore[]
} {
  const now = new Date()
  const today = startOfDay(now)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  const overdue: Chore[] = []
  const dueToday: Chore[] = []
  const dueSoon: Chore[] = []
  const highPriority: Chore[] = []

  chores.forEach(chore => {
    const normalized = normalizeChore(chore)
    if (normalized.completed) return

    if (normalized.lastCompletedAt) {
      const lastCompletedDate = startOfDay(new Date(normalized.lastCompletedAt))
      if (isSameDay(lastCompletedDate, today)) return
    }

    const dueMs = normalized.dueAt
    if (dueMs) {
      const nextDue = new Date(dueMs)
      if (nextDue < today) {
        overdue.push(normalized)
        if (normalized.priority === 'high') highPriority.push(normalized)
      } else if (isSameDay(nextDue, today)) {
        dueToday.push(normalized)
        if (normalized.priority === 'high') highPriority.push(normalized)
      } else if (nextDue < tomorrow) {
        dueSoon.push(normalized)
      }
    }
  })

  return { overdue, dueToday, dueSoon, highPriority }
}

/**
 * Calculate urgency score for a chore (higher = more urgent)
 */
function getChoreUrgency(chore: Chore): number {
  let score = 0
  const now = Date.now()
  const nextDue = chore.dueAt || (chore as any).nextDue || now

  // Base score from how overdue
  const daysOverdue = Math.max(0, differenceInDays(now, nextDue))
  score += daysOverdue * 10

  // Priority multiplier
  if (chore.priority === 'high') score *= 2
  else if (chore.priority === 'low') score *= 0.5

  // Frequency bonus (daily chores are more urgent than monthly)
  const frequencyScores: Record<string, number> = {
    daily: 5,
    weekly: 3,
    biweekly: 2,
    monthly: 1,
    custom: 2,
    once: 0
  }
  score += frequencyScores[chore.frequency] || 0

  return score
}

/**
 * Schedule smart morning reminder for chores
 */
export function scheduleSmartMorningReminder(
  chores: Chore[],
  preferences: NotificationPreferences
): NodeJS.Timeout | null {
  if (!preferences.enabled || !preferences.smartChoreReminders || !preferences.choresEnabled) return null

  const now = new Date()
  const timeStr = preferences.morningReminderTime || DEFAULT_NOTIFICATION_PREFERENCES.morningReminderTime
  const [hours, minutes] = timeStr.split(':').map(Number)
  const targetTime = new Date(now)
  targetTime.setHours(hours, minutes, 0, 0)

  // If time has passed today, schedule for tomorrow
  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1)
  }

  const msUntilReminder = targetTime.getTime() - now.getTime()

  // Only schedule if within 24 hours
  if (msUntilReminder > 24 * 60 * 60 * 1000) return null

  return setTimeout(() => {
    const todayKey = startOfDay(new Date()).toDateString()
    const { overdue, dueToday, highPriority } = getChoresNeedingAttention(chores.map(normalizeChore))
    const totalPending = overdue.length + dueToday.length

    if (totalPending === 0) return
    if (!shouldSendNotification(preferences, 'chore')) return

    // Build notification message
    let title = '🌅 Morning Chore Summary'
    let body = ''

    if (overdue.length > 0) {
      body += `⚠️ ${overdue.length} overdue chore${overdue.length > 1 ? 's' : ''}`
      if (dueToday.length > 0) body += ` • `
    }
    if (dueToday.length > 0) {
      body += `📋 ${dueToday.length} due today`
    }

    // Add most urgent chore name
    const allUrgent = [...overdue, ...dueToday].sort((a, b) => getChoreUrgency(b) - getChoreUrgency(a))
    if (allUrgent.length > 0) {
      body += `\nTop priority: ${allUrgent[0].title}`
    }

    showNotification(
      title,
      {
        body,
        tag: `smart-morning-${todayKey}`,
        data: { type: 'chore', choreCount: totalPending, url: '/?tab=chores' },
        requireInteraction: highPriority.length > 0,
        reason: 'morning-summary',
        type: 'chore'
      },
      preferences
    )
  }, msUntilReminder)
}

/**
 * Schedule end-of-day follow-up for incomplete chores
 */
export function scheduleEveningFollowUp(
  chores: Chore[],
  preferences: NotificationPreferences
): NodeJS.Timeout | null {
  if (!preferences.enabled || !preferences.smartChoreReminders || !preferences.choresEnabled) return null

  const now = new Date()
  const timeStr = preferences.eveningFollowUpTime || DEFAULT_NOTIFICATION_PREFERENCES.eveningFollowUpTime
  const [hours, minutes] = timeStr.split(':').map(Number)
  const targetTime = new Date(now)
  targetTime.setHours(hours, minutes, 0, 0)

  // If time has passed today, schedule for tomorrow
  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1)
  }

  const msUntilReminder = targetTime.getTime() - now.getTime()

  // Only schedule if within 24 hours
  if (msUntilReminder > 24 * 60 * 60 * 1000) return null

  return setTimeout(() => {
    const { overdue, dueToday, highPriority } = getChoresNeedingAttention(chores)
    const incomplete = [...overdue, ...dueToday]

    if (incomplete.length === 0) {
      // All done! Send congratulatory message
      showNotification('🎉 All Chores Complete!', {
        body: 'Great job! You\'ve finished all your chores for today.',
        tag: `smart-evening-complete-${targetTime.toDateString()}`,
        data: { type: 'chore', url: '/?tab=chores' },
        reason: 'evening-summary',
        type: 'chore'
      }, preferences)
      return
    }

    if (!shouldSendNotification(preferences, 'chore')) return

    // Build follow-up notification
    const urgentCount = overdue.filter(c => 
      differenceInDays(Date.now(), c.dueAt || c.nextDue || Date.now()) >= preferences.urgentOverdueThreshold
    ).length

    let title = incomplete.length === 1 
      ? `📝 1 chore still pending` 
      : `📝 ${incomplete.length} chores still pending`
    
    let body = ''
    if (urgentCount > 0) {
      body += `🔴 ${urgentCount} urgently overdue\n`
    }

    // List top 3 incomplete chores
    const sortedIncomplete = incomplete.sort((a, b) => getChoreUrgency(b) - getChoreUrgency(a))
    const topChores = sortedIncomplete.slice(0, 3).map(c => c.title).join(', ')
    body += `Remaining: ${topChores}`
    if (sortedIncomplete.length > 3) {
      body += ` +${sortedIncomplete.length - 3} more`
    }

    showNotification(title, {
      body,
      tag: `smart-evening-${targetTime.toDateString()}`,
      data: { type: 'chore', choreCount: incomplete.length, url: '/?tab=chores' },
      requireInteraction: urgentCount > 0,
      reason: 'evening-followup',
      type: 'chore'
    }, preferences)
  }, msUntilReminder)
}

/**
 * Send urgent notification for severely overdue chores
 */
export function checkUrgentOverdueChores(
  chores: Chore[],
  preferences: NotificationPreferences
): void {
  if (!preferences.enabled || !preferences.choresEnabled) return
  if (!shouldSendNotification(preferences, 'chore')) return

  const urgentChores = chores.filter(chore => {
    const due = chore.dueAt || chore.nextDue
    if (chore.completed || !due) return false
    const daysOverdue = differenceInDays(Date.now(), due)
    return daysOverdue >= preferences.urgentOverdueThreshold
  })

  if (urgentChores.length === 0) return

  // Only send once per session (track with sessionStorage)
  const sessionKey = `urgent-notified-${new Date().toDateString()}`
  if (typeof sessionStorage !== 'undefined') {
    const alreadyNotified = sessionStorage.getItem(sessionKey)
    if (alreadyNotified) return
    sessionStorage.setItem(sessionKey, 'true')
  }

  const mostOverdue = urgentChores.sort((a, b) => (a.dueAt || a.nextDue || 0) - (b.dueAt || b.nextDue || 0))[0]
  const daysOverdue = differenceInDays(Date.now(), mostOverdue.dueAt || mostOverdue.nextDue || Date.now())

  showNotification('⚠️ Urgent: Overdue Chores', {
    body: `${urgentChores.length} chore${urgentChores.length > 1 ? 's are' : ' is'} ${daysOverdue}+ days overdue!\nMost urgent: ${mostOverdue.title}`,
    tag: 'urgent-overdue',
    data: { type: 'chore', url: '/?tab=chores', choreIds: urgentChores.map(c => c.id) },
    requireInteraction: true,
    reason: 'urgent-overdue',
    type: 'chore'
  }, preferences)
}

/**
 * Initialize all smart chore notifications
 */
export function initSmartChoreNotifications(
  chores: Chore[],
  preferences: NotificationPreferences
): { morningTimer: NodeJS.Timeout | null; eveningTimer: NodeJS.Timeout | null } {
  // Check for urgent overdue immediately
  checkUrgentOverdueChores(chores, preferences)

  // Schedule morning and evening notifications
  const morningTimer = scheduleSmartMorningReminder(chores, preferences)
  const eveningTimer = scheduleEveningFollowUp(chores, preferences)

  return { morningTimer, eveningTimer }
}
