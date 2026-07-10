import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

const STORAGE_PREFIX = 'hh_kv_'
const SYNC_QUEUE_KEY = 'hh_sync_queue'
const LAST_SUCCESS_KEY = 'hh_sync_last_success'
const LAST_ERROR_KEY = 'hh_sync_last_error'
const SYNC_EVENT = 'hh-sync-status'
const INFLIGHT_GETS = new Map<string, Promise<{ value: any | null }>>()

const USER_SCOPED_KEYS = new Set([
  'theme-id',
  'dark-mode',
  'enabled-tabs',
  'mobile-nav-items',
  'notification-preferences',
  'mobile-preferences',
  'quick-actions-config',
  'dashboard-widgets',
  'onboarding-status',
  'ollama-config',
  'personal-tasks',
  'projects-view-mode'
])

const clone = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

const readValue = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null || raw === undefined) return fallback
    const parsed = JSON.parse(raw)
    return parsed === null || parsed === undefined ? fallback : (parsed as T)
  } catch {
    return fallback
  }
}

const writeValue = (key: string, value: any) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // ignore storage write errors
  }
}

type SyncQueueItem = {
  key: string
  scope: 'user' | 'household'
  payload: any
  householdId?: string
}

const readQueue = (): SyncQueueItem[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(SYNC_QUEUE_KEY) || '[]') as SyncQueueItem[]
  } catch {
    return []
  }
}

const writeQueue = (queue: SyncQueueItem[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore
  }
}

const emitSyncStatus = (detail: any) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail }))
}

const markSyncSuccess = () => {
  const ts = Date.now()
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LAST_SUCCESS_KEY, String(ts))
  }
  emitSyncStatus({ state: 'idle', lastSuccess: ts })
}

const markSyncError = (message: string) => {
  const ts = Date.now()
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LAST_ERROR_KEY, JSON.stringify({ message, timestamp: ts }))
  }
  emitSyncStatus({ state: 'error', lastError: { message, timestamp: ts } })
}

const enqueueSync = (item: SyncQueueItem) => {
  const queue = readQueue()
  const idx = queue.findIndex((q) => q.key === item.key && q.scope === item.scope)
  if (idx >= 0) {
    queue[idx] = item
  } else {
    queue.push(item)
  }
  writeQueue(queue)
  emitSyncStatus({ state: 'queued', queueSize: queue.length })
}

const buildDataRequestPath = (scope: 'user' | 'household', key: string, householdId?: string) => {
  const query = scope === 'household' && householdId ? `?householdId=${encodeURIComponent(householdId)}` : ''
  return `/api/data/${scope}/${encodeURIComponent(key)}${query}`
}

const buildInflightKey = (scope: 'user' | 'household', key: string, householdId?: string) =>
  `${scope}:${key}:${householdId || ''}`

const fetchDataValue = async <T>(scope: 'user' | 'household', key: string, householdId?: string) => {
  const inflightKey = buildInflightKey(scope, key, householdId)
  const existing = INFLIGHT_GETS.get(inflightKey)
  if (existing) {
    return existing as Promise<{ value: T | null }>
  }

  const request = apiRequest<{ value: T | null }>(buildDataRequestPath(scope, key, householdId), {
    skipAuthError: true
  })
    .finally(() => {
      INFLIGHT_GETS.delete(inflightKey)
    })

  INFLIGHT_GETS.set(inflightKey, request as Promise<{ value: any | null }>)
  return request
}

export const clearSyncCache = () => {
  if (typeof window === 'undefined') return
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX) || key === SYNC_QUEUE_KEY || key === LAST_SUCCESS_KEY || key === LAST_ERROR_KEY)
      .forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // ignore storage errors
  }
  emitSyncStatus({ state: 'idle', queueSize: 0 })
}

export const processQueue = async () => {
  const queue = readQueue()
  if (queue.length === 0) return
  emitSyncStatus({ state: 'syncing', queueSize: queue.length })
  const remaining: SyncQueueItem[] = []
  for (const item of queue) {
    try {
      await apiRequest(`/api/data/${item.scope}/${encodeURIComponent(item.key)}`, {
        method: 'PUT',
        body: JSON.stringify({
          value: item.payload,
          householdId: item.scope === 'household' ? item.householdId : undefined
        })
      })
      markSyncSuccess()
    } catch (err: any) {
      const message = err?.message || 'Sync failed'
      markSyncError(message)
      remaining.push(item)
    }
  }
  writeQueue(remaining)
  emitSyncStatus({ state: remaining.length > 0 ? 'error' : 'idle', queueSize: remaining.length })
}

