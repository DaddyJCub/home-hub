import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Faders, House, Broom, ShoppingCart, CalendarBlank, CookingPot, BookOpen, Gear, Icon, DotsSixVertical } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TAB_CONFIGS } from '@/App'

export interface NavItem {
  id: string
  label: string
  shortLabel: string
  iconName: string
  enabled: boolean
}

const ICON_MAP: Record<string, Icon> = {
  house: House,
  broom: Broom,
  shoppingcart: ShoppingCart,
  cookingpot: CookingPot,
  calendarblank: CalendarBlank,
  bookopen: BookOpen,
  gear: Gear,
}

const ID_ICON_MAP: Record<string, Icon> = {
  dashboard: House,
  chores: Broom,
  shopping: ShoppingCart,
  meals: CookingPot,
  calendar: CalendarBlank,
  recipes: BookOpen,
  settings: Gear,
}

const getIcon = (iconName: string, fallbackId?: string): Icon => {
  const key = iconName?.toLowerCase().replace(/[^a-z]/g, '')
  if (key && ICON_MAP[key]) return ICON_MAP[key]
  if (fallbackId && ID_ICON_MAP[fallbackId]) return ID_ICON_MAP[fallbackId]
  return House
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', iconName: 'House', enabled: true },
  { id: 'chores', label: 'Chores', shortLabel: 'Chores', iconName: 'Broom', enabled: true },
  { id: 'shopping', label: 'Shopping', shortLabel: 'Shop', iconName: 'ShoppingCart', enabled: true },
  { id: 'meals', label: 'Meals', shortLabel: 'Meals', iconName: 'CookingPot', enabled: true },
  { id: 'settings', label: 'Settings', shortLabel: 'More', iconName: 'Gear', enabled: true },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', iconName: 'CalendarBlank', enabled: false },
  { id: 'recipes', label: 'Recipes', shortLabel: 'Recipes', iconName: 'BookOpen', enabled: false }
]

interface SortableNavItemProps {
  item: NavItem
  onToggle: (itemId: string) => void
}

function SortableNavItem({ item, onToggle }: SortableNavItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const ItemIcon = getIcon(item.iconName)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg ${
        isDragging ? 'opacity-50 ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={20} />
        </button>
        <ItemIcon size={20} />
        <Label htmlFor={item.id} className="cursor-pointer flex-1">
          {item.label}
        </Label>
      </div>
      <Switch
        id={item.id}
        checked={item.enabled}
        onCheckedChange={() => onToggle(item.id)}
      />
    </div>
  )
}

function MobileNavCustomizer() {
  const [navItemsRaw, setNavItems] = useKV<NavItem[]>('mobile-nav-items', DEFAULT_NAV_ITEMS)
  const navItems = navItemsRaw ?? DEFAULT_NAV_ITEMS
  const [open, setOpen] = useState(false)
  const tabMap = Object.fromEntries(TAB_CONFIGS.map((t) => [t.id, t]))

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  // Keep labels/icons in sync with tab config
  const syncedItems = navItems.map((item) => {
    const match = tabMap[item.id]
    if (match) {
      return { ...item, label: match.label, shortLabel: match.shortLabel, iconName: match.icon.name }
    }
    return item
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setNavItems((items) => {
        if (!items) return DEFAULT_NAV_ITEMS
        
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const resetToDefault = () => {
    setNavItems(DEFAULT_NAV_ITEMS)
  }

  const enabledCount = syncedItems?.filter(item => item.enabled).length ?? 0

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
            Drag to reorder, toggle to show/hide. Choose 3-5 tabs for your bottom navigation.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={syncedItems?.map(item => item.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {syncedItems?.map((item) => (
                  <SortableNavItem
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
