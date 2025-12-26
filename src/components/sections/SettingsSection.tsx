import { useKV } from '@github/spark/hooks'
import { useState } from 'react'
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
  Plus,
  User,
  ShieldCheck,
  X,
  FloppyDisk,
  ArrowsClockwise,
  Moon,
  Sun,
  DeviceMobile,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { themes, applyTheme, getThemeById, type Theme } from '@/lib/themes'
import { MobileNavCustomizer } from '@/components/MobileNavCustomizer'
import { MobileEnhancements } from '@/components/MobileEnhancements'
import { NotificationSettings } from '@/components/NotificationSettings'
import { useIsMobile } from '@/hooks/use-mobile'
import type { HouseholdMember, Chore, ShoppingItem, Meal, Recipe, CalendarEvent } from '@/lib/types'
import { PWADiagnostics } from '@/components/PWADiagnostics'
import { PushDiagnostics } from '@/components/PushDiagnostics'
import DiagnosticsPanel from '@/components/DiagnosticsPanel'

interface DashboardWidget {
  id: string
  label: string
  enabled: boolean
}

export default function SettingsSection() {
  const [currentThemeId, setCurrentThemeId] = useKV<string>('theme-id', 'warm-home')
  const [isDarkMode, setIsDarkMode] = useKV<boolean>('dark-mode', false)
  const [membersRaw, setMembers] = useKV<HouseholdMember[]>('household-members', [])
  const [dashboardWidgetsRaw, setDashboardWidgets] = useKV<DashboardWidget[]>(
    'dashboard-widgets',
    []
  )
  const isMobile = useIsMobile()

  const [choresRaw] = useKV<Chore[]>('chores', [])
  const [shoppingItemsRaw] = useKV<ShoppingItem[]>('shopping-items', [])
  const [mealsRaw] = useKV<Meal[]>('meals', [])
  const [recipesRaw] = useKV<Recipe[]>('recipes', [])
  const [eventsRaw] = useKV<CalendarEvent[]>('calendar-events', [])
  
  const members = membersRaw ?? []
  const dashboardWidgets = dashboardWidgetsRaw ?? []
  const chores = choresRaw ?? []
  const shoppingItems = shoppingItemsRaw ?? []
  const meals = mealsRaw ?? []
  const recipes = recipesRaw ?? []
  const events = eventsRaw ?? []

  const [newMemberName, setNewMemberName] = useState('')
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
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
    const theme = getThemeById(currentThemeId)
    if (theme) {
      applyTheme(theme, checked)
    }
    toast.success(`${checked ? 'Dark' : 'Light'} mode enabled`)
  }

  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      toast.error('Please enter a name')
      return
    }

    toast.info('Member management has been moved to household settings')
  }

  const handleRemoveMember = (memberId: string) => {
    toast.info('Member management has been moved to household settings')
  }

  const handleToggleWidget = (widgetId: string) => {
    setDashboardWidgets((current) => {
      const currentArr = current ?? []
      const existing = currentArr.length > 0 ? currentArr : defaultWidgets
      return existing.map((w) => (w.id === widgetId ? { ...w, enabled: !w.enabled } : w))
    })
    toast.success('Dashboard layout updated')
  }

  const handleDeleteData = async () => {
    switch (deleteTarget) {
      case 'all':
        await window.spark.kv.delete('chores')
        await window.spark.kv.delete('shopping-items')
        await window.spark.kv.delete('meals')
        await window.spark.kv.delete('recipes')
        await window.spark.kv.delete('calendar-events')
        toast.success('All data deleted')
        break
      case 'chores':
        await window.spark.kv.delete('chores')
        toast.success('All chores deleted')
        break
      case 'shopping':
        await window.spark.kv.delete('shopping-items')
        toast.success('All shopping items deleted')
        break
      case 'meals':
        await window.spark.kv.delete('meals')
        toast.success('All meal plans deleted')
        break
      case 'recipes':
        await window.spark.kv.delete('recipes')
        toast.success('All recipes deleted')
        break
      case 'events':
        await window.spark.kv.delete('calendar-events')
        toast.success('All calendar events deleted')
        break
    }
    setIsConfirmDeleteOpen(false)
    setDeleteTarget(null)
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const handleExportData = () => {
    const exportData = {
      chores,
      shoppingItems,
      meals,
      recipes,
      events,
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

      <PWADiagnostics />
      <PushDiagnostics />
      <DiagnosticsPanel />

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
            <User size={24} />
            Household Members
          </CardTitle>
          <CardDescription>Manage who can be assigned to chores and tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <Badge key={member.id} variant="secondary" className="text-sm pl-3 pr-2 py-2">
                {member.displayName}
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="ml-2 hover:text-destructive transition-colors"
                >
                  <X size={14} />
                </button>
              </Badge>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No household members added yet</p>
            )}
          </div>

          <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Household Member</DialogTitle>
                <DialogDescription>Add someone who shares household responsibilities</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="member-name">Name</Label>
                  <Input
                    id="member-name"
                    placeholder="Enter name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddMember()
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember}>Add Member</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
