import { useEffect, useState } from 'react'

type SyncState = 'idle' | 'queued' | 'syncing' | 'error'

interface SyncStatus {
  state: SyncState
  lastSuccess?: number
  lastError?: { message: string; timestamp: number }
  queueSize?: number
  isOnline: boolean
}

const LAST_SUCCESS_KEY = 'hh_sync_last_success'
const LAST_ERROR_KEY = 'hh_sync_last_error'

function readInitialStatus(): SyncStatus {
  let lastSuccess: number | undefined
  let lastError: { message: string; timestamp: number } | undefined
  if (typeof window !== 'undefined') {
    const successStr = window.localStorage.getItem(LAST_SUCCESS_KEY)
    if (successStr) lastSuccess = Number(successStr)
    const errorStr = window.localStorage.getItem(LAST_ERROR_KEY)
    if (errorStr) {
      try {
        lastError = JSON.parse(errorStr)
      } catch {
        lastError = undefined
      }
    }
  }

  return { state: 'idle', lastSuccess, lastError, queueSize: 0, isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true }
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(() => readInitialStatus())

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {}
      setStatus((prev) => ({
        ...prev,
        ...detail,
        isOnline: prev.isOnline
      }))
    }
    const handleOnline = () => setStatus((prev) => ({ ...prev, isOnline: true }))
    const handleOffline = () => setStatus((prev) => ({ ...prev, isOnline: false }))

    window.addEventListener('hh-sync-status', handler as EventListener)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('hh-sync-status', handler as EventListener)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}
