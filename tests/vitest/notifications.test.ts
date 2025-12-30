import { describe, it, expect } from 'vitest'
import { DEFAULT_NOTIFICATION_PREFERENCES, shouldSendNotification, isInQuietHours } from '@/lib/notifications'

describe('notifications', () => {
  it('respects disabled preferences', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: false }
    expect(shouldSendNotification(prefs, 'chore')).toBe(false)
  })

  it('blocks during quiet hours', () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: true, quietHoursEnabled: true, quietHoursStart: '00:00', quietHoursEnd: '23:59' }
    expect(isInQuietHours(prefs)).toBe(true)
    expect(shouldSendNotification(prefs, 'event')).toBe(false)
  })
})
