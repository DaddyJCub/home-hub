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
  Layout
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

export interface DashboardWidget {
  id: string
  label: string
  iconName: string
  description: string
  enabled: boolean
  order?: number
}

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
}

function getIcon(iconName: string, size: number = 20) {
  const IconComponent = iconMap[iconName] || House
  return <IconComponent size={size} />
}

interface SortableWidgetProps {
  widget: DashboardWidget
  onToggle: (id: string) => void
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'stats',
    label: 'Statistics Cards',
    iconName: 'House',
    description: 'Quick overview stats at the top',
    enabled: true,
    order: 0,
  },
  {
    id: 'time-estimate',
    label: 'Time Estimates',
    iconName: 'Clock',
    description: 'Total estimated time for pending chores',
    enabled: true,
    order: 1,
  },
  {
    id: 'weekly-chore-schedule',
    label: 'Weekly Chore Schedule',
    iconName: 'CheckCircle',
    description: 'Compact 7-day chore calendar with quick complete',
    enabled: true,
    order: 2,
  },
  {
    id: 'room-chores',
    label: 'Room Chore Tracking',
    iconName: 'MapPin',
    description: 'Chores organized by room',
    enabled: true,
    order: 3,
  },
  {
    id: 'member-stats',
    label: 'Member Statistics',
    iconName: 'User',
    description: 'Detailed breakdown per household member',
    enabled: true,
    order: 4,
  },
  {
    id: 'todays-events',
    label: "Today's Events",
    iconName: 'CalendarBlank',
    description: "Events scheduled for today",
    enabled: true,
    order: 5,
  },
  {
    id: 'today-meals',
    label: "Today's Meals",
    iconName: 'CookingPot',
    description: 'Breakfast, lunch, and dinner plan',
    enabled: true,
    order: 6,
  },
  {
    id: 'priorities',
    label: 'Top Priorities',
    iconName: 'CheckCircle',
    description: 'Most important pending chores',
    enabled: true,
    order: 7,
  },
  {
    id: 'upcoming-events',
    label: 'Upcoming Events',
    iconName: 'CalendarBlank',
    description: 'Next few events on the calendar',
    enabled: true,
    order: 8,
  },
  {
    id: 'weekly-calendar',
    label: 'Weekly Meal Calendar',
    iconName: 'CookingPot',
    description: '7-day meal plan overview',
    enabled: true,
    order: 9,
  },
  {
    id: 'shopping-preview',
    label: 'Shopping List Preview',
    iconName: 'ShoppingCart',
    description: 'Quick view of shopping items',
    enabled: true,
    order: 10,
  },
]

const presets: DashboardPreset[] = [
  {
    id: 'full',
    name: 'Full View',
    description: 'All widgets enabled for complete overview',
    iconName: 'Layout',
    widgets: ['stats', 'time-estimate', 'weekly-chore-schedule', 'room-chores', 'member-stats', 'todays-events', 'today-meals', 'priorities', 'upcoming-events', 'weekly-calendar', 'shopping-preview'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Essential widgets only',
    iconName: 'House',
    widgets: ['stats', 'weekly-chore-schedule', 'today-meals', 'priorities'],
  },
  {
    id: 'chores-focus',
    name: 'Chores Focus',
    description: 'Chore management emphasis',
    iconName: 'CheckCircle',
    widgets: ['stats', 'time-estimate', 'weekly-chore-schedule', 'room-chores', 'priorities'],
  },
  {
    id: 'events-focus',
    name: 'Events & Planning',
    description: 'Calendar and meal planning emphasis',
    iconName: 'CalendarBlank',
    widgets: ['stats', 'todays-events', 'today-meals', 'upcoming-events', 'weekly-calendar'],
  },
  {
    id: 'household',
    name: 'Household View',
    description: 'Member tracking and collaboration',
    iconName: 'User',
    widgets: ['stats', 'member-stats', 'room-chores', 'todays-events', 'shopping-preview'],
  },
]

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
  const [widgets, setWidgets] = useKV<DashboardWidget[]>('dashboard-widgets', defaultWidgets)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const toggleWidget = (widgetId: string) => {
    setWidgets((currentWidgets) => {
      const current = (currentWidgets && currentWidgets.length > 0) ? currentWidgets : defaultWidgets
      return current.map((w) =>
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setWidgets((currentWidgets) => {
        const current = (currentWidgets && currentWidgets.length > 0) ? currentWidgets : defaultWidgets
        const oldIndex = current.findIndex((w) => w.id === active.id)
        const newIndex = current.findIndex((w) => w.id === over.id)
        
        const reordered = arrayMove(current, oldIndex, newIndex)
        return reordered.map((w, i) => ({ ...w, order: i }))
      })
      toast.success('Widget order updated')
    }
  }

  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return

    setWidgets((currentWidgets) => {
      const current = (currentWidgets && currentWidgets.length > 0) ? currentWidgets : defaultWidgets
      return current.map((w) => ({
        ...w,
        enabled: preset.widgets.includes(w.id),
      }))
    })
    toast.success(`Applied "${preset.name}" preset`)
  }

  const currentWidgets = (widgets && widgets.length > 0) ? widgets : defaultWidgets
  const sortedWidgets = [...currentWidgets].sort((a, b) => (a.order || 0) - (b.order || 0))
  const enabledCount = currentWidgets.filter((w) => w.enabled).length

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
              <strong>Tip:</strong> Drag the <DotsSixVertical size={14} className="inline" weight="bold" /> handle to reorder widgets
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
              Quick layouts for different use cases
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
