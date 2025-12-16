export type UserRole = 'owner' | 'admin' | 'member'

export interface User {
  id: string
  email: string
  passwordHash: string
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
}

export interface HouseholdMemberLegacy {
  id: string
  name: string
}

export interface ChoreCompletion {
  id: string
  choreId: string
  userId: string
  householdId: string
  completedAt: number
}

export interface Chore {
  id: string
  householdId: string
  title: string
  assignedTo: string
  frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  completed: boolean
  lastCompleted?: number
  nextDue?: number
  createdAt: number
  room?: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  notes?: string
  daysOfWeek?: number[]
  estimatedMinutes?: number
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
  sourceUrl?: string
  imageUrl?: string
  createdAt: number
}

export interface Meal {
  id: string
  householdId: string
  date: string
  type: 'breakfast' | 'lunch' | 'dinner'
  name: string
  recipeId?: string
}

export interface CalendarEvent {
  id: string
  householdId: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  description?: string
  location?: string
  attendees?: string[]
  category: 'personal' | 'work' | 'appointment' | 'booking' | 'other'
  color?: string
  bookedBy?: string
  createdAt: number
}
