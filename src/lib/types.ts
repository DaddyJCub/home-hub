export type UserRole = 'owner' | 'admin' | 'member'

export interface User {
  id: string
  email: string
  displayName: string
  createdAt: number
}

export interface Household {
  id: string
  name: string
  ownerId: string
  createdAt: number
  inviteCode?: string
}

export interface HouseholdMember {
  id: string
  householdId: string
  userId: string
  displayName: string
  role: UserRole
  joinedAt: number
  isLocal?: boolean
}

export interface HouseholdMemberLegacy {
  id: string
  name: string
}

export interface ChoreCompletion {
  id: string
  choreId: string
  completedBy: string // member name who completed
  householdId: string
  completedAt: number
  scheduledFor?: string // the date it was scheduled for
  notes?: string
  skipped?: boolean // if it was skipped rather than completed
}

export type ChoreFrequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export type ChoreRotation = 'none' | 'rotate' | 'anyone' // none = fixed assignee, rotate = auto-rotate, anyone = whoever does it

export interface Chore {
  id: string
  householdId: string
  title: string
  description?: string
  assignedTo: string
  frequency: ChoreFrequency
  customIntervalDays?: number // for custom frequency
  completed: boolean
  lastCompleted?: number
  lastCompletedBy?: string
  nextDue?: number
  createdAt: number
  room?: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  notes?: string
  daysOfWeek?: number[]
  estimatedMinutes?: number
  // New fields for enhanced tracking
  rotation?: ChoreRotation
  rotationOrder?: string[] // ordered list of member names for rotation
  currentRotationIndex?: number
  streak?: number // consecutive on-time completions
  bestStreak?: number
  totalCompletions?: number
  averageCompletionTime?: number // in minutes
  lastSkipped?: number
  trackTime?: boolean // whether to track actual time spent
}

export interface ShoppingItem {
  id: string
  householdId: string
  name: string
  category: string
  quantity: string
  purchased: boolean
  createdAt: number
  priority?: 'low' | 'medium' | 'high'
  notes?: string
  store?: string
}

export interface Recipe {
  id: string
  householdId: string
  name: string
  ingredients: string[]
  instructions: string
  prepTime?: string
  cookTime?: string
  servings?: string
  tags?: string[]
  category?: RecipeCategory // Primary category for organization
  sourceUrl?: string
  imageUrl?: string
  createdAt: number
  lastMade?: number // Track when recipe was last used
  timesCooked?: number // How many times this recipe has been made
  rating?: number // 1-5 star rating
  nutrition?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
}

export type RecipeCategory = 'breakfast' | 'lunch' | 'dinner' | 'side' | 'dessert' | 'snack' | 'drink' | 'appetizer' | 'soup' | 'salad' | 'other'

export interface Meal {
  id: string
  householdId: string
  date: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  recipeId?: string
  isNote?: boolean // For notes like "leftovers", "eating out", etc.
  servings?: number // How many servings for this meal
  notes?: string
}

export type EventCategory = 'personal' | 'work' | 'appointment' | 'booking' | 'vacation' | 'holiday' | 'school' | 'sports' | 'medical' | 'birthday' | 'other'

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export type ReminderTime = 'none' | '5min' | '15min' | '30min' | '1hour' | '2hours' | '1day' | '2days' | '1week'

export interface CalendarEvent {
  id: string
  householdId: string
  title: string
  date: string
  endDate?: string // For multi-day events (trips, vacations)
  isAllDay?: boolean
  startTime?: string
  endTime?: string
  description?: string
  location?: string
  attendees?: string[]
  category: EventCategory
  color?: string
  bookedBy?: string
  createdAt: number
  // Recurrence
  recurrence?: RecurrencePattern
  recurrenceEndDate?: string
  recurrenceParentId?: string // Links recurring instances to parent
  // Reminders
  reminder?: ReminderTime
  // Additional metadata
  isPrivate?: boolean
  notes?: string
  url?: string // Link to external resource
}
