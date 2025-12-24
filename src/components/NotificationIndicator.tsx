import { useKV } from '@github/spark/hooks'
import { Badge } from '@/components/ui/badge'
import { Bell, BellSlash } from '@phosphor-icons/react'
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  getUpcomingChores,
  getUpcomingEvents,
} from '@/lib/notifications'
import type { Chore, CalendarEvent } from '@/lib/types'

interface NotificationIndicatorProps {
  chores: Chore[]
  events: CalendarEvent[]
}

export function NotificationIndicator({ chores, events }: NotificationIndicatorProps) {
  const [preferences = DEFAULT_NOTIFICATION_PREFERENCES] = useKV<NotificationPreferences>(
    'notification-preferences',
    DEFAULT_NOTIFICATION_PREFERENCES
  )

  if (!preferences.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return null
  }

  const upcomingChores = preferences.choresEnabled ? getUpcomingChores(chores) : []
  const upcomingEvents = preferences.eventsEnabled ? getUpcomingEvents(events) : []
  const totalUpcoming = upcomingChores.length + upcomingEvents.length

  if (totalUpcoming === 0) {
    return null
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <Bell size={14} />
      {totalUpcoming}
    </Badge>
  )
}

export default NotificationIndicator
