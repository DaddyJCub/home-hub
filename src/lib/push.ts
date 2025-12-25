import { DEFAULT_NOTIFICATION_PREFERENCES, requestNotificationPermission, showNotification } from './notifications'

export interface StoredPushSubscription {
  id: string
  endpoint: string
  createdAt: number
  userAgent: string
  status: 'active' | 'revoked'
}

const STORAGE_KEY = 'push-subscriptions'

function loadSubs(): StoredPushSubscription[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSubs(subs: StoredPushSubscription[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs))
  } catch {
    // ignore storage errors
  }
}

export async function subscribeToPush(): Promise<{ success: boolean; message: string; subscription?: StoredPushSubscription }> {
  const permissionGranted = await requestNotificationPermission()
  if (!permissionGranted) {
    return { success: false, message: 'Notification permission denied' }
  }

  if (!('serviceWorker' in navigator)) {
    return { success: false, message: 'Service worker not supported' }
  }

  const subs = loadSubs()
  const existing = subs.find((s) => s.status === 'active')
  if (existing) {
    return { success: true, message: 'Already subscribed', subscription: existing }
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`
  const subscription: StoredPushSubscription = {
    id,
    endpoint: `local://${id}`,
    createdAt: Date.now(),
    userAgent: navigator.userAgent,
    status: 'active',
  }
  saveSubs([...subs, subscription])
  return { success: true, message: 'Subscribed', subscription }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; message: string }> {
  const subs = loadSubs()
  const updated = subs.map((s) => ({ ...s, status: 'revoked' as const }))
  saveSubs(updated)
  return { success: true, message: 'Unsubscribed' }
}

export function getPushDiagnostics() {
  const subs = loadSubs()
  const active = subs.filter((s) => s.status === 'active')
  return {
    supported: 'Notification' in window && 'serviceWorker' in navigator,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    subscriptionCount: active.length,
  }
}

export async function sendTestPush(): Promise<{ success: boolean; message: string }> {
  if (!('serviceWorker' in navigator)) {
    return { success: false, message: 'Service worker not available' }
  }
  const permissionGranted = await requestNotificationPermission()
  if (!permissionGranted) {
    return { success: false, message: 'Notification permission denied' }
  }
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('HomeHub test push', {
      body: 'If you see this, push is working.',
      data: { url: '/' },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-push',
      renotify: true,
    })
    return { success: true, message: 'Test push sent' }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to send test push' }
  }
}

export function recordLocalPush(title: string, body: string, data?: Record<string, unknown>) {
  showNotification(title, { body, data }, DEFAULT_NOTIFICATION_PREFERENCES)
}
