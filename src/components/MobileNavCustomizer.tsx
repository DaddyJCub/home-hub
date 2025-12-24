import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Faders, House, Broom, ShoppingCart, CalendarBlank, CookingPot, BookOpen, Gear } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'

export interface NavItem {
  id: string
  label: string
  shortLabel: string
  icon: typeof House
  enabled: boolean
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: House, enabled: true },
  { id: 'chores', label: 'Chores', shortLabel: 'Chores', icon: Broom, enabled: true },
  { id: 'shopping', label: 'Shopping', shortLabel: 'Shop', icon: ShoppingCart, enabled: true },
  { id: 'meals', label: 'Meals', shortLabel: 'Meals', icon: CookingPot, enabled: true },
  { id: 'settings', label: 'Settings', shortLabel: 'More', icon: Gear, enabled: true },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', icon: CalendarBlank, enabled: false },
  { id: 'recipes', label: 'Recipes', shortLabel: 'Recipes', icon: BookOpen, enabled: false }
]

function MobileNavCustomizer() {
  const [navItems, setNavItems] = useKV<NavItem[]>('mobile-nav-items', DEFAULT_NAV_ITEMS)
  const [open, setOpen] = useState(false)

  const toggleItem = (itemId: string) => {
    setNavItems((current) => {
      if (!current) return DEFAULT_NAV_ITEMS
      const updated = current.map(item =>
        item.id === itemId ? { ...item, enabled: !item.enabled } : item
      )
      
      const enabledCount = updated.filter(item => item.enabled).length
      if (enabledCount < 3 || enabledCount > 5) {
        return current
      }
      
      return updated
    })
  }

  const resetToDefault = () => {
    setNavItems(DEFAULT_NAV_ITEMS)
  }

  const enabledCount = navItems?.filter(item => item.enabled).length ?? 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Faders />
          Customize Navigation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Bottom Navigation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose 3-5 tabs to show in your bottom navigation bar.
          </p>
          <div className="space-y-3">
            {navItems?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <Label htmlFor={item.id} className="cursor-pointer">
                    {item.label}
                  </Label>
                </div>
                <Switch
                  id={item.id}
                  checked={item.enabled}
                  onCheckedChange={() => toggleItem(item.id)}
                />
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {enabledCount} of 5 tabs selected
          </div>
          <Button onClick={resetToDefault} variant="outline" className="w-full">
            Reset to Default
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { MobileNavCustomizer }
export default MobileNavCustomizer
