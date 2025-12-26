export const KV_DEFAULTS = {
  'theme-id': 'warm-home',
  'dark-mode': false,
  'enabled-tabs': ['dashboard', 'chores', 'shopping', 'meals'],
  'mobile-nav-items': [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', iconName: 'House', enabled: true },
    { id: 'chores', label: 'Chores', shortLabel: 'Chores', iconName: 'Broom', enabled: true },
    { id: 'shopping', label: 'Shopping', shortLabel: 'Shop', iconName: 'ShoppingCart', enabled: true },
    { id: 'meals', label: 'Meals', shortLabel: 'Meals', iconName: 'CookingPot', enabled: true },
    { id: 'settings', label: 'Settings', shortLabel: 'More', iconName: 'Gear', enabled: true },
    { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', iconName: 'CalendarBlank', enabled: false },
    { id: 'recipes', label: 'Recipes', shortLabel: 'Recipes', iconName: 'BookOpen', enabled: false }
  ],
  'notification-preferences': {
    enabled: false,
    choresEnabled: true,
    eventsEnabled: true,
    shoppingEnabled: false,
    mealsEnabled: true,
    choreReminderMinutes: 60,
    eventReminderMinutes: 30,
    shoppingReminderMinutes: 1440,
    mealReminderMinutes: 120,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    soundEnabled: true,
    vibrationEnabled: true,
    dailySummaryEnabled: false,
    dailySummaryTime: '08:00',
    weeklyReviewEnabled: false,
    weeklyReviewDay: 1,
    weeklyReviewTime: '18:00'
  },
  'mobile-preferences': {
    hapticFeedback: true,
    reduceMotion: false,
    compactView: false,
    swipeGestures: true,
    pullToRefresh: true,
    quickActions: true,
    fontSize: 'medium'
  },
  'quick-actions-config': {
    enabled: true,
    longPressDuration: 500
  },
  users: [],
  households: [],
  'household-members': [],
  'household-members-v2': [],
  chores: [],
  'calendar-events': [],
  'shopping-items': [],
  meals: [],
  recipes: [],
  'dashboard-widgets': [],
  'notification-history': [],
  'meal-day-constraints': [],
  'meal-daypart-configs': [],
  'selected-member-filter': 'all',
  'current-user-id': null,
  'current-household-id': null
}

export const REQUIRED_KV_KEYS = Object.keys(KV_DEFAULTS)

export function cloneDefaultValue(key) {
  if (!Object.prototype.hasOwnProperty.call(KV_DEFAULTS, key)) {
    return undefined
  }
  return JSON.parse(JSON.stringify(KV_DEFAULTS[key]))
}
