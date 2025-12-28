import { useEffect, useState } from 'react'
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
import { Bell, BellSlash, Check, X, Broom, CalendarBlank, ShoppingCart, CookingPot, SpeakerHigh, Vibrate, Moon, Brain, SunHorizon, MoonStars, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  requestNotificationPermission,
  showNotification,
  getNotificationLog,
  type NotificationLogEntry,
} from '@/lib/notifications'

export function NotificationSettings() {
  const [preferencesRaw, setPreferences] =
    useKV<NotificationPreferences>('notification-preferences', DEFAULT_NOTIFICATION_PREFERENCES)
  // Merge with defaults to ensure new properties are always available
  const preferences = preferencesRaw 
    ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...preferencesRaw }
    : DEFAULT_NOTIFICATION_PREFERENCES

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [log, setLog] = useState<NotificationLogEntry[]>([])

  useEffect(() => {
    setLog(getNotificationLog())
  }, [])

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
      reason: 'manual-test',
      type: 'system',
      data: { url: '/?tab=dashboard' }
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

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Recent Notifications (debug)</h3>
                  <div className="text-xs text-muted-foreground">
                    Shows the last 20 notifications recorded on this device.
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/30">
                    {log.length === 0 && <p className="text-xs text-muted-foreground">No notifications logged yet.</p>}
                    {log.slice(0, 20).map(entry => (
                      <div key={entry.id} className="text-xs border-b last:border-0 pb-1 mb-1 last:pb-0 last:mb-0">
                        <div className="font-semibold">{entry.title}</div>
                        {entry.body && <div className="text-muted-foreground">{entry.body}</div>}
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                          {entry.reason ? ` • ${entry.reason}` : ''}
                          {entry.tag ? ` • ${entry.tag}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLog(getNotificationLog())}>
                    Refresh log
                  </Button>
                </div>

                {/* Smart Chore Notifications */}
                {preferences.choresEnabled && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain size={20} className="text-primary" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Label className="text-base">Smart Reminders</Label>
                            <Badge variant="secondary" className="text-[10px]">NEW</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Automatic morning summaries & evening follow-ups
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.smartChoreReminders}
                        onCheckedChange={value => handleToggle('smartChoreReminders', value)}
                      />
                    </div>

                    {preferences.smartChoreReminders && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <SunHorizon size={14} className="text-yellow-500" />
                              <Label className="text-sm">Morning Summary</Label>
                            </div>
                            <Input
                              type="time"
                              value={preferences.morningReminderTime}
                              onChange={e => handleTimeChange('morningReminderTime', e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Daily overview of pending chores
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <MoonStars size={14} className="text-indigo-500" />
                              <Label className="text-sm">Evening Follow-up</Label>
                            </div>
                            <Input
                              type="time"
                              value={preferences.eveningFollowUpTime}
                              onChange={e => handleTimeChange('eveningFollowUpTime', e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Reminder for incomplete chores
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Warning size={14} className="text-red-500" />
                            <Label className="text-sm">Urgent Notification Threshold</Label>
                          </div>
                          <Select
                            value={String(preferences.urgentOverdueThreshold)}
                            onValueChange={value => handleMinutesChange('urgentOverdueThreshold', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 day overdue</SelectItem>
                              <SelectItem value="2">2 days overdue</SelectItem>
                              <SelectItem value="3">3 days overdue</SelectItem>
                              <SelectItem value="5">5 days overdue</SelectItem>
                              <SelectItem value="7">1 week overdue</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground">
                            Send urgent notification when chores are this many days late
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
