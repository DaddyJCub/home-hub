import { useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Gear, 
  Eye, 
  EyeSlash,
  House,
  CalendarBlank,
  ShoppingCart,
  CookingPot,
  CheckCircle,
  User,
  Clock,
  MapPin,
  DotsSixVertical,
  Sparkle,
  Layout,
  Hourglass
} from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
import { toast } from 'sonner'
import { defaultWidgets, type DashboardWidget } from '@/lib/widget-config'

export type { DashboardWidget } from '@/lib/widget-config'

interface DashboardPreset {
  id: string
  name: string
  description: string
  iconName: string
  widgets: string[]
}

const iconMap: Record<string, React.ElementType> = {
  House,
  Clock,
  CheckCircle,
  MapPin,
  User,
  CalendarBlank,
  CookingPot,
  ShoppingCart,
  Layout,
  Sparkle,
  Hourglass,
}

function getIcon(iconName: string, size: number = 20) {
  const IconComponent = iconMap[iconName] || House
  return <IconComponent size={size} />
}

const presets: DashboardPreset[] = [
  {
    id: 'full',
    name: 'Full View',
    description: 'All widgets enabled for complete overview',
    iconName: 'Layout',
    widgets: ['stats', 'time-estimates', 'weekly-chore-schedule', 'room-chores', 'member-stats', 'todays-events', 'today-meals', 'priorities', 'upcoming-events', 'weekly-meal-calendar', 'shopping-preview'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Essential widgets only',
    iconName: 'House',
    widgets: ['stats', 'time-estimates', 'weekly-chore-schedule', 'today-meals', 'priorities'],
  },
  {
    id: 'chores-focus',
    name: 'Chores Focus',
    description: 'Chore management emphasis',
    iconName: 'CheckCircle',
    widgets: ['stats', 'weekly-chore-schedule', 'room-chores', 'priorities'],
  },
  {
    id: 'events-focus',
    name: 'Events & Planning',
    description: 'Calendar and meal planning emphasis',
    iconName: 'CalendarBlank',
    widgets: ['stats', 'todays-events', 'today-meals', 'upcoming-events', 'weekly-meal-calendar'],
  },
  {
    id: 'household',
    name: 'Household View',
    description: 'Member tracking and collaboration',
    iconName: 'User',
    widgets: ['stats', 'member-stats', 'room-chores', 'todays-events', 'shopping-preview'],
  },
]

interface SortableWidgetProps {
  widget: DashboardWidget
  onToggle: (id: string) => void
}

function SortableWidget({ widget, onToggle }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={widget.enabled ? 'border-primary/50' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <button
                className="mt-1 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
                {...attributes}
                {...listeners}
              >
                <DotsSixVertical size={20} weight="bold" />
              </button>
              <div className="mt-1 text-muted-foreground">{getIcon(widget.iconName)}</div>
              <div className="flex-1">
                <Label htmlFor={`widget-${widget.id}`} className="text-base font-semibold cursor-pointer">
                  {widget.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{widget.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id={`widget-${widget.id}`}
                checked={widget.enabled}
                onCheckedChange={() => onToggle(widget.id)}
              />
              {widget.enabled ? (
                <Eye className="text-primary" size={18} />
              ) : (
                <EyeSlash className="text-muted-foreground" size={18} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardCustomizer() {
  const [widgetsRaw, setWidgets] = useKV<DashboardWidget[]>('dashboard-widgets', undefined)
  // Reconcile persisted widgets with defaults: canonical IDs/labels from defaultWidgets,
  // user's order + enabled state from persisted data. Removes stale, adds new.
  const widgets = useMemo(() => {
    const persisted = widgetsRaw ?? []
    if (persisted.length === 0) return defaultWidgets
    const persistedMap = new Map(persisted.map(w => [w.id, w]))
    return defaultWidgets.map((def) => {
      const saved = persistedMap.get(def.id)
      return {
        ...def,
        enabled: saved ? (saved.enabled === false ? false : true) : def.enabled !== false,
        order: saved?.order != null ? saved.order : def.order ?? 0,
      }
    })
  }, [widgetsRaw])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const toggleWidget = (widgetId: string) => {
    const current = (widgets && widgets.length > 0) ? widgets : defaultWidgets
    const updated = current.map((w) =>
      w.id === widgetId ? { ...w, enabled: w.enabled === false ? true : false } : w
    )
    setWidgets(updated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const current = (widgets && widgets.length > 0) ? widgets : defaultWidgets
      const oldIndex = current.findIndex((w) => w.id === active.id)
      const newIndex = current.findIndex((w) => w.id === over.id)
      
      const reordered = arrayMove(current, oldIndex, newIndex)
      const updated = reordered.map((w, i) => ({ ...w, order: i }))
      setWidgets(updated)
      toast.success('Widget order updated')
    }
  }

  const [lastPreset, setLastPreset] = useKV<string>('last-dashboard-preset', 'custom')

  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return

    const current = (widgets && widgets.length > 0) ? widgets : defaultWidgets
    const updated = current.map((w) => ({
      ...w,
      enabled: preset.widgets.includes(w.id),
    }))
    setWidgets(updated)
    setLastPreset(presetId)
    toast.success(`Applied "${preset.name}" preset`)
  }

  const currentWidgets = (widgets && widgets.length > 0) ? widgets : defaultWidgets
  const sortedWidgets = [...currentWidgets].sort((a, b) => (a.order || 0) - (b.order || 0))
  const enabledCount = currentWidgets.filter((w) => w.enabled).length
  const resetToDefault = () => {
    setWidgets(defaultWidgets)
    toast.success('Dashboard reset to default')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Gear size={18} />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkle className="text-primary" />
            Customize Your Dashboard
          </DialogTitle>
          <DialogDescription>
            Drag widgets to reorder, toggle visibility, or choose a preset. {enabledCount} of {currentWidgets.length} widgets enabled.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="widgets" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="widgets" className="gap-2">
              <Layout size={16} />
              Widgets
            </TabsTrigger>
            <TabsTrigger value="presets" className="gap-2">
              <Sparkle size={16} />
              Presets
            </TabsTrigger>
            </TabsList>

            <TabsContent value="widgets" className="flex-1 overflow-y-auto mt-4 space-y-3">
              <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>Tip:</strong> Drag the <DotsSixVertical size={14} className="inline" weight="bold" /> handle to reorder widgets
                  </span>
                  <Button variant="ghost" size="sm" onClick={resetToDefault}>Reset to default</Button>
                </div>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedWidgets.map(w => w.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedWidgets.map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    onToggle={toggleWidget}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-4">
            <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg border">
              Quick layouts for different use cases. Last applied: {lastPreset === 'custom' ? 'Custom' : presets.find(p => p.id === lastPreset)?.name || 'Custom'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {presets.map((preset) => (
                <Card key={preset.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => applyPreset(preset.id)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getIcon(preset.iconName)}
                      {preset.name}
                    </CardTitle>
                    <CardDescription className="text-sm">{preset.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {preset.widgets.map((widgetId) => {
                        const widget = defaultWidgets.find((w) => w.id === widgetId)
                        return widget ? (
                          <Badge key={widgetId} variant="secondary" className="text-xs">
                            {widget.label}
                          </Badge>
                        ) : null
                      })}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        applyPreset(preset.id)
                      }}
                    >
                      Apply Preset
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
