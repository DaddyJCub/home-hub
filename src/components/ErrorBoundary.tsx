import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Warning } from '@phosphor-icons/react'

export default function ErrorBoundary() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warning size={24} className="text-destructive" />
            System Update Required
          </CardTitle>
          <CardDescription>
            HomeHub has been upgraded with user accounts and household management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To use the new features, please sign out and create a new account. Your existing data will be migrated automatically.
          </p>
          <Button onClick={logout} className="w-full">
            Sign Out & Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
