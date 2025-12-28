import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface VersionRow {
  version: number
  name: string
  applied_at: number
}

export function MigrationStatus() {
  const [versions, setVersions] = useState<VersionRow[]>([])

  useEffect(() => {
    fetch('/api/migrations')
      .then(res => res.json())
      .then((data) => setVersions(data?.versions || []))
      .catch(() => setVersions([]))
  }, [])

  const latest = versions.length > 0 ? versions[versions.length - 1].version : 0

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Migration status</CardTitle>
          <CardDescription>Applied database migrations</CardDescription>
        </div>
        <Badge variant="outline">v{latest}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {versions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No migration data found.</p>
        ) : (
          versions.map((row) => (
            <div key={row.version} className="flex items-center justify-between rounded border px-2 py-1">
              <span className="font-medium">v{row.version}</span>
              <span className="text-muted-foreground text-xs">{row.name}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default MigrationStatus
