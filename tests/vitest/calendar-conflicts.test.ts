import { describe, it, expect } from 'vitest'
import { findConflictingEventIds, conflictsForCandidate, parseMinutes } from '@/lib/calendar-conflicts'
import type { CalendarEvent } from '@/lib/types'

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: Math.random().toString(36).slice(2),
  householdId: 'h1',
  title: 'E',
  date: '2026-07-19',
  category: 'personal' as CalendarEvent['category'],
  createdAt: 0,
  ...over,
})

describe('calendar-conflicts', () => {
  it('parses HH:MM and rejects junk', () => {
    expect(parseMinutes('09:30')).toBe(570)
    expect(parseMinutes('24:00')).toBeNull()
    expect(parseMinutes('nope')).toBeNull()
    expect(parseMinutes(undefined)).toBeNull()
  })

  it('flags two overlapping timed events on the same day', () => {
    const a = ev({ startTime: '17:00', endTime: '18:00' })
    const b = ev({ startTime: '17:30', endTime: '18:30' })
    const ids = findConflictingEventIds([a, b])
    expect(ids.has(a.id)).toBe(true)
    expect(ids.has(b.id)).toBe(true)
  })

  it('does not flag back-to-back events (half-open intervals)', () => {
    const a = ev({ startTime: '17:00', endTime: '18:00' })
    const b = ev({ startTime: '18:00', endTime: '19:00' })
    expect(findConflictingEventIds([a, b]).size).toBe(0)
  })

  it('ignores all-day events and different days', () => {
    const a = ev({ isAllDay: true })
    const b = ev({ startTime: '17:00', endTime: '18:00' })
    const c = ev({ date: '2026-07-20', startTime: '17:00', endTime: '18:00' })
    expect(findConflictingEventIds([a, b, c]).size).toBe(0)
  })

  it('conflictsForCandidate excludes self and finds clashes', () => {
    const existing = [
      ev({ id: 'x', startTime: '09:00', endTime: '10:00' }),
      ev({ id: 'y', startTime: '12:00', endTime: '13:00' }),
    ]
    const hits = conflictsForCandidate(
      { date: '2026-07-19', startTime: '09:30', endTime: '09:45', isAllDay: false },
      existing,
      'y',
    )
    expect(hits.map((e) => e.id)).toEqual(['x'])
  })
})
