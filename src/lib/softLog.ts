export interface SoftLogEntry {
  id: string
  message: string
  timestamp: number
  meta?: Record<string, any>
}

const LOG_KEY = 'hh_soft_log'
const MAX_LOG = 30

export function addSoftLog(message: string, meta?: Record<string, any>) {
  if (typeof window === 'undefined') return
  const now = Date.now()
  const entry: SoftLogEntry = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    message,
    timestamp: now,
    meta
  }
  try {
    const existing: SoftLogEntry[] = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]')
    const next = [entry, ...existing].slice(0, MAX_LOG)
    window.localStorage.setItem(LOG_KEY, JSON.stringify(next))
  } catch {
    // best effort only
  }
}

export function getSoftLogs(): SoftLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearSoftLogs() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOG_KEY)
}
