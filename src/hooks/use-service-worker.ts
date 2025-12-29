import { useState, useEffect } from 'react'

export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleControllerChange = () => {
      if (refreshing) return
      setRefreshing(true)
      window.location.reload()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setRegistration(reg)
          if (reg.waiting) {
            setUpdateAvailable(true)
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error)
        })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  const applyUpdate = () => {
    if (!registration) return
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      return
    }
    // If no waiting worker, trigger an update check
    registration.update().catch(() => {})
  }

  return { isOnline, updateAvailable, applyUpdate }
}
