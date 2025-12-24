import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DeviceMobile, HandSwipeRight, Pulse, Download, GearSix } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'

interface MobilePreferences {
  hapticFeedback: boolean
  reduceMotion: boolean
  compactView: boolean
  swipeGestures: boolean
  pullToRefresh: boolean
  quickActions: boolean
  fontSize: 'small' | 'medium' | 'large'
}

const DEFAULT_MOBILE_PREFERENCES: MobilePreferences = {
  hapticFeedback: true,
  reduceMotion: false,
  compactView: false,
  swipeGestures: true,
  pullToRefresh: true,
  quickActions: true,
  fontSize: 'medium',
}

export function MobileEnhancements() {
  const isMobile = useIsMobile()
  const [preferences = DEFAULT_MOBILE_PREFERENCES, setPreferences] = useKV<MobilePreferences>(
    'mobile-preferences',
    DEFAULT_MOBILE_PREFERENCES
  )

  const handleToggle = (key: keyof MobilePreferences, value: boolean) => {
    setPreferences(prev => ({ ...(prev || DEFAULT_MOBILE_PREFERENCES), [key]: value }))
    toast.success('Mobile preference updated')
  }

  const handleFontSizeChange = (value: string) => {
    setPreferences(prev => ({ ...(prev || DEFAULT_MOBILE_PREFERENCES), fontSize: value as 'small' | 'medium' | 'large' }))
    toast.success(`Font size set to ${value}`)
  }

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })
  }

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        toast.success('App installed successfully!')
      }
      setDeferredPrompt(null)
    } else {
      toast.info('App is already installed or installation is not available')
    }
  }

  if (!isMobile) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DeviceMobile size={24} />
          Mobile Enhancements
        </CardTitle>
        <CardDescription>Optimize your mobile experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HandSwipeRight size={20} className="text-primary" />
              <div className="space-y-0.5">
                <Label>Swipe Gestures</Label>
                <p className="text-xs text-muted-foreground">Swipe between tabs</p>
              </div>
            </div>
            <Switch
              checked={preferences.swipeGestures}
              onCheckedChange={value => handleToggle('swipeGestures', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pulse size={20} className="text-primary" />
              <div className="space-y-0.5">
                <Label>Haptic Feedback</Label>
                <p className="text-xs text-muted-foreground">Vibrate on interactions</p>
              </div>
            </div>
            <Switch
              checked={preferences.hapticFeedback}
              onCheckedChange={value => handleToggle('hapticFeedback', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compact View</Label>
              <p className="text-xs text-muted-foreground">Reduce spacing for more content</p>
            </div>
            <Switch
              checked={preferences.compactView}
              onCheckedChange={value => handleToggle('compactView', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pull to Refresh</Label>
              <p className="text-xs text-muted-foreground">Refresh by pulling down</p>
            </div>
            <Switch
              checked={preferences.pullToRefresh}
              onCheckedChange={value => handleToggle('pullToRefresh', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Quick Actions</Label>
              <p className="text-xs text-muted-foreground">Long-press for shortcuts</p>
            </div>
            <Switch
              checked={preferences.quickActions}
              onCheckedChange={value => handleToggle('quickActions', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reduce Motion</Label>
              <p className="text-xs text-muted-foreground">Minimize animations</p>
            </div>
            <Switch
              checked={preferences.reduceMotion}
              onCheckedChange={value => handleToggle('reduceMotion', value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Font Size</Label>
          <Select value={preferences.fontSize} onValueChange={handleFontSizeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium (Default)</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-semibold">Install as App</Label>
                <p className="text-xs text-muted-foreground">
                  Add HomeHub to your home screen for easy access
                </p>
              </div>
              {deferredPrompt && <Badge variant="secondary">Available</Badge>}
            </div>
            <Button onClick={handleInstallPWA} variant="outline" className="w-full gap-2">
              <Download />
              Install HomeHub
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MobileEnhancements
