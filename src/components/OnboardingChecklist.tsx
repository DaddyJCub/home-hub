import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { useAuth } from '@/lib/AuthContext'
import type { Chore, ShoppingItem, Meal, Recipe, CalendarEvent } from '@/lib/types'

type StepId = 'household-name' | 'member' | 'chore' | 'shopping' | 'event' | 'meal'

interface OnboardingStatus {
  completedSteps: StepId[]
  skipped?: boolean
}

const steps: { id: StepId; label: string; description: string }[] = [
  { id: 'household-name', label: 'Confirm household name', description: 'Make sure your household name looks right' },
  { id: 'member', label: 'Add a household member', description: 'Add at least one member so you can assign chores' },
  { id: 'chore', label: 'Create your first chore', description: 'Pick a quick win like Dishes or Take out trash' },
  { id: 'shopping', label: 'Add a shopping item', description: 'Add one thing to your shopping list' },
  { id: 'event', label: 'Add a calendar event', description: 'Add an appointment or reminder' },
  { id: 'meal', label: 'Plan a meal', description: 'Add a meal or link a recipe' }
]

export function OnboardingChecklist() {
  const { currentHousehold, userHouseholds } = useAuth()
  const [chores] = useKV<Chore[]>('chores', [])
  const [shoppingItems] = useKV<ShoppingItem[]>('shopping-items', [])
  const [meals] = useKV<Meal[]>('meals', [])
  const [recipes] = useKV<Recipe[]>('recipes', [])
  const [events] = useKV<CalendarEvent[]>('calendar-events', [])
  const [status, setStatus] = useKV<OnboardingStatus>('onboarding-status', { completedSteps: [] })
  const [dismissed, setDismissed] = useState(false)

  const householdId = currentHousehold?.id

  const derivedCompleted = useMemo<StepId[]>(() => {
    const completed: StepId[] = []
    if (userHouseholds.length > 0 && currentHousehold?.name) completed.push('household-name')
    const members = currentHousehold
      ? userHouseholds.some((h) => h.id === currentHousehold.id && h.ownerId) // rough check
      : false
    if (members) completed.push('member')
    const scopedChores = (chores ?? []).filter((c) => c.householdId === householdId)
    if (scopedChores.length > 0) completed.push('chore')
    const scopedItems = (shoppingItems ?? []).filter((i) => i.householdId === householdId)
    if (scopedItems.length > 0) completed.push('shopping')
    const scopedEvents = (events ?? []).filter((e) => e.householdId === householdId)
    if (scopedEvents.length > 0) completed.push('event')
    const scopedMeals = (meals ?? []).filter((m) => m.householdId === householdId)
    if (scopedMeals.length > 0 || recipes?.some((r) => r.householdId === householdId)) completed.push('meal')
    return completed
  }, [chores, shoppingItems, meals, recipes, events, householdId, currentHousehold, userHouseholds])

  const completedSteps = useMemo(() => {
    const stored = status?.completedSteps ?? []
    const merged = new Set([...stored, ...derivedCompleted])
    return Array.from(merged)
  }, [status?.completedSteps, derivedCompleted])

  const isComplete = completedSteps.length === steps.length
  const shouldShow = !dismissed && !status?.skipped && !isComplete

  useEffect(() => {
    if (isComplete && !status?.skipped) {
      toast.success('Setup complete! Enjoy HomeHub.')
      setStatus({ completedSteps: steps.map((s) => s.id) })
    }
  }, [isComplete, status?.skipped, setStatus])

  if (!shouldShow) return null

  const toggleStep = (id: StepId) => {
    const next = completedSteps.includes(id)
      ? completedSteps.filter((s) => s !== id)
      : [...completedSteps, id]
    setStatus({ completedSteps: next })
  }

  const skip = () => {
    setStatus({ completedSteps, skipped: true })
    setDismissed(true)
  }

  const restart = () => {
    setStatus({ completedSteps: [] })
    setDismissed(false)
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Finish setting up HomeHub</span>
          <Button variant="ghost" size="sm" onClick={skip}>
            Skip for now
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Complete these quick steps to get a useful first setup. You can restart anytime.
        </p>
        <div className="space-y-2">
          {steps.map((step) => (
            <label key={step.id} className="flex items-start gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2">
              <Checkbox checked={completedSteps.includes(step.id)} onCheckedChange={() => toggleStep(step.id)} />
              <div className="flex-1">
                <p className="text-sm font-medium leading-tight">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setDismissed(true)}>
            Hide
          </Button>
          <Button size="sm" variant="secondary" onClick={restart}>
            Restart onboarding
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
