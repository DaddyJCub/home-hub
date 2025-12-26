import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Broom, CalendarBlank, ShoppingCart, CookingPot, CheckCircle, Clock } from '@phosphor-icons/react'
import type { Chore, CalendarEvent, ShoppingItem, Meal } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'

interface NotificationSummaryProps {
  className?: string
}

export function NotificationSummary({ className }: NotificationSummaryProps) {
  const { currentHousehold } = useAuth()
  const [choresRaw] = useKV<Chore[]>('chores', [])
  const [eventsRaw] = useKV<CalendarEvent[]>('calendar-events', [])
  const [shoppingItemsRaw] = useKV<ShoppingItem[]>('shopping-items', [])
  const [mealsRaw] = useKV<Meal[]>('meals', [])
  const allChores = choresRaw ?? []
  const allEvents = eventsRaw ?? []
  const allShoppingItems = shoppingItemsRaw ?? []
  const allMeals = mealsRaw ?? []
  
  // Filter by current household
  const chores = currentHousehold ? allChores.filter(c => c.householdId === currentHousehold.id) : []
  const events = currentHousehold ? allEvents.filter(e => e.householdId === currentHousehold.id) : []
  const shoppingItems = currentHousehold ? allShoppingItems.filter(i => i.householdId === currentHousehold.id) : []
  const meals = currentHousehold ? allMeals.filter(m => m.householdId === currentHousehold.id) : []

  const now = Date.now()
  const today = new Date().setHours(0, 0, 0, 0)
  const tomorrow = today + 24 * 60 * 60 * 1000

  const overdueChores = chores.filter(c => !c.completed && c.nextDue && c.nextDue < now)
  const todayChores = chores.filter(c => !c.completed && c.nextDue && c.nextDue >= today && c.nextDue < tomorrow)
  const completedChoresCount = chores.filter(c => c.completed).length
  const choreProgress = chores.length > 0 ? (completedChoresCount / chores.length) * 100 : 0

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.date).setHours(0, 0, 0, 0)
    return eventDate === today
  })

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.date).getTime()
    return eventDate > now && eventDate < now + 7 * 24 * 60 * 60 * 1000
  }).slice(0, 3)

  const pendingShoppingItems = shoppingItems.filter(item => !item.purchased)

  const todayMeals = meals.filter(m => {
    const mealDate = new Date(m.date).setHours(0, 0, 0, 0)
    return mealDate === today
  })

  const upcomingMeals = meals.filter(m => {
    const mealDate = new Date(m.date).getTime()
    return mealDate >= today && mealDate < today + 3 * 24 * 60 * 60 * 1000
  }).slice(0, 3)

  const hasNotifications = 
    overdueChores.length > 0 ||
    todayChores.length > 0 ||
    todayEvents.length > 0 ||
    pendingShoppingItems.length > 0 ||
    todayMeals.length > 0

  if (!hasNotifications) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={24} />
          Today's Summary
        </CardTitle>
        <CardDescription>Quick overview of what needs your attention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {overdueChores.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Broom size={20} className="text-destructive mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Overdue Chores</p>
                <Badge variant="destructive">{overdueChores.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {overdueChores.slice(0, 2).map(c => c.title).join(', ')}
                {overdueChores.length > 2 && ` and ${overdueChores.length - 2} more`}
              </p>
            </div>
          </div>
        )}

        {todayChores.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-border">
            <Broom size={20} className="text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Today's Chores</p>
                <Badge variant="secondary">{todayChores.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {todayChores.slice(0, 2).map(c => c.title).join(', ')}
                {todayChores.length > 2 && ` and ${todayChores.length - 2} more`}
              </p>
              <div className="mt-2">
                <Progress value={choreProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {completedChoresCount} of {chores.length} chores completed
                </p>
              </div>
            </div>
          </div>
        )}

        {todayEvents.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-border">
            <CalendarBlank size={20} className="text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Today's Events</p>
                <Badge variant="secondary">{todayEvents.length}</Badge>
              </div>
              <div className="space-y-1 mt-2">
                {todayEvents.slice(0, 2).map(event => (
                  <p key={event.id} className="text-sm text-muted-foreground">
                    {event.startTime && `${event.startTime} - `}{event.title}
                  </p>
                ))}
                {todayEvents.length > 2 && (
                  <p className="text-sm text-muted-foreground">and {todayEvents.length - 2} more</p>
                )}
              </div>
            </div>
          </div>
        )}

        {pendingShoppingItems.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/10 border border-border">
            <ShoppingCart size={20} className="text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Shopping List</p>
                <Badge variant="secondary">{pendingShoppingItems.length} items</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingShoppingItems.slice(0, 3).map(item => item.name).join(', ')}
                {pendingShoppingItems.length > 3 && ` and ${pendingShoppingItems.length - 3} more`}
              </p>
            </div>
          </div>
        )}

        {todayMeals.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-border">
            <CookingPot size={20} className="text-primary mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Today's Meals</p>
                <Badge variant="secondary">{todayMeals.length}</Badge>
              </div>
              <div className="space-y-1 mt-2">
                {todayMeals.map(meal => (
                  <p key={meal.id} className="text-sm text-muted-foreground">
                    {meal.type}: {meal.name}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationSummary
