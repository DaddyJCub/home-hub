import { describe, it, expect } from 'vitest'
import { recentlyUsedRecipeIds, chooseRecipe, makesLeftovers } from '@/lib/meal-planner'
import type { Meal, Recipe } from '@/lib/types'

const recipe = (over: Partial<Recipe>): Recipe => ({
  id: 'r1',
  householdId: 'h1',
  name: 'Dish',
  ingredients: [],
  ...over,
})

const meal = (over: Partial<Meal>): Meal => ({
  id: Math.random().toString(36).slice(2),
  householdId: 'h1',
  date: '2026-07-15',
  type: 'dinner',
  name: 'x',
  ...over,
})

describe('meal-planner', () => {
  it('collects recipes eaten within the window before the anchor', () => {
    const meals = [
      meal({ date: '2026-07-15', recipeId: 'a' }), // 4 days before
      meal({ date: '2026-07-01', recipeId: 'b' }), // 18 days before → outside
      meal({ date: '2026-07-19', recipeId: 'c' }), // same day → not "before"
    ]
    const ids = recentlyUsedRecipeIds(meals, '2026-07-19', 10)
    expect(ids.has('a')).toBe(true)
    expect(ids.has('b')).toBe(false)
    expect(ids.has('c')).toBe(false)
  })

  it('prefers an unused, non-recent recipe over a recent one', () => {
    const eligible = [recipe({ id: 'recent' }), recipe({ id: 'fresh' })]
    const pick = chooseRecipe(eligible, {
      usedThisWeek: new Map(),
      recentIds: new Set(['recent']),
      rng: () => 0,
    })
    expect(pick?.id).toBe('fresh')
  })

  it('prefers the least-used recipe this week', () => {
    const eligible = [recipe({ id: 'twice' }), recipe({ id: 'once' })]
    const pick = chooseRecipe(eligible, {
      usedThisWeek: new Map([['twice', 2], ['once', 1]]),
      recentIds: new Set(),
      rng: () => 0,
    })
    expect(pick?.id).toBe('once')
  })

  it('returns null for an empty list', () => {
    expect(chooseRecipe([], { usedThisWeek: new Map(), recentIds: new Set() })).toBeNull()
  })

  it('flags recipes that make leftovers', () => {
    expect(makesLeftovers(recipe({ servings: '6' }))).toBe(true)
    expect(makesLeftovers(recipe({ servings: '2' }))).toBe(false)
    expect(makesLeftovers(recipe({ servings: undefined }))).toBe(false)
  })
})
