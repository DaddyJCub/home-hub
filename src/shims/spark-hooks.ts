import { useEffect, useState } from 'react'

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
  } catch {
    // ignore storage write errors
  }
}

export function useKV<T>(key: string, defaultValue?: T) {
  const [value, setValue] = useState<T | undefined>(() => readValue<T | undefined>(key, clone(defaultValue)))

  useEffect(() => {
    if (value === undefined && defaultValue !== undefined) {
      writeValue(key, clone(defaultValue))
    } else {
      writeValue(key, value)
    }
  }, [key, value, defaultValue])

  const setter = (next: any) => {
    setValue((prev: any) => {
      const resolved = typeof next === 'function' ? next(prev ?? clone(defaultValue)) : next
      writeValue(key, resolved)
      return resolved
    })
  }

  return [value, setter] as [T | undefined, (next: T | ((prev: T | undefined) => T)) => void]
}

export default { useKV }
