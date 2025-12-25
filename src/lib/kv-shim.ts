/**
 * localStorage-based KV shim for standalone deployment
 * Replaces @github/spark KV backend when running without Spark
 */
import { useState, useEffect, useCallback } from 'react'

const KV_PREFIX = 'homehub-kv:'

function getKV<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(KV_PREFIX + key)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

function setKV<T>(key: string, value: T): void {
  try {
    localStorage.setItem(KV_PREFIX + key, JSON.stringify(value))
    // Dispatch custom event for same-tab sync between components
    window.dispatchEvent(new CustomEvent('kv-update', { 
      detail: { key: KV_PREFIX + key, value } 
    }))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

/**
 * React hook that mimics useKV from @github/spark/hooks
 * Uses localStorage for persistence
 */
export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => getKV(key, defaultValue))

  // Listen for changes from other tabs (storage event) and same-tab (custom event)
  useEffect(() => {
    const fullKey = KV_PREFIX + key
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === fullKey) {
        try {
          setValue(e.newValue ? JSON.parse(e.newValue) : defaultValue)
        } catch {
          setValue(defaultValue)
        }
      }
    }
    
    const handleKVUpdate = (e: CustomEvent<{ key: string; value: T }>) => {
      if (e.detail.key === fullKey) {
        setValue(e.detail.value)
      }
    }
    
    window.addEventListener('storage', handleStorage)
    window.addEventListener('kv-update', handleKVUpdate as EventListener)
    
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('kv-update', handleKVUpdate as EventListener)
    }
  }, [key, defaultValue])

  const setValueAndPersist = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue
      setKV(key, resolved)
      return resolved
    })
  }, [key])

  return [value, setValueAndPersist]
}
