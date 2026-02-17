export interface DashboardWidget {
  id: string
  label: string
  iconName: string
  description: string
  enabled: boolean
  order?: number
}

export const defaultWidgets: DashboardWidget[] = [
  {
    id: 'stats',
    label: 'Statistics Cards',
    iconName: 'House',
    description: 'Quick overview stats at the top',
    enabled: true,
    order: 0,
  },
  {
    id: 'weekly-chore-schedule',
    label: 'Weekly Chore Schedule',
    iconName: 'CheckCircle',
    description: 'Compact 7-day chore calendar with quick complete',
    enabled: true,
    order: 1,
  },
  {
    id: 'priorities',
    label: 'Top Priorities',
    iconName: 'CheckCircle',
    description: 'Most important pending chores',
    enabled: true,
    order: 2,
  },
  {
    id: 'todays-events',
    label: "Today's Events",
    iconName: 'CalendarBlank',
    description: 'Events scheduled for today',
    enabled: true,
    order: 3,
  },
  {
    id: 'today-meals',
    label: "Today's Meals",
    iconName: 'CookingPot',
    description: 'Breakfast, lunch, and dinner plan',
    enabled: true,
    order: 4,
  },
  {
    id: 'room-chores',
    label: 'Room Chore Tracking',
    iconName: 'MapPin',
    description: 'Chores organized by room',
    enabled: true,
    order: 5,
  },
  {
    id: 'shopping-preview',
    label: 'Shopping List Preview',
    iconName: 'ShoppingCart',
    description: 'Quick view of shopping items',
    enabled: true,
    order: 6,
  },
  {
    id: 'upcoming-events',
    label: 'Upcoming Events',
    iconName: 'CalendarBlank',
    description: 'Next few events on the calendar',
    enabled: true,
    order: 7,
  },
  {
    id: 'member-stats',
    label: 'Member Statistics',
    iconName: 'User',
    description: 'Detailed breakdown per household member',
    enabled: true,
    order: 8,
  },
]

export const DEFAULT_WIDGET_ORDER = defaultWidgets.map(w => w.id)
