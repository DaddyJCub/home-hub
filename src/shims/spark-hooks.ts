import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

const STORAGE_PREFIX = 'hh_kv_'

const USER_SCOPED_KEYS = new Set([
  'theme-id',
  'dark-mode',
  'enabled-tabs',
  'mobile-nav-items',
  'notification-preferences',
  'mobile-preferences',
  'quick-actions-config',
  'dashboard-widgets'
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
    return JSON.parse(raw) as T
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

export function useKV<T>(
  key: string,
  defaultValue?: T
): [T | undefined, (next: T | ((prev: T | undefined) => T)) => void] {
  const { currentHousehold, currentUser, isAuthenticated, isLoading } = useAuth()
  const scope: 'user' | 'household' = USER_SCOPED_KEYS.has(key) ? 'user' : 'household'

  const cacheKey = useMemo(() => {
    if (scope === 'household' && currentHousehold?.id) return `${key}_${currentHousehold.id}`
    return key
  }, [key, scope, currentHousehold?.id])

  const [value, setValue] = useState<T | undefined>(() => {
    const cached = readValue<T | undefined>(cacheKey, undefined)
    if (cached !== undefined) return cached
    return clone(defaultValue)
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
      setValue(cached !== undefined ? cached : clone(defaultValue))
      return
    }

    let cancelled = false
    const fetchValue = async () => {
      try {
        const query =
          scope === 'household' && currentHousehold
            ? `?householdId=${encodeURIComponent(currentHousehold.id)}`
            : ''
        const response = await apiRequest<{ value: T | null }>(
          `/api/data/${scope}/${encodeURIComponent(key)}${query}`,
          { skipAuthError: true }
        )

        const localValue = readValue<T | undefined>(cacheKey, undefined)
        const resolved =
          response?.value !== null && response?.value !== undefined
            ? response.value
            : localValue !== undefined
              ? localValue
              : clone(defaultValue)

        if (!cancelled) {
          setValue(resolved)
          writeValue(cacheKey, resolved)
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
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // not authenticated yet; rely on local cache
          return
        }
        if (!cancelled) {
          const fallback = readValue<T | undefined>(cacheKey, clone(defaultValue))
          setValue(fallback !== undefined ? fallback : clone(defaultValue))
        }
      }
    }

    void fetchValue()
    return () => {
      cancelled = true
    }
  }, [key, scope, cacheKey, currentHousehold?.id, canSync, isLoading, defaultValue])

  const setter = useCallback(
    (next: T | ((prev: T | undefined) => T)) => {
      setValue((prev) => {
        const current = prev ?? clone(defaultValue)
        const resolved = typeof next === 'function' ? (next as (prev: T | undefined) => T)(current) : next
        writeValue(cacheKey, resolved)

        if (canSync) {
          void apiRequest(`/api/data/${scope}/${encodeURIComponent(key)}`, {
            method: 'PUT',
            body: JSON.stringify({
              value: resolved,
              householdId: scope === 'household' ? currentHousehold?.id : undefined
            })
          }).catch(() => {
            // swallow sync errors to keep UI responsive
          })
        }

        return resolved
      })
    },
    [cacheKey, canSync, currentHousehold?.id, defaultValue, key, scope]
  )

  return [value, setter]
}

export default { useKV }
