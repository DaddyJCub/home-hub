export interface HouseholdMember {
  id: string
  name: string
}

export interface Chore {
  id: string
  title: string
  assignedTo: string
  frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  completed: boolean
  lastCompleted?: number
  nextDue?: number
  createdAt: number
}

export interface ShoppingItem {
  id: string
  name: string
  category: string
  quantity: string
  purchased: boolean
  createdAt: number
}

export interface Recipe {
  id: string
  name: string
  ingredients: string[]
  instructions: string
  prepTime?: string
  cookTime?: string
  servings?: string
  createdAt: number
}

export interface Meal {
  id: string
  date: string
  type: 'breakfast' | 'lunch' | 'dinner'
  name: string
  recipeId?: string
}
