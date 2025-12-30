import { z } from 'zod'
import type { CalendarEvent, Chore, Meal, Recipe, ShoppingItem } from './types'
import { normalizeChore } from './chore-utils'

type ValidationResult<T> = { valid: boolean; normalized: T; errors: string[] }

const buildResult = <T>(parsed: { success: boolean; data?: T; error?: any }, fallback: T): ValidationResult<T> => {
  if (parsed.success) {
    return { valid: true, normalized: parsed.data as T, errors: [] }
  }
  const issues = parsed.error?.issues ?? []
  const messages = issues.map((i: any) => i.message || 'Invalid value')
  return { valid: false, normalized: fallback, errors: messages }
}

const nonEmptyString = (label: string, max = 200) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`)

const choreSchema = z
  .object({
    id: nonEmptyString('Chore id'),
    householdId: nonEmptyString('Household id'),
    title: nonEmptyString('Chore title'),
    description: z.string().max(2000).optional(),
    assignedTo: z.string().max(200).optional().default(''),
    frequency: z
      .enum(['once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'])
      .default('once'),
    customIntervalDays: z.number().int().positive().max(365).optional(),
    scheduleType: z.enum(['fixed', 'after_completion']).optional(),
    completed: z.boolean().default(false),
    dueAt: z.number().int().optional(),
    lastCompletedAt: z.number().int().optional(),
    lastCompletedBy: z.string().max(200).optional(),
    createdAt: z.number().int().optional(),
    room: z.string().max(200).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dueDate: z.string().max(50).optional(),
    notes: z.string().max(2000).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    estimatedMinutes: z.number().int().positive().max(1440).optional(),
    rotation: z.enum(['none', 'rotate', 'anyone']).optional(),
    rotationOrder: z.array(z.string().max(200)).optional(),
    currentRotationIndex: z.number().int().nonnegative().optional(),
    streak: z.number().int().nonnegative().optional(),
    bestStreak: z.number().int().nonnegative().optional(),
    totalCompletions: z.number().int().nonnegative().optional(),
    averageCompletionTime: z.number().int().nonnegative().optional(),
    lastSkipped: z.number().int().optional(),
    trackTime: z.boolean().optional()
  })
  .passthrough()

export function validateChore(chore: Chore): ValidationResult<Chore> {
  const normalized = normalizeChore(chore)
  const parsed = choreSchema.safeParse(normalized)
  return buildResult(parsed, normalized)
}

const shoppingSchema = z
  .object({
    id: nonEmptyString('Shopping id'),
    householdId: nonEmptyString('Household id'),
    name: nonEmptyString('Item name'),
    category: z.string().max(120).optional().default(''),
    quantity: z.string().max(120).optional().default('1'),
    purchased: z.boolean().optional().default(false),
    createdAt: z.number().int().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    notes: z.string().max(2000).optional(),
    store: z.string().max(200).optional()
  })
  .passthrough()

export function validateShopping(item: ShoppingItem): ValidationResult<ShoppingItem> {
  const defaults: ShoppingItem = {
    ...item,
    id: item.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: (item.name || '').trim(),
    quantity: item.quantity ?? '1',
    householdId: item.householdId || '',
    purchased: item.purchased ?? false
  } as ShoppingItem
  const parsed = shoppingSchema.safeParse(defaults)
  return buildResult(parsed, defaults)
}

const mealSchema = z
  .object({
    id: nonEmptyString('Meal id'),
    householdId: nonEmptyString('Household id'),
    date: nonEmptyString('Meal date'),
    type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    name: nonEmptyString('Meal name'),
    recipeId: z.string().optional(),
    isNote: z.boolean().optional(),
    servings: z.number().int().positive().max(100).optional(),
    notes: z.string().max(2000).optional()
  })
  .passthrough()

export function validateMeal(meal: Meal): ValidationResult<Meal> {
  const defaults: Meal = {
    ...meal,
    id: meal.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: meal.name || 'Untitled meal',
    householdId: meal.householdId || ''
  } as Meal
  const parsed = mealSchema.safeParse(defaults)
  return buildResult(parsed, defaults)
}

const recipeSchema = z
  .object({
    id: nonEmptyString('Recipe id'),
    householdId: nonEmptyString('Household id'),
    name: nonEmptyString('Recipe name'),
    ingredients: z.array(z.string().max(500)).default([]),
    instructions: z.string().max(10000).optional().default(''),
    prepTime: z.string().max(100).optional(),
    cookTime: z.string().max(100).optional(),
    servings: z.string().max(50).optional(),
    tags: z.array(z.string().max(100)).optional(),
    category: z
      .enum([
        'breakfast',
        'lunch',
        'dinner',
        'side',
        'dessert',
        'snack',
        'drink',
        'appetizer',
        'soup',
        'salad',
        'other'
      ])
      .optional(),
    sourceUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    createdAt: z.number().int().optional(),
    lastMade: z.number().int().optional(),
    timesCooked: z.number().int().nonnegative().optional(),
    rating: z.number().min(1).max(5).optional(),
    nutrition: z
      .object({
        calories: z.number().nonnegative().optional(),
        protein: z.number().nonnegative().optional(),
        carbs: z.number().nonnegative().optional(),
        fat: z.number().nonnegative().optional()
      })
      .optional()
  })
  .passthrough()

export function validateRecipe(recipe: Recipe): ValidationResult<Recipe> {
  const defaults: Recipe = {
    ...recipe,
    id: recipe.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: recipe.name || 'Untitled recipe',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: recipe.instructions || '',
    householdId: recipe.householdId || ''
  } as Recipe
  const parsed = recipeSchema.safeParse(defaults)
  return buildResult(parsed, defaults)
}

const eventSchema = z
  .object({
    id: nonEmptyString('Event id'),
    householdId: nonEmptyString('Household id'),
    title: nonEmptyString('Event title'),
    date: nonEmptyString('Event date'),
    endDate: z.string().optional(),
    isAllDay: z.boolean().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    description: z.string().max(2000).optional(),
    location: z.string().max(500).optional(),
    attendees: z.array(z.string().max(200)).optional(),
    category: z
      .enum([
        'personal',
        'work',
        'appointment',
        'booking',
        'vacation',
        'holiday',
        'school',
        'sports',
        'medical',
        'birthday',
        'other'
      ])
      .default('other'),
    color: z.string().max(50).optional(),
    bookedBy: z.string().max(200).optional(),
    createdAt: z.number().int().optional(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']).optional(),
    recurrenceEndDate: z.string().optional(),
    recurrenceParentId: z.string().optional(),
    reminder: z.enum(['none', '5min', '15min', '30min', '1hour', '2hours', '1day', '2days', '1week']).optional(),
    isPrivate: z.boolean().optional(),
    notes: z.string().max(2000).optional(),
    url: z.string().url().optional()
  })
  .passthrough()

export function validateEvent(event: CalendarEvent): ValidationResult<CalendarEvent> {
  const defaults: CalendarEvent = {
    ...event,
    id: event.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: event.title || 'Untitled event',
    householdId: event.householdId || '',
    category: event.category || 'other'
  } as CalendarEvent
  const parsed = eventSchema.safeParse(defaults)
  return buildResult(parsed, defaults)
}
