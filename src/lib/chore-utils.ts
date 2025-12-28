import type { Chore, ChoreFrequency, ChoreScheduleType } from './types'
import { startOfDay, isSameDay, formatDistanceToNow } from 'date-fns'

const MS_DAY = 24 * 60 * 60 * 1000

export const frequencyToMs = (frequency: ChoreFrequency, customDays?: number) => {
  switch (frequency) {
    case 'daily': return MS_DAY
    case 'weekly': return 7 * MS_DAY
    case 'biweekly': return 14 * MS_DAY
    case 'monthly': return 30 * MS_DAY
    case 'quarterly': return 90 * MS_DAY
    case 'yearly': return 365 * MS_DAY
    case 'custom': return (customDays || 7) * MS_DAY
    default: return 0
  }
}

export const normalizeChore = (chore: Chore): Chore => {
  const scheduleType: ChoreScheduleType = chore.scheduleType || (chore.frequency === 'once' ? 'fixed' : 'after_completion')
  const lastCompletedAt = chore.lastCompletedAt ?? (chore as any).lastCompleted

  let dueAt = chore.dueAt
  if (!dueAt) {
    if (chore.frequency === 'once') {
      dueAt = chore.dueDate ? new Date(chore.dueDate).getTime() : Date.now()
    } else if (chore.nextDue) {
      dueAt = chore.nextDue
    } else {
      const interval = frequencyToMs(chore.frequency, chore.customIntervalDays)
      dueAt = (lastCompletedAt || Date.now()) + interval
    }
  }

  return {
    ...chore,
    scheduleType,
    dueAt,
    lastCompletedAt
  }
}

export const computeNextDueAt = (chore: Chore, completionTime: number): number => {
  const normalized = normalizeChore(chore)
  const interval = frequencyToMs(normalized.frequency, normalized.customIntervalDays)

  if (normalized.frequency === 'once') return normalized.dueAt || completionTime
  if (normalized.scheduleType === 'after_completion') {
    return completionTime + interval
  }

  // Fixed schedule: move forward from current dueAt in interval steps until in future
  const base = normalized.dueAt || completionTime
  let next = base + interval
  const now = completionTime
  while (next <= now) {
    next += interval
  }
  return next
}

export const isCompletedForToday = (chore: Chore): boolean => {
  const normalized = normalizeChore(chore)
  if (!normalized.lastCompletedAt) return false
  const today = startOfDay(new Date())
  return isSameDay(today, new Date(normalized.lastCompletedAt))
}

export const getChoreStatus = (chore: Chore, nowTs: number = Date.now()) => {
  const normalized = normalizeChore(chore)
  const dueAt = normalized.dueAt || nowTs
  const isOverdue = dueAt < nowTs
  const daysOverdue = Math.floor((nowTs - dueAt) / MS_DAY)
  const dueDate = new Date(dueAt)
  const today = startOfDay(new Date(nowTs))
  const isDueToday = isSameDay(today, dueDate)
  const isDueSoon = !isDueToday && dueAt - nowTs <= 24 * 60 * 60 * 1000 && dueAt > nowTs

  return {
    dueAt,
    isOverdue,
    isDueToday,
    isDueSoon,
    daysOverdue,
    label: isOverdue
      ? `Overdue by ${formatDistanceToNow(dueDate, { addSuffix: true })}`
      : isDueToday
        ? `Due today`
        : `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`
  }
}
