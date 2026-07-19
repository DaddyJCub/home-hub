import type { Chore, ChoreCompletion } from '@/lib/types'

// Points reward finishing chores and power the weekly leaderboard + milestone
// celebrations (E2). Points are derived from a chore's priority so they work
// retroactively on existing data — no new field, no migration. Harder chores
// are worth more. Pure + unit-tested so every surface scores identically.

export const POINTS_BY_PRIORITY: Record<'low' | 'medium' | 'high', number> = {
  low: 5,
  medium: 10,
  high: 15,
}

export function pointsForChore(chore: Pick<Chore, 'priority'>): number {
  return POINTS_BY_PRIORITY[chore.priority ?? 'medium']
}

/** Lifetime milestones worth a celebration when a member crosses one. */
export const POINT_MILESTONES = [100, 250, 500, 1000, 2500, 5000]

export interface LeaderboardEntry {
  member: string
  points: number
  completions: number
}

interface TallyOptions {
  /** Only count completions at or after this epoch ms (e.g. start of week). */
  since?: number
  /** Only count completions strictly before this epoch ms. */
  until?: number
}

/**
 * Sum points per member from completion history. Skipped completions score
 * nothing. Chores referenced by a completion but no longer present fall back to
 * medium value so deleting a chore doesn't silently rewrite the scoreboard.
 */
export function tallyPoints(
  chores: Chore[],
  completions: ChoreCompletion[],
  options: TallyOptions = {},
): LeaderboardEntry[] {
  const byId = new Map(chores.map((c) => [c.id, c]))
  const totals = new Map<string, { points: number; completions: number }>()

  for (const completion of completions) {
    if (completion.skipped) continue
    if (options.since != null && completion.completedAt < options.since) continue
    if (options.until != null && completion.completedAt >= options.until) continue
    const member = (completion.completedBy || '').trim()
    if (!member) continue
    const chore = byId.get(completion.choreId)
    const pts = chore ? pointsForChore(chore) : POINTS_BY_PRIORITY.medium
    const cur = totals.get(member) ?? { points: 0, completions: 0 }
    cur.points += pts
    cur.completions += 1
    totals.set(member, cur)
  }

  return [...totals.entries()]
    .map(([member, v]) => ({ member, points: v.points, completions: v.completions }))
    .sort((a, b) => b.points - a.points || b.completions - a.completions || a.member.localeCompare(b.member))
}

/** Highest milestone crossed by going from `before` → `after` points, or null. */
export function milestoneReached(before: number, after: number): number | null {
  let hit: number | null = null
  for (const m of POINT_MILESTONES) {
    if (before < m && after >= m) hit = m
  }
  return hit
}
