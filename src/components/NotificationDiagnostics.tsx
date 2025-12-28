import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getPushDiagnostics, sendTestPush, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { getNotificationLog } from '@/lib/notifications'
import { getSoftLogs } from '@/lib/softLog'
import { toast } from 'sonner'

interface SwInfo {
  supported: boolean
  controller: boolean
  scope?: string
}

export function NotificationDiagnostics() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscriptionCount, setSubscriptionCount] = useState(0)
  const [supported, setSupported] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [swInfo, setSwInfo] = useState<SwInfo>({ supported: false, controller: false })
  const [logs, setLogs] = useState(() => getNotificationLog().slice(0, 5))
  const [warnings, setWarnings] = useState(() => getSoftLogs().slice(0, 5))
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    const info = getPushDiagnostics()
    setSupported(info.supported)
    setPermission(info.permission as NotificationPermission)
    setSubscriptionCount(info.subscriptionCount)

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      setSwInfo({
        supported: true,
        controller: !!navigator.serviceWorker.controller,
        scope: reg?.scope
      })
    }

    setLogs(getNotificationLog().slice(0, 5))
    setWarnings(getSoftLogs().slice(0, 5))
  }

  useEffect(() => {
    void refresh()
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    const res = await subscribeToPush()
    setLastResult(res.message)
    res.success ? toast.success(res.message) : toast.error(res.message)
    await refresh()
    setLoading(false)
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    const res = await unsubscribeFromPush()
    setLastResult(res.message)
    res.success ? toast.success(res.message) : toast.error(res.message)
    await refresh()
    setLoading(false)
  }

  const handleTest = async () => {
    setLoading(true)
    const res = await sendTestPush()
    setLastResult(res.message)
    res.success ? toast.success(res.message) : toast.error(res.message)
    await refresh()
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Notification Diagnostics
          <Badge variant="outline" className="text-xs">dev</Badge>
        </CardTitle>
        <CardDescription>Permission, service worker, subscription, and recent notification logs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <StatusRow label="Supported" value={supported ? 'Yes' : 'No'} tone={supported ? 'ok' : 'warn'} />
          <StatusRow label="Permission" value={permission} tone={permission === 'granted' ? 'ok' : 'warn'} />
          <StatusRow label="SW controller" value={swInfo.controller ? 'Yes' : 'No'} tone={swInfo.controller ? 'ok' : 'warn'} />
          <StatusRow label="Subscriptions" value={String(subscriptionCount)} tone={subscriptionCount > 0 ? 'ok' : 'warn'} />
        </div>
        {swInfo.scope && (
          <p className="text-xs text-muted-foreground">Scope: {swInfo.scope}</p>
        )}
        {lastResult && <p className="text-xs text-muted-foreground">Last test: {lastResult}</p>}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" onClick={handleSubscribe} disabled={loading}>Subscribe</Button>
          <Button size="sm" variant="outline" onClick={handleUnsubscribe} disabled={loading}>Unsubscribe</Button>
          <Button size="sm" variant="secondary" onClick={handleTest} disabled={loading}>Send test push</Button>
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={loading}>Refresh</Button>
        </div>

        <Separator />
        <div>
          <p className="text-sm font-medium mb-1">Recent notifications</p>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notification records yet.</p>
          ) : (
            <ul className="text-xs text-muted-foreground space-y-1">
              {logs.map(log => (
                <li key={log.id}>{new Date(log.timestamp).toLocaleString()} — {log.title}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Recent warnings</p>
          {warnings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No warnings logged.</p>
          ) : (
            <ul className="text-xs text-muted-foreground space-y-1">
              {warnings.map(log => (
                <li key={log.id}>{new Date(log.timestamp).toLocaleString()} — {log.message}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'warn' }) {
  return (
    <div className="flex items-center justify-between rounded border px-2 py-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Badge variant={tone === 'ok' ? 'secondary' : 'outline'} className="text-[11px]">
        {value}
      </Badge>
    </div>
  )
}

export default NotificationDiagnostics
