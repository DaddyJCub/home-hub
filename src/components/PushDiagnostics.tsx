import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPushDiagnostics, sendTestPush, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { toast } from 'sonner'

export function PushDiagnostics() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscriptionCount, setSubscriptionCount] = useState(0)
  const [supported, setSupported] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = () => {
    const info = getPushDiagnostics()
    setSupported(info.supported)
    setPermission(info.permission as NotificationPermission)
    setSubscriptionCount(info.subscriptionCount)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    const res = await subscribeToPush()
    setLastResult(res.message)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
    refresh()
    setLoading(false)
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    const res = await unsubscribeFromPush()
    setLastResult(res.message)
    res.success ? toast.success(res.message) : toast.error(res.message)
    refresh()
    setLoading(false)
  }

  const handleTest = async () => {
    setLoading(true)
    const res = await sendTestPush()
    setLastResult(res.message)
    res.success ? toast.success(res.message) : toast.error(res.message)
    refresh()
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Push Diagnostics
          <Badge variant="outline" className="text-xs">admin</Badge>
        </CardTitle>
        <CardDescription>Check subscription state and send a test push.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Supported</span>
          <Badge variant={supported ? 'secondary' : 'destructive'}>{supported ? 'Yes' : 'No'}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Permission</span>
          <Badge variant={permission === 'granted' ? 'secondary' : 'destructive'}>{permission}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Active subscriptions</span>
          <Badge variant="secondary">{subscriptionCount}</Badge>
        </div>
        {lastResult && (
          <p className="text-xs text-muted-foreground">Last result: {lastResult}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" onClick={handleSubscribe} disabled={loading}>Subscribe</Button>
          <Button size="sm" variant="outline" onClick={handleUnsubscribe} disabled={loading}>Unsubscribe</Button>
          <Button size="sm" variant="secondary" onClick={handleTest} disabled={loading}>Send test push</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PushDiagnostics
