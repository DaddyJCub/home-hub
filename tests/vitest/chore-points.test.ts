import { describe, it, expect } from 'vitest'
import { tallyPoints, pointsForChore, milestoneReached } from '@/lib/chore-points'
import type { Chore, ChoreCompletion } from '@/lib/types'

const chore = (over: Partial<Chore>): Chore => ({
  id: 'c1',
  householdId: 'h1',
  title: 'X',
  assignedTo: '',
  frequency: 'daily',
  completed: false,
  createdAt: 0,
  ...over,
})

const done = (over: Partial<ChoreCompletion>): ChoreCompletion => ({
  id: Math.random().toString(36).slice(2),
  choreId: 'c1',
  completedBy: 'Alex',
  householdId: 'h1',
  completedAt: 1000,
  ...over,
})

describe('chore-points', () => {
  it('scores by priority', () => {
    expect(pointsForChore({ priority: 'low' })).toBe(5)
    expect(pointsForChore({ priority: 'high' })).toBe(15)
    expect(pointsForChore({ priority: undefined })).toBe(10)
  })

  it('tallies points per member and ranks them', () => {
    const chores = [chore({ id: 'c1', priority: 'high' }), chore({ id: 'c2', priority: 'low' })]
    const completions = [
      done({ choreId: 'c1', completedBy: 'Alex' }), // 15
      done({ choreId: 'c2', completedBy: 'Alex' }), // 5
      done({ choreId: 'c1', completedBy: 'Sam' }), // 15
    ]
    const board = tallyPoints(chores, completions)
    expect(board[0]).toEqual({ member: 'Alex', points: 20, completions: 2 })
    expect(board[1]).toEqual({ member: 'Sam', points: 15, completions: 1 })
  })

  it('ignores skipped completions and respects the time window', () => {
    const chores = [chore({ id: 'c1', priority: 'medium' })]
    const completions = [
      done({ completedAt: 500, completedBy: 'Alex' }),
      done({ completedAt: 1500, completedBy: 'Alex', skipped: true }),
      done({ completedAt: 2500, completedBy: 'Alex' }),
    ]
    const board = tallyPoints(chores, completions, { since: 1000 })
    expect(board[0]).toEqual({ member: 'Alex', points: 10, completions: 1 })
  })

  it('falls back to medium for a deleted chore', () => {
    const board = tallyPoints([], [done({ choreId: 'gone', completedBy: 'Alex' })])
    expect(board[0].points).toBe(10)
  })

  it('detects the highest milestone crossed', () => {
    expect(milestoneReached(90, 105)).toBe(100)
    expect(milestoneReached(240, 260)).toBe(250)
    expect(milestoneReached(101, 120)).toBeNull()
  })
})
