import type { Chore, ShoppingItem, Meal, Recipe, CalendarEvent } from './types'
import { normalizeChore } from './chore-utils'

export function validateChore(chore: Chore): { valid: boolean; normalized: Chore } {
  const normalized = normalizeChore(chore)
  if (!normalized.id || !normalized.title || !normalized.householdId) return { valid: false, normalized }
  return { valid: true, normalized }
}

export function validateShopping(item: ShoppingItem): { valid: boolean; normalized: ShoppingItem } {
  const normalized: ShoppingItem = {
    ...item,
    id: item.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: (item.name || '').trim(),
    householdId: item.householdId || ''
  }
  const valid = !!normalized.name && !!normalized.householdId
  return { valid, normalized }
}

export function validateMeal(meal: Meal): { valid: boolean; normalized: Meal } {
  const normalized: Meal = {
    ...meal,
    id: meal.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: meal.name || 'Untitled meal',
    householdId: meal.householdId || '',
    date: meal.date
  }
  const valid = !!normalized.date && !!normalized.householdId
  return { valid, normalized }
}

export function validateRecipe(recipe: Recipe): { valid: boolean; normalized: Recipe } {
  const normalized: Recipe = {
    ...recipe,
    id: recipe.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: recipe.name || 'Untitled recipe',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: recipe.instructions || '',
    householdId: recipe.householdId || ''
  }
  const valid = !!normalized.name && !!normalized.householdId
  return { valid, normalized }
}

export function validateEvent(event: CalendarEvent): { valid: boolean; normalized: CalendarEvent } {
  const normalized: CalendarEvent = {
    ...event,
    id: event.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: event.title || 'Untitled event',
    date: event.date,
    householdId: event.householdId || ''
  }
  const valid = !!normalized.title && !!normalized.date && !!normalized.householdId
  return { valid, normalized }
}
