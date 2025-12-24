import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bell, BellSlash, Check, X, Broom, CalendarBlank, ShoppingCart, CookingPot, SpeakerHigh, Vibrate, Moon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  requestNotificationPermission,
  showNotification,
} from '@/lib/notifications'

export function NotificationSettings() {
  const [preferences = DEFAULT_NOTIFICATION_PREFERENCES, setPreferences] =
    useKV<NotificationPreferences>('notification-preferences', DEFAULT_NOTIFICATION_PREFERENCES)

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    setPermissionStatus(granted ? 'granted' : 'denied')

    if (granted) {
      setPreferences(prev => ({ ...(prev || DEFAULT_NOTIFICATION_PREFERENCES), enabled: true }))
      toast.success('Notifications enabled')
    } else {
      toast.error('Notification permission denied')
    }
  }

  const handleTestNotification = () => {
    showNotification('HomeHub Test Notification', {
      body: 'Notifications are working! You will receive reminders for chores and events.',
      tag: 'test-notification',
    }, preferences)
    toast.success('Test notification sent')
  }

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...(prev || DEFAULT_NOTIFICATION_PREFERENCES), [key]: value }))
  }

  const handleTimeChange = (key: keyof NotificationPreferences, value: string) => {
    setPreferences(prev => ({ ...(prev || DEFAULT_NOTIFICATION_PREFERENCES), [key]: value }))
  }

  const handleMinutesChange = (key: keyof NotificationPreferences, value: string) => {
    const minutes = parseInt(value, 10)
    if (!isNaN(minutes) && minutes >= 0) {
      setPreferences(prev => ({ ...(prev || DEFAULT_NOTIFICATION_PREFERENCES), [key]: minutes }))
    }
  }

  const notificationsSupported = typeof Notification !== 'undefined'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell size={24} />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get reminders for upcoming chores, events, shopping, and meals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!notificationsSupported && (
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            Notifications are not supported in this browser
          </div>
        )}

        {notificationsSupported && permissionStatus === 'denied' && (
          <div className="p-4 bg-destructive/10 rounded-lg text-sm text-destructive">
            Notifications have been blocked. Please enable them in your browser settings.
          </div>
        )}

        {notificationsSupported && permissionStatus !== 'granted' && (
          <Button onClick={handleEnableNotifications} className="w-full gap-2">
            <Bell />
            Enable Notifications
          </Button>
        )}

        {notificationsSupported && permissionStatus === 'granted' && (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Master Switch</Label>
                <p className="text-sm text-muted-foreground">Enable all notifications</p>
              </div>
              <Switch
                checked={preferences.enabled}
                onCheckedChange={value => handleToggle('enabled', value)}
              />
            </div>

            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="w-full gap-2"
            >
              <Bell />
              Send Test Notification
            </Button>

            {preferences.enabled && (
              <>
                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Broom size={20} className="text-primary" />
                      <div className="space-y-0.5">
                        <Label className="text-base">Chore Reminders</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified before chores are due
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.choresEnabled}
                      onCheckedChange={value => handleToggle('choresEnabled', value)}
                    />
                  </div>

                  {preferences.choresEnabled && (
                    <div className="ml-7 space-y-2">
                      <Label className="text-sm">Remind me</Label>
                      <Select
                        value={String(preferences.choreReminderMinutes)}
                        onValueChange={value => handleMinutesChange('choreReminderMinutes', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes before</SelectItem>
                          <SelectItem value="30">30 minutes before</SelectItem>
                          <SelectItem value="60">1 hour before</SelectItem>
                          <SelectItem value="120">2 hours before</SelectItem>
                          <SelectItem value="240">4 hours before</SelectItem>
                          <SelectItem value="1440">1 day before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarBlank size={20} className="text-primary" />
                      <div className="space-y-0.5">
                        <Label className="text-base">Event Reminders</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified before calendar events
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.eventsEnabled}
                      onCheckedChange={value => handleToggle('eventsEnabled', value)}
                    />
                  </div>

                  {preferences.eventsEnabled && (
                    <div className="ml-7 space-y-2">
                      <Label className="text-sm">Remind me</Label>
                      <Select
                        value={String(preferences.eventReminderMinutes)}
                        onValueChange={value => handleMinutesChange('eventReminderMinutes', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes before</SelectItem>
                          <SelectItem value="15">15 minutes before</SelectItem>
                          <SelectItem value="30">30 minutes before</SelectItem>
                          <SelectItem value="60">1 hour before</SelectItem>
                          <SelectItem value="120">2 hours before</SelectItem>
                          <SelectItem value="1440">1 day before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CookingPot size={20} className="text-primary" />
                      <div className="space-y-0.5">
                        <Label className="text-base">Meal Reminders</Label>
                        <p className="text-xs text-muted-foreground">
                          Remind about planned meals
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.mealsEnabled}
                      onCheckedChange={value => handleToggle('mealsEnabled', value)}
                    />
                  </div>

                  {preferences.mealsEnabled && (
                    <div className="ml-7 space-y-2">
                      <Label className="text-sm">Remind me</Label>
                      <Select
                        value={String(preferences.mealReminderMinutes)}
                        onValueChange={value => handleMinutesChange('mealReminderMinutes', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes before</SelectItem>
                          <SelectItem value="60">1 hour before</SelectItem>
                          <SelectItem value="120">2 hours before</SelectItem>
                          <SelectItem value="180">3 hours before</SelectItem>
                          <SelectItem value="240">4 hours before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={20} className="text-primary" />
                      <div className="space-y-0.5">
                        <Label className="text-base">Shopping Reminders</Label>
                        <p className="text-xs text-muted-foreground">
                          Remind about shopping list items
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.shoppingEnabled}
                      onCheckedChange={value => handleToggle('shoppingEnabled', value)}
                    />
                  </div>

                  {preferences.shoppingEnabled && (
                    <div className="ml-7 space-y-2">
                      <Label className="text-sm">Remind me</Label>
                      <Select
                        value={String(preferences.shoppingReminderMinutes)}
                        onValueChange={value => handleMinutesChange('shoppingReminderMinutes', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                          <SelectItem value="720">12 hours</SelectItem>
                          <SelectItem value="1440">1 day</SelectItem>
                          <SelectItem value="2880">2 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Notification Preferences</h3>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SpeakerHigh size={20} className="text-muted-foreground" />
                      <div className="space-y-0.5">
                        <Label>Sound</Label>
                        <p className="text-xs text-muted-foreground">Play sound with notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.soundEnabled}
                      onCheckedChange={value => handleToggle('soundEnabled', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Vibrate size={20} className="text-muted-foreground" />
                      <div className="space-y-0.5">
                        <Label>Vibration</Label>
                        <p className="text-xs text-muted-foreground">Vibrate on mobile devices</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.vibrationEnabled}
                      onCheckedChange={value => handleToggle('vibrationEnabled', value)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon size={20} className="text-muted-foreground" />
                      <div className="space-y-0.5">
                        <Label className="text-base">Quiet Hours</Label>
                        <p className="text-xs text-muted-foreground">
                          Pause notifications during specific hours
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.quietHoursEnabled}
                      onCheckedChange={value => handleToggle('quietHoursEnabled', value)}
                    />
                  </div>

                  {preferences.quietHoursEnabled && (
                    <div className="ml-7 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Start time</Label>
                        <Input
                          type="time"
                          value={preferences.quietHoursStart}
                          onChange={e => handleTimeChange('quietHoursStart', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">End time</Label>
                        <Input
                          type="time"
                          value={preferences.quietHoursEnd}
                          onChange={e => handleTimeChange('quietHoursEnd', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationSettings
