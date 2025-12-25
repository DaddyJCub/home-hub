import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface StatusRowProps {
  label: string
  value: string
  tone?: 'good' | 'warn'
}

const StatusRow = ({ label, value, tone = 'good' }: StatusRowProps) => {
  const variant = tone === 'good' ? 'secondary' : 'destructive'
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={variant}>{value}</Badge>
    </div>
  )
}

export function PWADiagnostics() {
  const [hasManifest, setHasManifest] = useState(false)
  const [swRegistered, setSwRegistered] = useState(false)
  const [swControlled, setSwControlled] = useState(false)
  type DisplayMode = 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'

  const [displayMode, setDisplayMode] = useState<DisplayMode>('browser')
  const [notificationState, setNotificationState] = useState<NotificationPermission>('default')

  useEffect(() => {
    setHasManifest(!!document.querySelector('link[rel="manifest"]'))

    const updateDisplayMode = () => {
      const modes: DisplayMode[] = ['fullscreen', 'standalone', 'minimal-ui']
      const active = modes.find((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)
      setDisplayMode(active || 'browser')
    }
    updateDisplayMode()

    const unsubscribers = ['fullscreen', 'standalone', 'minimal-ui'].map((mode) => {
      const mq = window.matchMedia(`(display-mode: ${mode})`)
      mq.addEventListener('change', updateDisplayMode)
      return () => mq.removeEventListener('change', updateDisplayMode)
    })

    setNotificationState(Notification.permission)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          setSwRegistered(true)
          setSwControlled(!!navigator.serviceWorker.controller || !!reg.active)
        })
        .catch(() => setSwRegistered(false))
    }

    return () => {
      unsubscribers.forEach((fn) => fn())
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          PWA Diagnostics
          <Badge variant="outline" className="text-xs">dev-only</Badge>
        </CardTitle>
        <CardDescription>Quick health check for installability and offline support</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatusRow label="Manifest detected" value={hasManifest ? 'Yes' : 'No'} tone={hasManifest ? 'good' : 'warn'} />
        <StatusRow label="Service worker registered" value={swRegistered ? 'Yes' : 'No'} tone={swRegistered ? 'good' : 'warn'} />
        <StatusRow label="Service worker controlling page" value={swControlled ? 'Yes' : 'No'} tone={swControlled ? 'good' : 'warn'} />
        <StatusRow label="Display mode" value={displayMode} tone={displayMode === 'browser' ? 'warn' : 'good'} />
        <StatusRow label="Notification permission" value={notificationState} tone={notificationState === 'granted' ? 'good' : 'warn'} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Reload app</Button>
          <Button variant="outline" size="sm" onClick={() => navigator.serviceWorker?.ready.then((reg) => reg.update())}>Force SW update</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PWADiagnostics
