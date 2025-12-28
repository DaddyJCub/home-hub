import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface UiInfo {
  innerWidth: number
  innerHeight: number
  viewportWidth?: number
  viewportHeight?: number
  displayMode: string
  standalone: boolean
  safeTop: string
  safeBottom: string
  swControlled: boolean
}

export function UIDiagnostics() {
  const [info, setInfo] = useState<UiInfo>({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    viewportWidth: window.visualViewport?.width,
    viewportHeight: window.visualViewport?.height,
    displayMode: getDisplayMode(),
    standalone: !!(navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches,
    safeTop: getEnvValue('safe-area-inset-top'),
    safeBottom: getEnvValue('safe-area-inset-bottom'),
    swControlled: !!navigator.serviceWorker?.controller
  })

  useEffect(() => {
    const onResize = () => {
      setInfo({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        viewportWidth: window.visualViewport?.width,
        viewportHeight: window.visualViewport?.height,
        displayMode: getDisplayMode(),
        standalone: !!(navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches,
        safeTop: getEnvValue('safe-area-inset-top'),
        safeBottom: getEnvValue('safe-area-inset-bottom'),
        swControlled: !!navigator.serviceWorker?.controller
      })
    }
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>UI Diagnostics</CardTitle>
        <CardDescription>Viewport, PWA mode, safe-area, and SW status.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <Row label="Display mode" value={info.displayMode} />
        <Row label="Standalone" value={info.standalone ? 'Yes' : 'No'} tone={info.standalone ? 'ok' : 'warn'} />
        <Row label="Viewport" value={`${Math.round(info.innerWidth)} x ${Math.round(info.innerHeight)} (inner)`} />
        {info.viewportWidth && info.viewportHeight && (
          <Row label="Visual" value={`${Math.round(info.viewportWidth)} x ${Math.round(info.viewportHeight)}`} />
        )}
        <Row label="Safe areas" value={`top ${info.safeTop} / bottom ${info.safeBottom}`} />
        <Row label="SW controlled" value={info.swControlled ? 'Yes' : 'No'} tone={info.swControlled ? 'ok' : 'warn'} />
        <Separator />
        <p className="text-xs text-muted-foreground">Toggle this card off when not debugging to keep UI clean.</p>
      </CardContent>
    </Card>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="flex items-center justify-between rounded border px-2 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant={tone === 'ok' ? 'secondary' : tone === 'warn' ? 'outline' : 'default'} className="text-[11px]">
        {value}
      </Badge>
    </div>
  )
}

function getDisplayMode(): string {
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone'
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen'
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui'
  return 'browser'
}

function getEnvValue(name: string): string {
  try {
    const el = document.createElement('div')
    el.style.paddingTop = `env(${name})`
    document.body.appendChild(el)
    const computed = getComputedStyle(el).paddingTop
    document.body.removeChild(el)
    return computed || '0px'
  } catch {
    return '0px'
  }
}

export default UIDiagnostics
