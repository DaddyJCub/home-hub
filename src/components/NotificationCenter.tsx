import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Bell, Broom, CalendarBlank, Check, Trash, X } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import type { Chore, CalendarEvent } from '@/lib/types'
import { getUpcomingChores, getUpcomingEvents } from '@/lib/notifications'

interface NotificationItem {
  id: string
  type: 'chore' | 'event'
  title: string
  body: string
  timestamp: number
  read: boolean
  actionId: string
}

interface NotificationCenterProps {
  chores: Chore[]
  events: CalendarEvent[]
}

export function NotificationCenter({ chores, events }: NotificationCenterProps) {
  const [notificationsRaw, setNotifications] = useKV<NotificationItem[]>('notification-history', [])
  const [isOpen, setIsOpen] = useState(false)
  const notifications = notificationsRaw ?? []

  const upcomingChores = getUpcomingChores(chores, 48)
  const upcomingEvents = getUpcomingEvents(events, 48)

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((current) =>
      (current ?? []).map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((current) =>
      (current ?? []).map(n => ({ ...n, read: true }))
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications((current) => (current ?? []).filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const combinedNotifications = [
    ...notifications,
    ...upcomingChores.slice(0, 3).map(chore => ({
      id: `chore-upcoming-${chore.id}`,
      type: 'chore' as const,
      title: `Upcoming: ${chore.title}`,
      body: `Due ${formatDistanceToNow(new Date(chore.dueAt || chore.nextDue!), { addSuffix: true })}${chore.assignedTo ? ` • ${chore.assignedTo}` : ''}`,
      timestamp: chore.dueAt || chore.nextDue || Date.now(),
      read: true,
      actionId: chore.id,
    })),
    ...upcomingEvents.slice(0, 3).map(event => ({
      id: `event-upcoming-${event.id}`,
      type: 'event' as const,
      title: `Upcoming: ${event.title}`,
      body: `${formatDistanceToNow(new Date(event.date), { addSuffix: true })}${event.location ? ` • ${event.location}` : ''}`,
      timestamp: new Date(event.date).getTime(),
      read: true,
      actionId: event.id,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell size={24} />
            Notifications
          </SheetTitle>
          <SheetDescription>
            Stay updated on your household tasks and events
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 mt-4 mb-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1">
              <Check size={14} />
              Mark all read
            </Button>
          )}
          {combinedNotifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll} className="gap-1">
              <Trash size={14} />
              Clear all
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] mt-4">
          {combinedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {combinedNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`p-3 rounded-lg border transition-colors ${
                      notification.read
                        ? 'bg-background'
                        : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {notification.type === 'chore' ? (
                          <Broom size={18} className="text-primary" />
                        ) : (
                          <CalendarBlank size={18} className="text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <Badge variant="default" className="text-xs shrink-0">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-6 w-6"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-6 w-6"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                  {index < combinedNotifications.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

export default NotificationCenter
