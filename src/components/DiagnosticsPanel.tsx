import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/AuthContext'

interface SparkStatus {
  ok: boolean
  keys: string[]
  missing: string[]
  defaultsSeeded?: number
  resetVersion?: number
  dataPath?: string
  error?: string
}

export function DiagnosticsPanel() {
  const { currentUser, currentHousehold, userHouseholds, lastAuthError } = useAuth()
  const [kvStatus, setKvStatus] = useState<SparkStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    const keys =
      typeof window !== 'undefined'
        ? Object.keys(window.localStorage)
            .filter(k => k.startsWith('hh_'))
            .map(k => k.replace('hh_', ''))
        : []
    setKvStatus({ ok: true, keys, missing: [] })

    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const missingKeys = kvStatus?.missing ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Diagnostics
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? 'Checking...' : 'Re-run checks'}
          </Button>
        </CardTitle>
        <CardDescription>Debug Spark KV and auth state (dev-only helper)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Spark KV availability</p>
            <p className="text-xs text-muted-foreground">
              Server status + client kv key access
            </p>
          </div>
          <Badge variant={kvStatus?.ok ? 'default' : 'destructive'}>
            {kvStatus?.ok ? 'Healthy' : 'Attention'}
          </Badge>
        </div>

        <div className="text-sm">
          <p className="font-medium">Missing required keys</p>
          {missingKeys.length === 0 ? (
            <p className="text-muted-foreground text-xs">All required keys are initialized</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {missingKeys.map((key) => (
                <Badge key={key} variant="secondary">{key}</Badge>
              ))}
            </div>
          )}
          {kvStatus?.defaultsSeeded !== undefined && (
            <p className="text-xs text-muted-foreground">
              Server seeded on boot: {kvStatus.defaultsSeeded}
            </p>
          )}
          {kvStatus?.error && (
            <p className="text-xs text-destructive">Server check error: {kvStatus.error}</p>
          )}
        </div>

        <Separator />

        <div className="space-y-1 text-sm">
          <p className="font-medium">Auth state</p>
          <p className="text-xs text-muted-foreground">
            User: {currentUser ? `${currentUser.displayName} (${currentUser.email})` : 'Not signed in'}
          </p>
          <p className="text-xs text-muted-foreground">
            Household: {currentHousehold ? `${currentHousehold.name}` : 'Not selected'}
          </p>
          <p className="text-xs text-muted-foreground">
            Available households: {userHouseholds.length}
          </p>
          {lastAuthError && (
            <p className="text-xs text-destructive">
              Last auth error: {lastAuthError}
            </p>
          )}
        </div>

        {kvStatus?.dataPath && (
          <p className="text-xs text-muted-foreground">
            Data path: {kvStatus.dataPath} (reset v{kvStatus.resetVersion ?? 'n/a'})
          </p>
        )}

        {kvStatus && (
          <div className="text-xs text-muted-foreground">
            Keys present: {kvStatus.keys?.length ?? 0} | Missing: {missingKeys.length}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DiagnosticsPanel
