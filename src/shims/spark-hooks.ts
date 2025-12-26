import { useEffect, useState, useCallback, useSyncExternalStore } from 'react'

const STORAGE_PREFIX = 'hh_kv_'

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
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('kv-change', { detail: { key, value } }))
  } catch {
    // ignore storage write errors
  }
}

// Subscribers for each key
const subscribers = new Map<string, Set<() => void>>()

const subscribe = (key: string, callback: () => void) => {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set())
  }
  subscribers.get(key)!.add(callback)
  
  return () => {
    subscribers.get(key)?.delete(callback)
  }
}

// Listen for storage changes (cross-tab) and custom events (same-tab)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith(STORAGE_PREFIX)) {
      const key = e.key.replace(STORAGE_PREFIX, '')
      subscribers.get(key)?.forEach(cb => cb())
    }
  })
  
  window.addEventListener('kv-change', ((e: CustomEvent) => {
    const { key } = e.detail
    subscribers.get(key)?.forEach(cb => cb())
  }) as EventListener)
}

export function useKV<T>(key: string, defaultValue?: T) {
  const getSnapshot = useCallback(() => {
    return readValue<T | undefined>(key, clone(defaultValue))
  }, [key, defaultValue])
  
  const subscribeToKey = useCallback((callback: () => void) => {
    return subscribe(key, callback)
  }, [key])

  const value = useSyncExternalStore(
    subscribeToKey,
    getSnapshot,
    () => clone(defaultValue) // Server snapshot
  )

  // Initialize localStorage with default if not set
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null && defaultValue !== undefined) {
      writeValue(key, clone(defaultValue))
    }
  }, [key, defaultValue])

  const setter = useCallback((next: T | ((prev: T | undefined) => T)) => {
    const currentValue = readValue<T | undefined>(key, clone(defaultValue))
    const resolved = typeof next === 'function' 
      ? (next as (prev: T | undefined) => T)(currentValue) 
      : next
    writeValue(key, resolved)
  }, [key, defaultValue])

  return [value, setter] as [T | undefined, (next: T | ((prev: T | undefined) => T)) => void]
}

export default { useKV }
