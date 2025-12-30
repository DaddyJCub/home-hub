import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Palette,
  SquaresFour,
  Trash,
  ShieldCheck,
  FloppyDisk,
  ArrowsClockwise,
  Moon,
  Sun,
  DeviceMobile,
  User,
  Plus,
  X,
  Sparkle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { themes, applyTheme, getThemeById, type Theme } from '@/lib/themes'
import { MobileNavCustomizer } from '@/components/MobileNavCustomizer'
import { MobileEnhancements } from '@/components/MobileEnhancements'
import { NotificationSettings } from '@/components/NotificationSettings'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Chore, ShoppingItem, Meal, Recipe, CalendarEvent } from '@/lib/types'
import { PWADiagnostics } from '@/components/PWADiagnostics'
import NotificationDiagnostics from '@/components/NotificationDiagnostics'
import { useAuth } from '@/lib/AuthContext'
import DiagnosticsPanel from '@/components/DiagnosticsPanel'
import { BugTracker } from '@/components/BugTracker'
import IntegrityDiagnostics from '@/components/IntegrityDiagnostics'
import UIDiagnostics from '@/components/UIDiagnostics'
import MigrationStatus from '@/components/MigrationStatus'
import { Switch as Toggle } from '@/components/ui/switch'

interface DashboardWidget {
  id: string
  label: string
  enabled: boolean
}

