import { describe, it, expect } from 'vitest'
import { validateChore, validateShopping, validateRecipe, validateEvent } from '@/lib/validators'
import type { Chore, ShoppingItem, Recipe, CalendarEvent } from '@/lib/types'

describe('validators', () => {
  it('rejects missing chore fields', () => {
    const res = validateChore({} as Chore)
    expect(res.valid).toBe(false)
  })

  it('normalizes shopping items', () => {
    const item: ShoppingItem = { id: '', householdId: '', name: 'Milk', category: 'Other', quantity: '', purchased: false, createdAt: Date.now() }
    const res = validateShopping(item)
    expect(res.valid).toBe(true)
    expect(res.normalized.id).not.toBe('')
  })

  it('defaults recipe fields', () => {
    const res = validateRecipe({} as Recipe)
    expect(res.normalized.name).toBeDefined()
  })

  it('requires event title/date', () => {
    const res = validateEvent({} as CalendarEvent)
    expect(res.valid).toBe(false)
  })
})
