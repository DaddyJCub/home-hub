// Minimal recurrence sanity check (run with: node scripts/chore-recurrence-check.js)
const MS_DAY = 24 * 60 * 60 * 1000

const frequencyToMs = (frequency, customDays = 1) => {
  switch (frequency) {
    case 'daily': return MS_DAY
    case 'weekly': return 7 * MS_DAY
    case 'biweekly': return 14 * MS_DAY
    case 'monthly': return 30 * MS_DAY
    case 'quarterly': return 90 * MS_DAY
    case 'yearly': return 365 * MS_DAY
    case 'custom': return customDays * MS_DAY
    default: return 0
  }
}

const computeNextDueAt = (chore, completionTime) => {
  const interval = frequencyToMs(chore.frequency, chore.customIntervalDays || 1)
  if (chore.scheduleType === 'after_completion') {
    return completionTime + interval
  }
  let next = (chore.dueAt || completionTime) + interval
  while (next <= completionTime) next += interval
  return next
}

const now = Date.now()

const dailyFixed = {
  title: 'Daily fixed',
  frequency: 'daily',
  scheduleType: 'fixed',
  dueAt: new Date().setHours(19, 0, 0, 0)
}
const dailyNext = computeNextDueAt(dailyFixed, now)
console.log('[Daily Fixed] next due ->', new Date(dailyNext).toString())

const afterCompletion = {
  title: 'After completion',
  frequency: 'custom',
  customIntervalDays: 2,
  scheduleType: 'after_completion',
  dueAt: now
}
const afterNext = computeNextDueAt(afterCompletion, now)
console.log('[After Completion +2d] next due ->', new Date(afterNext).toString())

const passed = (dailyNext > now + MS_DAY * 0.5) && (afterNext - now >= 2 * MS_DAY)
console.log(passed ? 'Checks passed ✅' : 'Checks failed ❌')
