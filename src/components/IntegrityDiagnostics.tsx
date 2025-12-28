import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { useAuth } from '@/lib/AuthContext'
import type { Chore, ChoreCompletion } from '@/lib/types'
import { normalizeChore, computeNextDueAt, isCompletedForToday } from '@/lib/chore-utils'
import { addSoftLog, getSoftLogs, clearSoftLogs } from '@/lib/softLog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { validateChore, validateShopping, validateMeal, validateRecipe, validateEvent } from '@/lib/validators'

interface Issue {
  id: string
  label: string
  detail: string
  fix?: () => Promise<void>
}

export function IntegrityDiagnostics() {
  const { currentHousehold } = useAuth()
  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [completionsRaw] = useKV<ChoreCompletion[]>('chore-completions', [])
  const [shoppingRaw, setShopping] = useKV<Chore[]>('shopping-items', [])
  const [mealsRaw, setMeals] = useKV<Chore[]>('meals', [])
  const [recipesRaw, setRecipes] = useKV<Chore[]>('recipes', [])
  const [eventsRaw, setEvents] = useKV<Chore[]>('calendar-events', [])
  const [issues, setIssues] = useState<Issue[]>([])
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState(getSoftLogs())

  const chores = useMemo(
    () => (currentHousehold ? (choresRaw ?? []).filter(c => c.householdId === currentHousehold.id) : []),
    [choresRaw, currentHousehold]
  )

  const completions = useMemo(
    () => (currentHousehold ? (completionsRaw ?? []).filter(c => c.householdId === currentHousehold.id) : []),
    [completionsRaw, currentHousehold]
  )
  const shopping = useMemo(
    () => (currentHousehold ? (shoppingRaw as any[] ?? []).filter(c => (c as any).householdId === currentHousehold.id) : []),
    [shoppingRaw, currentHousehold]
  )
  const meals = useMemo(
    () => (currentHousehold ? (mealsRaw as any[] ?? []).filter(c => (c as any).householdId === currentHousehold.id) : []),
    [mealsRaw, currentHousehold]
  )
  const recipes = useMemo(
    () => (currentHousehold ? (recipesRaw as any[] ?? []).filter(c => (c as any).householdId === currentHousehold.id) : []),
    [recipesRaw, currentHousehold]
  )
  const events = useMemo(
    () => (currentHousehold ? (eventsRaw as any[] ?? []).filter(c => (c as any).householdId === currentHousehold.id) : []),
    [eventsRaw, currentHousehold]
  )

  const runChecks = async () => {
    if (!currentHousehold) return
    setRunning(true)
    const found: Issue[] = []

    for (const chore of chores) {
      const normalized = normalizeChore(chore)
      const validated = validateChore(normalized)
      if (!validated.valid) {
        found.push({
          id: `invalid-chore-${normalized.id || Math.random()}`,
          label: 'Invalid chore data',
          detail: `“${normalized.title || 'Untitled'}” is missing required fields`,
          fix: async () => {
            setChores((prev) => (prev ?? []).map(c => (c as any) === chore ? validated.normalized : c))
            addSoftLog('Normalized invalid chore', { title: normalized.title })
          }
        })
      }

      // Missing ID
      if (!normalized.id || normalized.id.trim() === '') {
        found.push({
          id: `missing-id-${Math.random()}`,
          label: 'Chore missing id',
          detail: `“${chore.title || 'Untitled'}” has no id`,
          fix: async () => {
            const newId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
            setChores((prev) => (prev ?? []).map(c => c === chore ? { ...c, id: newId } : c))
            addSoftLog('Assigned missing chore id', { title: chore.title, newId })
          }
        })
      }

      // Recurring missing dueAt
      if (normalized.frequency !== 'once' && !normalized.dueAt) {
        found.push({
          id: `missing-due-${normalized.id}`,
          label: 'Recurring chore missing next due',
          detail: `“${chore.title}” will be rescheduled`,
          fix: async () => {
            const nextDue = computeNextDueAt(normalized, Date.now())
            setChores((prev) => (prev ?? []).map(c => c.id === chore.id ? { ...normalizeChore(c), dueAt: nextDue } : c))
            addSoftLog('Filled missing dueAt', { title: chore.title, nextDue })
          }
        })
      }

      // Completed but still pending (once)
      if (normalized.frequency === 'once' && !normalized.completed && normalized.lastCompletedAt) {
        found.push({
          id: `completed-once-${normalized.id}`,
          label: 'One-time chore marked pending after completion',
          detail: `“${chore.title}” will be marked done`,
          fix: async () => {
            setChores((prev) => (prev ?? []).map(c => c.id === chore.id ? { ...normalizeChore(c), completed: true } : c))
            addSoftLog('Marked one-time chore completed', { title: chore.title })
          }
        })
      }

      // Recurring completed occurrence not advanced
      if (normalized.frequency !== 'once' && !normalized.completed && isCompletedForToday(normalized)) {
        found.push({
          id: `stuck-cycle-${normalized.id}`,
          label: 'Recurring chore stuck on completed occurrence',
          detail: `“${chore.title}” will move to next cycle`,
          fix: async () => {
            const nextDue = computeNextDueAt(normalized, normalized.lastCompletedAt || Date.now())
            setChores((prev) => (prev ?? []).map(c => c.id === chore.id ? { ...normalizeChore(c), dueAt: nextDue, completed: false } : c))
            addSoftLog('Advanced recurring chore after completion', { title: chore.title, nextDue })
          }
        })
      }
    }

    // Shopping validation
    shopping.forEach((item: any) => {
      const { valid, normalized } = validateShopping(item)
      if (!valid) {
        found.push({
          id: `shopping-${item.id || Math.random()}`,
          label: 'Shopping item missing info',
          detail: `“${item.name || 'Unnamed item'}” will be fixed`,
          fix: async () => {
            setShopping((prev) => (prev as any[] ?? []).map(i => i === item ? normalized : i) as any)
            addSoftLog('Normalized shopping item', { name: item.name })
          }
        })
      }
    })

    // Meal validation + orphaned recipes
    meals.forEach((meal: any) => {
      const { valid, normalized } = validateMeal(meal)
      if (!valid) {
        found.push({
          id: `meal-${meal.id || Math.random()}`,
          label: 'Meal missing info',
          detail: `Meal on ${meal.date || 'unknown date'} will be fixed`,
          fix: async () => {
            setMeals((prev) => (prev as any[] ?? []).map(m => m === meal ? normalized : m) as any)
            addSoftLog('Normalized meal', { id: normalized.id })
          }
        })
      }
      if (meal.recipeId && !recipes.some(r => (r as any).id === meal.recipeId)) {
        found.push({
          id: `meal-orphan-${meal.id}`,
          label: 'Meal links missing recipe',
          detail: `Link removed for meal on ${meal.date}`,
          fix: async () => {
            setMeals((prev) => (prev as any[] ?? []).map(m => m === meal ? { ...m, recipeId: undefined } : m) as any)
            addSoftLog('Removed orphaned meal recipe link', { mealId: meal.id })
          }
        })
      }
    })

    // Recipe validation
    recipes.forEach((recipe: any) => {
      const { valid, normalized } = validateRecipe(recipe)
      if (!valid) {
        found.push({
          id: `recipe-${recipe.id || Math.random()}`,
          label: 'Recipe missing info',
          detail: `“${recipe.name || 'Untitled recipe'}” will be fixed`,
          fix: async () => {
            setRecipes((prev) => (prev as any[] ?? []).map(r => r === recipe ? normalized : r) as any)
            addSoftLog('Normalized recipe', { name: recipe.name })
          }
        })
      }
    })

    // Event validation
    events.forEach((event: any) => {
      const { valid, normalized } = validateEvent(event)
      if (!valid) {
        found.push({
          id: `event-${event.id || Math.random()}`,
          label: 'Event missing info',
          detail: `“${event.title || 'Event'}” will be fixed`,
          fix: async () => {
            setEvents((prev) => (prev as any[] ?? []).map(e => e === event ? normalized : e) as any)
            addSoftLog('Normalized event', { title: event.title })
          }
        })
      }
      if (event.date && event.endDate && new Date(event.endDate) < new Date(event.date)) {
        found.push({
          id: `event-range-${event.id}`,
          label: 'Event date range invalid',
          detail: `“${event.title || 'Event'}” end is before start`,
          fix: async () => {
            setEvents((prev) => (prev as any[] ?? []).map(e => e === event ? { ...e, endDate: undefined } : e) as any)
            addSoftLog('Fixed event range', { title: event.title })
          }
        })
      }
    })

    if (found.length === 0) {
      addSoftLog('Integrity check passed')
    }

    setIssues(found)
    setRunning(false)
    setLogs(getSoftLogs())
  }

  const fixAll = async () => {
    for (const issue of issues) {
      if (issue.fix) {
        await issue.fix()
      }
    }
    setIssues([])
    setLogs(getSoftLogs())
    toast.success('Auto-fix applied')
  }

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(
        logs.map(l => `[${format(l.timestamp, 'yyyy-MM-dd HH:mm')}] ${l.message}`).join('\n')
      )
      toast.success('Copied recent warnings')
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Integrity checks</CardTitle>
          <CardDescription>Quick health check for chores data</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runChecks} disabled={running}>
            {running ? 'Checking…' : 'Run checks'}
          </Button>
          {issues.some(i => i.fix) && (
            <Button size="sm" onClick={fixAll} variant="secondary">
              Auto-fix safe issues
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {issues.length === 0 && (
          <div className="p-3 rounded-lg bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-100 text-sm">
            Everything looks good.
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            {issues.map(issue => (
              <div key={issue.id} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{issue.label}</p>
                    <p className="text-xs text-muted-foreground">{issue.detail}</p>
                  </div>
                  {issue.fix && (
                    <Button size="sm" variant="outline" onClick={issue.fix}>
                      Fix
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Recent soft warnings</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyLogs}>Copy</Button>
              <Button size="sm" variant="ghost" onClick={() => { clearSoftLogs(); setLogs([]) }}>
                Clear
              </Button>
            </div>
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No warnings logged.</p>
          ) : (
            <div className="space-y-1">
              {logs.slice(0, 10).map(log => (
                <div key={log.id} className="text-xs text-muted-foreground border-b last:border-0 pb-1">
                  <span className="text-foreground font-medium">
                    {format(log.timestamp, 'MMM d, HH:mm')}
                  </span>{' '}
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default IntegrityDiagnostics