export const retrySyncNow = async () => {
  await processQueue()
}

export const clearSyncQueue = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SYNC_QUEUE_KEY)
    window.localStorage.removeItem(LAST_ERROR_KEY)
  } catch {
    // ignore storage errors
  }
  emitSyncStatus({ state: 'idle', queueSize: 0, lastError: null })
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void processQueue()
  })
  if (window.navigator.onLine) {
    void processQueue()
  }
}

export function useKV<T>(
  key: string,
  defaultValue?: T
): [T | undefined, (next: T | ((prev: T | undefined) => T)) => void] {
  const { currentHousehold, currentUser, isAuthenticated, isLoading } = useAuth()
  const scope: 'user' | 'household' = USER_SCOPED_KEYS.has(key) ? 'user' : 'household'
  const initialDefaultRef = useRef<T | undefined>(clone(defaultValue))

  const getDefaultValue = useCallback(() => clone(initialDefaultRef.current), [])

  const cacheKey = useMemo(() => {
    if (scope === 'household' && currentHousehold?.id) return `${key}_${currentHousehold.id}`
    return key
  }, [key, scope, currentHousehold?.id])

  const [value, setValue] = useState<T | undefined>(() => {
    const cached = readValue<T | undefined>(cacheKey, undefined)
    if (cached !== undefined) return cached
    return getDefaultValue()
  })

  const canSync = useMemo(() => {
    if (!isAuthenticated) return false
    if (scope === 'household' && !currentHousehold) return false
    return true
  }, [isAuthenticated, scope, currentHousehold])

  useEffect(() => {
    if (!canSync || isLoading) {
      // still populate local cache for pre-auth scenarios
      const cached = readValue<T | undefined>(cacheKey, undefined)
      setValue(cached !== undefined ? cached : getDefaultValue())
      return
    }

    let cancelled = false
    const fetchValue = async () => {
      try {
        const response = await fetchDataValue<T>(scope, key, currentHousehold?.id)

        const localValue = readValue<T | undefined>(cacheKey, undefined)
        const resolved =
          response?.value !== null && response?.value !== undefined
            ? response.value
            : localValue !== undefined
              ? localValue
              : getDefaultValue()

        if (!cancelled) {
          setValue(resolved)
          writeValue(cacheKey, resolved)
          markSyncSuccess()
        }

        // Migrate any legacy local-only data up to the server if no value was stored yet
        if ((response?.value === null || response?.value === undefined) && localValue !== undefined) {
          await apiRequest(`/api/data/${scope}/${encodeURIComponent(key)}`, {
            method: 'PUT',
            body: JSON.stringify({
              value: localValue,
              householdId: scope === 'household' ? currentHousehold?.id : undefined
            })
          })
        }
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 401) {
          // not authenticated yet; rely on local cache
          return
        }
        markSyncError(err?.message || 'Sync failed')
        if (!cancelled) {
          const fallback = readValue<T | undefined>(cacheKey, getDefaultValue())
          setValue(fallback !== undefined ? fallback : getDefaultValue())
        }
      }
    }

    void fetchValue()
    return () => {
      cancelled = true
    }
  }, [key, scope, cacheKey, currentHousehold?.id, canSync, isLoading, getDefaultValue])

  const setter = useCallback(
    (next: T | ((prev: T | undefined) => T)) => {
      setValue((prev) => {
        const current = prev ?? getDefaultValue()
        const resolved = typeof next === 'function' ? (next as (prev: T | undefined) => T)(current) : next
        writeValue(cacheKey, resolved)

        if (canSync) {
          void apiRequest(`/api/data/${scope}/${encodeURIComponent(key)}`, {
            method: 'PUT',
            body: JSON.stringify({
              value: resolved,
              householdId: scope === 'household' ? currentHousehold?.id : undefined
            })
          })
            .then(() => markSyncSuccess())
            .catch((err: any) => {
              enqueueSync({
                key,
                scope,
                payload: resolved,
                householdId: scope === 'household' ? currentHousehold?.id : undefined
              })
              markSyncError(err?.message || 'Sync failed')
            })
        }

        return resolved
      })
    },
    [cacheKey, canSync, currentHousehold?.id, key, scope, getDefaultValue]
  )

  return [value, setter]
}

export default { useKV }
