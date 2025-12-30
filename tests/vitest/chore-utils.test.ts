import { describe, it, expect } from 'vitest'
import { computeNextDueAt, normalizeChore, getChoreStatus } from '@/lib/chore-utils'
import type { Chore } from '@/lib/types'

const baseChore: Chore = {
  id: '1',
  householdId: 'h1',
  title: 'Dishes',
  assignedTo: '',
  frequency: 'daily',
  completed: false,
  createdAt: Date.now()
}

describe('chore-utils', () => {
  it('normalizes missing fields', () => {
    const normalized = normalizeChore({ ...baseChore, priority: undefined } as any)
    expect(normalized.priority).toBeDefined()
    expect(normalized.frequency).toBe('daily')
  })

  it('computes next due for recurring chores', () => {
    const next = computeNextDueAt(baseChore, Date.now())
    expect(next).toBeGreaterThan(Date.now())
  })

  it('marks overdue correctly', () => {
    const chore = normalizeChore({ ...baseChore, dueAt: Date.now() - 86400000 })
    const status = getChoreStatus(chore, Date.now())
    expect(status.isOverdue).toBe(true)
  })
})
