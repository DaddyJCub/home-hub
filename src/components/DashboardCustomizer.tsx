import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  MapPin
} from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface DashboardWidget {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  enabled: boolean
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'stats',
    label: 'Statistics Cards',
    icon: <House size={20} />,
    description: 'Quick overview stats at the top',
    enabled: true,
  },
  {
    id: 'member-stats',
    label: 'Member Statistics',
    icon: <User size={20} />,
    description: 'Detailed breakdown per household member',
    enabled: true,
  },
  {
    id: 'room-chores',
    label: 'Room Chore Tracking',
    icon: <MapPin size={20} />,
    description: 'Chores organized by room',
    enabled: true,
  },
  {
    id: 'todays-events',
    label: "Today's Events",
    icon: <CalendarBlank size={20} />,
    description: "Events scheduled for today",
    enabled: true,
  },
  {
    id: 'today-meals',
    label: "Today's Meals",
    icon: <CookingPot size={20} />,
    description: 'Breakfast, lunch, and dinner plan',
    enabled: true,
  },
  {
    id: 'priorities',
    label: 'Top Priorities',
    icon: <CheckCircle size={20} />,
    description: 'Most important pending chores',
    enabled: true,
  },
  {
    id: 'upcoming-events',
    label: 'Upcoming Events',
    icon: <CalendarBlank size={20} />,
    description: 'Next few events on the calendar',
    enabled: true,
  },
  {
    id: 'weekly-calendar',
    label: 'Weekly Meal Calendar',
    icon: <CookingPot size={20} />,
    description: '7-day meal plan overview',
    enabled: true,
  },
  {
    id: 'shopping-preview',
    label: 'Shopping List Preview',
    icon: <ShoppingCart size={20} />,
    description: 'Quick view of shopping items',
    enabled: true,
  },
  {
    id: 'time-estimate',
    label: 'Time Estimates',
    icon: <Clock size={20} />,
    description: 'Total estimated time for pending chores',
    enabled: true,
  },
]

export default function DashboardCustomizer() {
  const [widgets, setWidgets] = useKV<DashboardWidget[]>('dashboard-widgets', defaultWidgets)

  const toggleWidget = (widgetId: string) => {
    setWidgets((currentWidgets) => {
      const current = (currentWidgets && currentWidgets.length > 0) ? currentWidgets : defaultWidgets
      return current.map((w) =>
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    })
  }

  const currentWidgets = (widgets && widgets.length > 0) ? widgets : defaultWidgets
  const enabledCount = currentWidgets.filter((w) => w.enabled).length

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Gear size={18} />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Customize Your Dashboard</DialogTitle>
          <DialogDescription>
            Toggle widgets on or off to personalize your dashboard view. {enabledCount} of {currentWidgets.length} widgets enabled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {currentWidgets.map((widget) => (
            <Card key={widget.id} className={widget.enabled ? 'border-primary/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 text-muted-foreground">{widget.icon}</div>
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
                      onCheckedChange={() => toggleWidget(widget.id)}
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
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
