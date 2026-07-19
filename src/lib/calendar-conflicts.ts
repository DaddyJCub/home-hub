import type { CalendarEvent } from '@/lib/types'

// Two timed events on the same day whose [start,end) intervals overlap are a
// conflict. All-day events don't conflict (they're a backdrop, not a slot), and
// an event with no times can't be placed on a timeline so it's skipped. Kept as
// a pure function so it can be unit-tested and shared by every surface (the
// standalone app, the CM module, and the wall agenda) — the "build once" seam.

/** Minutes since midnight for "HH:MM", or null if unparseable. */
export function parseMinutes(hhmm?: string): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

interface Interval {
  event: CalendarEvent
  start: number
  end: number
}

function toInterval(event: CalendarEvent): Interval | null {
  if (event.isAllDay) return null
  const start = parseMinutes(event.startTime)
  if (start === null) return null
  // No end time → treat as a zero-length point, which still lets a later event
  // that starts before it (impossible) or a same-start event flag as a clash.
  const parsedEnd = parseMinutes(event.endTime)
  const end = parsedEnd === null ? start : Math.max(parsedEnd, start)
  return { event, start, end }
}

/** True if two half-open intervals [s,e) overlap. Zero-length events overlap
 *  only another interval that strictly contains their instant. */
function overlaps(a: Interval, b: Interval): boolean {
  if (a.start === a.end) return b.start < a.start && a.start < b.end
  if (b.start === b.end) return a.start < b.start && b.start < a.end
  return a.start < b.end && b.start < a.end
}

/**
 * Group events by calendar day and return, per day, the set of event ids that
 * overlap at least one other event that day. Only real timed events are
 * considered; recurring instances should be expanded by the caller first if it
 * wants them included.
 */
export function findConflictingEventIds(events: CalendarEvent[]): Set<string> {
  const byDay = new Map<string, Interval[]>()
  for (const event of events) {
    const interval = toInterval(event)
    if (!interval) continue
    const list = byDay.get(event.date) ?? []
    list.push(interval)
    byDay.set(event.date, list)
  }

  const conflicting = new Set<string>()
  for (const intervals of byDay.values()) {
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        if (overlaps(intervals[i], intervals[j])) {
          conflicting.add(intervals[i].event.id)
          conflicting.add(intervals[j].event.id)
        }
      }
    }
  }
  return conflicting
}

/** Events on `date` (excluding `self`) whose time overlaps `candidate`. Used to
 *  warn at create/edit time before a clashing event is saved. */
export function conflictsForCandidate(
  candidate: Pick<CalendarEvent, 'date' | 'startTime' | 'endTime' | 'isAllDay'>,
  existing: CalendarEvent[],
  selfId?: string,
): CalendarEvent[] {
  const cand = toInterval({ ...candidate, id: '__candidate__' } as CalendarEvent)
  if (!cand) return []
  const out: CalendarEvent[] = []
  for (const event of existing) {
    if (event.id === selfId) continue
    if (event.date !== candidate.date) continue
    const other = toInterval(event)
    if (!other) continue
    if (overlaps(cand, other)) out.push(event)
  }
  return out
}
