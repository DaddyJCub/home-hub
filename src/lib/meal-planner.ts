import type { Meal, Recipe } from '@/lib/types'
import { differenceInCalendarDays, parseISO } from 'date-fns'

// Smarter recipe selection for the auto meal planner (E7): avoid repeating
// something the household ate recently, and prefer variety (least-recently
// cooked) instead of pure random. Pure + unit-tested so the standalone planner
// and any future surface choose meals the same way.

/** Recipe ids used in `meals` within `days` before `before` (ISO date). */
export function recentlyUsedRecipeIds(meals: Meal[], before: string, days = 10): Set<string> {
  const anchor = parseISO(before)
  const ids = new Set<string>()
  for (const meal of meals) {
    if (!meal.recipeId) continue
    const delta = differenceInCalendarDays(anchor, parseISO(meal.date))
    if (delta > 0 && delta <= days) ids.add(meal.recipeId)
  }
  return ids
}

interface ChooseOptions {
  /** How many times each recipe has already been placed in this run. */
  usedThisWeek: Map<string, number>
  /** Recipes eaten recently (downranked, not forbidden). */
  recentIds: Set<string>
  /** Injectable RNG for tests; defaults to Math.random. */
  rng?: () => number
}

/**
 * Pick a recipe favouring, in order: fewest placements this week, not eaten
 * recently, then least-recently cooked (`lastMade`). Ties are broken randomly
 * so plans still vary run to run. Returns null only for an empty list.
 */
export function chooseRecipe(eligible: Recipe[], opts: ChooseOptions): Recipe | null {
  if (eligible.length === 0) return null
  const rng = opts.rng ?? Math.random

  const scored = eligible.map((r) => ({
    recipe: r,
    used: opts.usedThisWeek.get(r.id) ?? 0,
    recent: opts.recentIds.has(r.id) ? 1 : 0,
    lastMade: r.lastMade ?? 0,
  }))

  scored.sort(
    (a, b) =>
      a.used - b.used ||
      a.recent - b.recent ||
      a.lastMade - b.lastMade,
  )

  // Randomise within the best tier (same used + recent as the front-runner) so
  // repeated runs don't produce identical plans.
  const best = scored[0]
  const topTier = scored.filter((s) => s.used === best.used && s.recent === best.recent)
  return topTier[Math.floor(rng() * topTier.length)].recipe
}

/** True if a recipe yields enough servings to be worth planning as leftovers. */
export function makesLeftovers(recipe: Recipe): boolean {
  const servings = Number.parseInt(recipe.servings ?? '', 10)
  return Number.isFinite(servings) && servings >= 4
}
