import { useEffect, useState, useCallback, useRef } from 'react'

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
    window.dispatchEvent(new CustomEvent('hh-kv-change', { detail: { key } }))
  } catch {
    // ignore storage write errors
  }
}

export function useKV<T>(key: string, defaultValue?: T): [T | undefined, (next: T | ((prev: T | undefined) => T)) => void] {
  const [value, setValue] = useState<T | undefined>(() => {
    const stored = readValue<T | undefined>(key, undefined)
    if (stored !== undefined) return stored
    return clone(defaultValue)
  })
  
  const keyRef = useRef(key)
  keyRef.current = key
  
  const defaultRef = useRef(defaultValue)
  defaultRef.current = defaultValue

  // Initialize localStorage with default if not set
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null && defaultValue !== undefined) {
      writeValue(key, clone(defaultValue))
    }
  }, [key, defaultValue])

  // Listen for changes from other components or tabs
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_PREFIX + keyRef.current) {
        const newValue = readValue<T | undefined>(keyRef.current, clone(defaultRef.current))
        setValue(newValue)
      }
    }

    const handleKvChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>
      if (customEvent.detail.key === keyRef.current) {
        const newValue = readValue<T | undefined>(keyRef.current, clone(defaultRef.current))
        setValue(newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('hh-kv-change', handleKvChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('hh-kv-change', handleKvChange)
    }
  }, [])

  const setter = useCallback((next: T | ((prev: T | undefined) => T)) => {
    setValue(prev => {
      const currentValue = prev ?? clone(defaultRef.current)
      const resolved = typeof next === 'function' 
        ? (next as (prev: T | undefined) => T)(currentValue) 
        : next
      writeValue(keyRef.current, resolved)
      return resolved
    })
  }, [])

  return [value, setter]
}

export default { useKV }