export default function SettingsSection() {
  const { currentHousehold, householdMembers, joinHousehold } = useAuth()
  const [currentThemeId, setCurrentThemeId] = useKV<string>('theme-id', 'warm-home')
  const [isDarkMode, setIsDarkMode] = useKV<boolean>('dark-mode', false)
  const [dashboardWidgetsRaw, setDashboardWidgets] = useKV<DashboardWidget[]>('dashboard-widgets', [])
  const isMobile = useIsMobile()

  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [shoppingItemsRaw, setShoppingItems] = useKV<ShoppingItem[]>('shopping-items', [])
  const [mealsRaw, setMeals] = useKV<Meal[]>('meals', [])
  const [recipesRaw, setRecipes] = useKV<Recipe[]>('recipes', [])
  const [eventsRaw, setEvents] = useKV<CalendarEvent[]>('calendar-events', [])
  const [showUiDiag, setShowUiDiag] = useKV<boolean>('ui-diagnostics-enabled', false)
  const [challengeEnabled, setChallengeEnabled] = useKV<boolean>('challenge-enabled', true)
  const [onboardingStatus, setOnboardingStatus] = useKV<{ completedSteps?: string[]; skipped?: boolean }>('onboarding-status', { completedSteps: [], skipped: false })
  
  const dashboardWidgets = dashboardWidgetsRaw ?? []
  const resolvedThemeId = currentThemeId || 'warm-home'
  const members = householdMembers ?? []
  const [joinCode, setJoinCode] = useState('')
  const chores = choresRaw ?? []
  const shoppingItems = shoppingItemsRaw ?? []
  const meals = mealsRaw ?? []
  const recipes = recipesRaw ?? []
  const events = eventsRaw ?? []

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<'all' | 'chores' | 'shopping' | 'meals' | 'recipes' | 'events' | null>(null)

  const defaultWidgets: DashboardWidget[] = [
    { id: 'stats', label: 'Statistics Cards', enabled: true },
    { id: 'todays-events', label: "Today's Events", enabled: true },
    { id: 'today-meals', label: "Today's Meals", enabled: true },
    { id: 'priorities', label: 'Top Priorities', enabled: true },
    { id: 'upcoming-events', label: 'Upcoming Events', enabled: true },
    { id: 'weekly-calendar', label: 'Weekly Meal Calendar', enabled: true },
    { id: 'shopping-preview', label: 'Shopping List Preview', enabled: true },
  ]

  const widgetSettings = dashboardWidgets.length > 0 ? dashboardWidgets : defaultWidgets

  const handleThemeChange = (themeId: string) => {
    const theme = getThemeById(themeId)
    if (theme) {
      applyTheme(theme, isDarkMode)
      setCurrentThemeId(themeId)
      toast.success(`Theme changed to ${theme.name}`)
    }
  }

  const handleDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked)
    const theme = getThemeById(resolvedThemeId)
    if (theme) {
      applyTheme(theme, checked)
    }
    toast.success(`${checked ? 'Dark' : 'Light'} mode enabled`)
  }

  const handleToggleWidget = (widgetId: string) => {
    const currentArr = dashboardWidgets ?? []
    const existing = currentArr.length > 0 ? currentArr : defaultWidgets
    const updated = existing.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w))
    setDashboardWidgets(updated)
    toast.success('Dashboard layout updated')
  }

  const handleDeleteData = async () => {
    if (!currentHousehold) {
      toast.error('No household selected')
      setIsConfirmDeleteOpen(false)
      return
    }
    
    // Filter out current household's data only, keeping other households' data intact
    const filterOtherHouseholds = <T extends { householdId: string }>(items: T[]) => 
      items.filter(item => item.householdId !== currentHousehold.id)
    
    switch (deleteTarget) {
      case 'all':
        setChores(filterOtherHouseholds(chores))
        setShoppingItems(filterOtherHouseholds(shoppingItems))
        setMeals(filterOtherHouseholds(meals))
        setRecipes(filterOtherHouseholds(recipes))
        setEvents(filterOtherHouseholds(events))
        toast.success('All household data deleted')
        break
      case 'chores':
        setChores(filterOtherHouseholds(chores))
        toast.success('All household chores deleted')
        break
      case 'shopping':
        setShoppingItems(filterOtherHouseholds(shoppingItems))
        toast.success('All household shopping items deleted')
        break
      case 'meals':
        setMeals(filterOtherHouseholds(meals))
        toast.success('All household meal plans deleted')
        break
      case 'recipes':
        setRecipes(filterOtherHouseholds(recipes))
        toast.success('All household recipes deleted')
        break
      case 'events':
        setEvents(filterOtherHouseholds(events))
        toast.success('All household calendar events deleted')
        break
    }
    setIsConfirmDeleteOpen(false)
    setDeleteTarget(null)
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const handleExportData = () => {
    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }
    
    // Export only current household's data
    const filterHousehold = <T extends { householdId: string }>(items: T[]) =>
      items.filter(item => item.householdId === currentHousehold.id)
    
    const exportData = {
      householdName: currentHousehold.name,
      chores: filterHousehold(chores),
      shoppingItems: filterHousehold(shoppingItems),
      meals: filterHousehold(meals),
      recipes: filterHousehold(recipes),
      events: filterHousehold(events),
      members,
      theme: currentThemeId,
      darkMode: isDarkMode,
      dashboardWidgets: widgetSettings,
      exportedAt: new Date().toISOString(),
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `homehub-backup-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported successfully')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Customize your HomeHub experience</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
            Dark Mode
          </CardTitle>
          <CardDescription>Toggle between light and dark appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-3">
              <Sun className="text-muted-foreground" size={20} />
              <Label htmlFor="dark-mode-toggle" className="cursor-pointer">
                {isDarkMode ? 'Dark mode enabled' : 'Light mode enabled'}
              </Label>
              <Moon className="text-muted-foreground" size={20} />
            </div>
            <Switch
              id="dark-mode-toggle"
              checked={isDarkMode}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkle size={24} />
            Onboarding & Motivation
          </CardTitle>
          <CardDescription>Control setup checklist and weekly challenge visibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show weekly challenge</p>
              <p className="text-xs text-muted-foreground">Highlights progress toward the weekly chore goal</p>
            </div>
            <Switch checked={challengeEnabled} onCheckedChange={setChallengeEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show setup checklist</p>
              <p className="text-xs text-muted-foreground">Restart onboarding if you skipped it</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOnboardingStatus({ completedSteps: [], skipped: false })}
              >
                Restart
              </Button>
              <Switch
                checked={!onboardingStatus?.skipped}
                onCheckedChange={(checked) => setOnboardingStatus({ ...(onboardingStatus ?? {}), skipped: !checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isMobile && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DeviceMobile size={24} />
                Mobile Navigation
              </CardTitle>
              <CardDescription>Customize your bottom navigation bar</CardDescription>
            </CardHeader>
            <CardContent>
              <MobileNavCustomizer />
            </CardContent>
          </Card>

          <MobileEnhancements />
        </>
      )}

      <NotificationSettings />

      <BugTracker />

      <PWADiagnostics />
      <NotificationDiagnostics />
      <DiagnosticsPanel />
      <IntegrityDiagnostics />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={24} />
            Household Access
          </CardTitle>
          <CardDescription>Share this household with another account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Give them this one-time join code and they can sign up/login, then join your household.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter join code"
            />
            <Button
              variant="secondary"
              onClick={async () => {
                if (!joinCode.trim()) {
                  toast.error('Enter a join code to use')
                  return
                }
                const res = await joinHousehold(joinCode.trim())
                if (res.success) {
                  toast.success('Joined household')
                } else {
                  toast.error(res.error || 'Failed to join')
                }
              }}
            >
              Join
            </Button>
          </div>
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Badge key={m.id} variant="secondary" className="text-sm pl-3 pr-2 py-2">
                  {m.displayName}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>UI Diagnostics</CardTitle>
            <CardDescription>Viewport, PWA mode, safe-area, SW.</CardDescription>
          </div>
          <Switch checked={!!showUiDiag} onCheckedChange={setShowUiDiag} />
        </CardHeader>
        {showUiDiag && (
          <CardContent>
            <UIDiagnostics />
          </CardContent>
        )}
      </Card>
      <MigrationStatus />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette size={24} />
            Theme
          </CardTitle>
          <CardDescription>Choose your preferred color scheme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:scale-[1.02] ${
                  currentThemeId === theme.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold">{theme.name}</div>
                  {currentThemeId === theme.id && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{theme.description}</p>
                <div className="flex gap-1">
                  <div
                    className="w-8 h-8 rounded-md border border-border"
                    style={{ background: theme.colors.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded-md border border-border"
                    style={{ background: theme.colors.secondary }}
                  />
                  <div
                    className="w-8 h-8 rounded-md border border-border"
                    style={{ background: theme.colors.accent }}
                  />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SquaresFour size={24} />
            Dashboard Layout
          </CardTitle>
          <CardDescription>Toggle which widgets appear on your dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {widgetSettings.map((widget) => (
            <div
              key={widget.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
            >
              <Label htmlFor={`widget-${widget.id}`} className="cursor-pointer flex-1">
                {widget.label}
              </Label>
              <Switch
                id={`widget-${widget.id}`}
                checked={widget.enabled}
                onCheckedChange={() => handleToggleWidget(widget.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={24} />
            Admin Functions
          </CardTitle>
          <CardDescription>Manage your data and application settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Export Data</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Download a backup of all your data as JSON
              </p>
              <Button variant="outline" size="sm" onClick={handleExportData} className="gap-2 w-full">
                <FloppyDisk />
                Export Backup
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Current Storage</h4>
              <p className="text-xs text-muted-foreground mb-2">
                {chores.length} chores, {shoppingItems.length} items, {meals.length} meals, {recipes.length}{' '}
                recipes, {events.length} events
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-destructive">Danger Zone</h4>
            <p className="text-xs text-muted-foreground">
              Permanently delete data from your application. This cannot be undone.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget('chores')
                  setIsConfirmDeleteOpen(true)
                }}
                className="gap-2 border-destructive/50 hover:bg-destructive/10"
              >
                <Trash />
                Delete All Chores
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget('shopping')
                  setIsConfirmDeleteOpen(true)
                }}
                className="gap-2 border-destructive/50 hover:bg-destructive/10"
              >
                <Trash />
                Delete All Shopping
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget('meals')
                  setIsConfirmDeleteOpen(true)
                }}
                className="gap-2 border-destructive/50 hover:bg-destructive/10"
              >
                <Trash />
                Delete All Meals
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget('recipes')
                  setIsConfirmDeleteOpen(true)
                }}
                className="gap-2 border-destructive/50 hover:bg-destructive/10"
              >
                <Trash />
                Delete All Recipes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget('events')
                  setIsConfirmDeleteOpen(true)
                }}
                className="gap-2 border-destructive/50 hover:bg-destructive/10"
              >
                <Trash />
                Delete All Events
              </Button>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteTarget('all')
                setIsConfirmDeleteOpen(true)
              }}
              className="gap-2 w-full"
            >
              <Trash />
              Delete All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash size={24} />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete{' '}
              {deleteTarget === 'all' ? 'all data' : `all ${deleteTarget}`}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDeleteOpen(false)
                setDeleteTarget(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteData}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
