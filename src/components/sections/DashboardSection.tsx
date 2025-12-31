import { 
  CalendarBlank, CheckCircle, ShoppingCart, CookingPot, Broom, 
  Clock, User, ArrowRight, CaretDown, CaretUp, House, Sparkle,
  Sun, Moon, CloudSun, MapPin, Bell, Warning, Check, Fire
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Chore, ShoppingItem, Meal, Recipe, CalendarEvent, ChoreCompletion } from '@/lib/types'
import { format, isToday, isAfter, isSameDay, startOfDay, addDays, parseISO, isTomorrow, formatDistanceToNow } from 'date-fns'
import { useState, useMemo, useCallback } from 'react'
import { NotificationSummary } from '@/components/NotificationSummary'
import { useAuth } from '@/lib/AuthContext'
import { toast } from 'sonner'
import { computeNextDueAt, getChoreStatus, normalizeChore, isCompletedForToday } from '@/lib/chore-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useKV } from '@github/spark/hooks'
import { OnboardingChecklist } from '@/components/OnboardingChecklist'

interface DashboardSectionProps {
  onNavigate?: (tab: string) => void
  onViewRecipe?: (recipeId: string) => void
  highlightChoreId?: string | null
}

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', icon: Sun }
  if (hour < 17) return { text: 'Good afternoon', icon: CloudSun }
  return { text: 'Good evening', icon: Moon }
}

// Priority colors
const priorityColors = {
  high: 'bg-red-500/20 text-red-700 border-red-300 dark:text-red-300',
  medium: 'bg-yellow-500/20 text-yellow-700 border-yellow-300 dark:text-yellow-300',
  low: 'bg-green-500/20 text-green-700 border-green-300 dark:text-green-300'
}

export default function DashboardSection({ onNavigate, onViewRecipe, highlightChoreId }: DashboardSectionProps) {
  const { householdMembers, currentHousehold, currentUser } = useAuth()
  const [roomsRaw] = useKV<string[]>('rooms', [])
  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [completionsRaw, setCompletions] = useKV<ChoreCompletion[]>('chore-completions', [])
  const [shoppingItemsRaw, setShoppingItems] = useKV<ShoppingItem[]>('shopping-items', [])
  const [mealsRaw] = useKV<Meal[]>('meals', [])
  const [recipesRaw] = useKV<Recipe[]>('recipes', [])
  const [eventsRaw] = useKV<CalendarEvent[]>('calendar-events', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  const memberFilter = selectedMember ?? 'all'
  const [challengeEnabled, setChallengeEnabled] = useKV<boolean>('challenge-enabled', true)

  // Collapsible states
  const [showAllChores, setShowAllChores] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [showShoppingPanel, setShowShoppingPanel] = useState(true)

  const allChores = choresRaw ?? []
  const allCompletions = completionsRaw ?? []
  const completions = useMemo(() => {
    return currentHousehold ? allCompletions.filter(c => c.householdId === currentHousehold.id) : []
  }, [allCompletions, currentHousehold])

  // Filter all data by current household
  const chores = useMemo(() => {
    return currentHousehold ? allChores.filter(c => c.householdId === currentHousehold.id).map(normalizeChore) : []
  }, [allChores, currentHousehold])

  const shoppingItems = useMemo(() => {
    const all = shoppingItemsRaw ?? []
    return currentHousehold ? all.filter(i => i.householdId === currentHousehold.id) : []
  }, [shoppingItemsRaw, currentHousehold])

  const meals = useMemo(() => {
    const all = mealsRaw ?? []
    return currentHousehold ? all.filter(m => m.householdId === currentHousehold.id) : []
  }, [mealsRaw, currentHousehold])

  const recipes = useMemo(() => {
    const all = recipesRaw ?? []
    return currentHousehold ? all.filter(r => r.householdId === currentHousehold.id) : []
  }, [recipesRaw, currentHousehold])

  const events = useMemo(() => {
    const all = eventsRaw ?? []
    return currentHousehold ? all.filter(e => e.householdId === currentHousehold.id) : []
  }, [eventsRaw, currentHousehold])

  const members = householdMembers ?? []

  // Complete chore handler
  const handleCompleteChore = useCallback((chore: Chore) => {
    if (!currentHousehold) return
    
    const now = Date.now()
    const normalized = normalizeChore(chore)
    const wasOnTime = !getChoreStatus(normalized, now).isOverdue
    
    // Create completion record
    const completion: ChoreCompletion = {
      id: `${chore.id}-${now}`,
      choreId: chore.id,
      completedBy: chore.assignedTo,
      householdId: currentHousehold.id,
      completedAt: now
    }
    setCompletions([...allCompletions, completion])
    
    // Update chore
    const updatedChore: Chore = { ...normalized }
    updatedChore.lastCompletedAt = now
    updatedChore.lastCompletedBy = chore.assignedTo
    updatedChore.totalCompletions = (chore.totalCompletions || 0) + 1
    
    // Update streak
    if (wasOnTime && chore.frequency !== 'once') {
      updatedChore.streak = (chore.streak || 0) + 1
      if (updatedChore.streak > (chore.bestStreak || 0)) {
        updatedChore.bestStreak = updatedChore.streak
      }
    } else {
      updatedChore.streak = 0
    }
    
    // Handle recurring vs one-time
    if (chore.frequency === 'once') {
      updatedChore.completed = true
    } else {
      updatedChore.completed = false
      updatedChore.dueAt = computeNextDueAt(updatedChore, now)
      
      // Handle rotation
      if (chore.rotation === 'rotate' && chore.rotationOrder && chore.rotationOrder.length > 0) {
        const nextIndex = ((chore.currentRotationIndex || 0) + 1) % chore.rotationOrder.length
        updatedChore.currentRotationIndex = nextIndex
        updatedChore.assignedTo = chore.rotationOrder[nextIndex]
      }
    }
    
    setChores(allChores.map(c => c.id === chore.id ? updatedChore : c))
    
    // Show toast
    if (updatedChore.streak && updatedChore.streak >= 3) {
      toast.success(`🔥 ${updatedChore.streak} day streak!`, { description: chore.title })
    } else {
      toast.success('Chore completed!', { description: chore.title })
    }
  }, [currentHousehold, allChores, allCompletions, setChores, setCompletions, computeNextDueAt])

  // Filtered data based on selected member
  const filteredChores = memberFilter === 'all' 
    ? chores 
    : chores.filter(c => c.assignedTo === memberFilter)

  const filteredEvents = memberFilter === 'all'
    ? events
    : events.filter(e => e.bookedBy === memberFilter || e.attendees?.includes(memberFilter))

  // Computed values
  const pendingChoresWithStatus = useMemo(() => {
    return filteredChores
      .filter(c => !c.completed && !isCompletedForToday(c))
      .map(chore => ({ chore, status: getChoreStatus(chore) }))
  }, [filteredChores])

  const pendingChores = pendingChoresWithStatus.map(p => p.chore)
  const highPriorityChores = pendingChores.filter(c => c.priority === 'high')
  const overdueChores = pendingChoresWithStatus.filter(p => p.status.isOverdue)
  const dueTodayChores = pendingChoresWithStatus.filter(p => p.status.isDueToday && !p.status.isOverdue)
  const upcomingChores = pendingChoresWithStatus
    .filter(p => !p.status.isOverdue && !p.status.isDueToday)
    .sort((a, b) => (a.status.dueAt || 0) - (b.status.dueAt || 0))
  const upcomingShort = upcomingChores.slice(0, 2)
  const unpurchasedItems = shoppingItems.filter(i => !i.purchased)
  
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todaysMeals = meals.filter(m => m.date === todayStr)

  // Today's and upcoming events
  const todaysEvents = useMemo(() => {
    return filteredEvents
      .filter(evt => evt.date === todayStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [filteredEvents, todayStr])

  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date())
    return filteredEvents
      .filter(evt => {
        const eventDate = parseISO(evt.date)
        return isAfter(eventDate, today) && !isSameDay(eventDate, today)
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
  }, [filteredEvents])

  // Get recipe name helper
  const getRecipeName = (recipeId?: string) => {
    if (!recipeId) return null
    const recipe = recipes.find(r => r.id === recipeId)
    return recipe?.name
  }

  // Completion stats
  const completionRate = chores.length > 0 
    ? Math.round(((chores.length - pendingChores.length) / chores.length) * 100)
    : 0
  const challenge = useMemo(() => {
    const goal = 10
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recent = completions.filter((c) => c.completedAt >= weekAgo && c.householdId === currentHousehold?.id && !c.skipped)
    const progress = Math.min(goal, recent.length)
    const percent = Math.round((progress / goal) * 100)
    const done = progress >= goal
    return { goal, progress, percent, done }
  }, [completions, currentHousehold])

  const choreById = useMemo(() => {
    const map: Record<string, Chore> = {}
    chores.forEach(c => { map[c.id] = c })
    return map
  }, [chores])

  const recentCompletions = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return completions
      .filter(c => c.completedAt >= cutoff && !c.skipped)
      .map(c => ({ completion: c, chore: choreById[c.choreId] }))
      .filter(item => !!item.chore)
      .sort((a, b) => b.completion.completedAt - a.completion.completedAt)
  }, [completions, choreById])

  const roomProgress = useMemo(() => {
    const byRoom: Record<string, { total: number; pending: number }> = {}
    const roomList = roomsRaw && roomsRaw.length > 0 ? roomsRaw : ['General']
    roomList.forEach(r => { byRoom[r] = { total: 0, pending: 0 } })
    chores.forEach(chore => {
      const rooms = chore.rooms?.length ? chore.rooms : [chore.room || 'General']
      rooms.forEach((room) => {
        if (!byRoom[room]) byRoom[room] = { total: 0, pending: 0 }
        byRoom[room].total += 1
        if (!chore.completed) byRoom[room].pending += 1
      })
    })
    return Object.entries(byRoom).map(([room, data]) => ({
      room,
      total: data.total,
      pending: data.pending,
      completion: data.total === 0 ? 100 : Math.round(((data.total - data.pending) / data.total) * 100)
    })).sort((a, b) => b.total - a.total)
  }, [chores, roomsRaw])

  const [detailChore, setDetailChore] = useState<Chore | null>(null)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [detailItem, setDetailItem] = useState<ShoppingItem | null>(null)

  const greeting = getGreeting()
  const GreetingIcon = greeting.icon
  const [enabledTabsRaw] = useKV<string[]>('enabled-tabs', ['dashboard', 'chores', 'shopping', 'meals', 'calendar', 'recipes'])
  const showShoppingTab = enabledTabsRaw?.includes('shopping') ?? true
  const showMeals = enabledTabsRaw?.includes('meals') ?? true
  const showCalendar = enabledTabsRaw?.includes('calendar') ?? true

  const showOnboarding = useMemo(() => {
    if (!currentHousehold) return false
    const empty =
      chores.length === 0 &&
      shoppingItems.length === 0 &&
      meals.length === 0 &&
      recipes.length === 0 &&
      events.length === 0
    return empty
  }, [currentHousehold, chores.length, shoppingItems.length, meals.length, recipes.length, events.length])

  return (
    <div className="space-y-4 pb-20">
      {showOnboarding && <OnboardingChecklist />}

      {/* Greeting Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <GreetingIcon size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{greeting.text}</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
        </div>
        {currentHousehold && (
          <Badge variant="outline" className="gap-1">
            <House size={12} />
            <span className="hidden sm:inline">{currentHousehold.name}</span>
          </Badge>
        )}
      </div>

      {/* Notification Summary - If any */}
      <NotificationSummary />

      {/* Quick Stats Row - Horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:overflow-visible">
        <QuickStatPill
          icon={Broom}
          label="Chores"
          value={pendingChores.length}
          subtext={completionRate > 0 ? `${completionRate}% done` : undefined}
          highlight={highPriorityChores.length > 0}
          onClick={() => onNavigate?.('chores')}
        />
        {showShoppingTab && (
          <QuickStatPill
            icon={ShoppingCart}
            label="Shopping"
            value={unpurchasedItems.length}
            subtext="items"
            onClick={() => onNavigate?.('shopping')}
          />
        )}
        {showCalendar && (
          <QuickStatPill
            icon={CalendarBlank}
            label="Today"
            value={todaysEvents.length}
            subtext="events"
            highlight={todaysEvents.length > 0}
            onClick={() => onNavigate?.('calendar')}
          />
        )}
        {showMeals && (
          <QuickStatPill
            icon={CookingPot}
            label="Meals"
            value={todaysMeals.length}
            subtext="planned"
            onClick={() => onNavigate?.('meals')}
          />
        )}
      </div>

      {/* Weekly Challenge */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkle className="text-primary" />
              <div>
                <p className="text-sm font-semibold">This week’s chore challenge</p>
                <p className="text-xs text-muted-foreground">Complete {challenge.goal} chores this week</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setChallengeEnabled(!challengeEnabled)}>
              {challengeEnabled ? 'Hide' : 'Show'}
            </Button>
          </div>
          {challengeEnabled && (
            <>
              <Progress value={challenge.percent} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span>{challenge.progress} of {challenge.goal} completed</span>
                {challenge.done ? (
                  <Badge variant="secondary" className="gap-1">
                    <Fire size={12} />
                    Complete!
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">{challenge.goal - challenge.progress} to go</span>
                )}
              </div>
              {challenge.done && (
                <div className="text-sm text-green-700 dark:text-green-300">
                  Nice work! You hit this week’s goal.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Alert: High Priority Chores */}
      {highPriorityChores.length > 0 && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Warning size={18} className="text-red-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  {highPriorityChores.length} high priority {highPriorityChores.length === 1 ? 'task' : 'tasks'}
                </span>
                <span className="text-xs text-red-600/80 dark:text-red-400/80 ml-2">
                  {highPriorityChores[0]?.title}
                  {highPriorityChores.length > 1 && ` +${highPriorityChores.length - 1} more`}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-red-700 hover:bg-red-100 dark:text-red-300 px-2"
                onClick={() => onNavigate?.('chores')}
              >
                <ArrowRight size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detailChore} onOpenChange={() => setDetailChore(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Broom size={18} className="text-primary" />
              {detailChore?.title}
            </DialogTitle>
          </DialogHeader>
          {detailChore && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{detailChore.priority || 'medium'}</Badge>
                <Badge variant="secondary">{detailChore.scheduleType === 'after_completion' ? 'After Completion' : 'Fixed'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {getChoreStatus(detailChore).label}
              </p>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <User size={14} /> {detailChore.assignedTo || 'Unassigned'}
                </div>
                {detailChore.room && (
                  <div className="flex items-center gap-2">
                    <House size={14} /> {detailChore.room}
                  </div>
                )}
              </div>
              {detailChore.description && (
                <p className="text-sm">{detailChore.description}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { handleCompleteChore(detailChore); setDetailChore(null) }}>
                  Complete
                </Button>
                <Button size="sm" variant="outline" onClick={() => onNavigate?.('chores')}>
                  Open in Chores
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailEvent} onOpenChange={() => setDetailEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarBlank size={18} className="text-primary" />
              {detailEvent?.title || 'Event'}
            </DialogTitle>
          </DialogHeader>
          {detailEvent && (
            <div className="space-y-3 text-sm">
              <div className="text-muted-foreground">
                {detailEvent.date} {detailEvent.startTime ? `• ${detailEvent.startTime}` : ''}
              </div>
              {detailEvent.location && <p className="text-muted-foreground">Location: {detailEvent.location}</p>}
              {detailEvent.description && <p>{detailEvent.description}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onNavigate?.('calendar'); setDetailEvent(null) }}>Open Calendar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-primary" />
              {detailItem?.name || 'Item'}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 text-sm">
              {detailItem.quantity && <p className="text-muted-foreground">Qty: {detailItem.quantity}</p>}
              {detailItem.store && <p className="text-muted-foreground">Store: {detailItem.store}</p>}
              {detailItem.notes && <p>{detailItem.notes}</p>}
              <DialogFooter className="justify-start gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setShoppingItems((prev) => (prev ?? []).map(i => i.id === detailItem.id ? { ...i, purchased: !i.purchased } : i))
                    setDetailItem(null)
                  }}
                >
                  {detailItem.purchased ? 'Mark Unpurchased' : 'Mark Purchased'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { onNavigate?.('shopping'); setDetailItem(null) }}>
                  Open Shopping
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Today's Schedule - Combined Events & Meals */}
      {(todaysEvents.length > 0 || todaysMeals.length > 0) && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sun size={18} className="text-primary" />
                Today's Schedule
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 text-xs"
                onClick={() => onNavigate?.('calendar')}
              >
                View All <ArrowRight size={12} className="ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {/* Today's Events */}
            {todaysEvents.slice(0, showAllEvents ? undefined : 3).map(event => (
              <div 
                key={event.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => setDetailEvent(event)}
              >
                <div className="w-12 text-center flex-shrink-0">
                  {event.isAllDay ? (
                    <span className="text-xs font-medium text-muted-foreground">All day</span>
                  ) : event.startTime ? (
                    <span className="text-sm font-semibold">{event.startTime}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">--:--</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  {event.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={10} />
                      {event.location}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {event.category}
                </Badge>
              </div>
            ))}

            {/* Meals */}
            {todaysMeals.length > 0 && (
              <div className="flex gap-2 mt-2 pt-2 border-t overflow-x-auto">
                {['breakfast', 'lunch', 'dinner'].map(type => {
                  const meal = todaysMeals.find(m => m.type === type)
                  const hasRecipe = meal?.recipeId
                  return (
                    <div 
                      key={type}
                      className={`flex-1 min-w-[100px] p-2 rounded-lg text-center transition-colors ${
                        meal ? 'bg-primary/10' : 'bg-muted/30'
                      } ${hasRecipe ? 'cursor-pointer hover:bg-primary/20 active:bg-primary/25' : ''}`}
                      onClick={() => {
                        if (hasRecipe && onViewRecipe) {
                          onViewRecipe(meal.recipeId!)
                        } else if (meal) {
                          onNavigate?.('meals')
                        }
                      }}
                    >
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{type}</p>
                      <p className={`text-xs truncate ${meal ? 'font-medium' : 'text-muted-foreground italic'}`}>
                        {meal?.name || '-'}
                      </p>
                      {hasRecipe && (
                        <p className="text-[10px] text-primary mt-0.5">View recipe →</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {todaysEvents.length > 3 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-7 text-xs"
                onClick={() => setShowAllEvents(!showAllEvents)}
              >
                {showAllEvents ? (
                  <>Show Less <CaretUp size={12} className="ml-1" /></>
                ) : (
                  <>Show {todaysEvents.length - 3} More <CaretDown size={12} className="ml-1" /></>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Chores - Collapsible */}
      <Collapsible open={showAllChores} onOpenChange={setShowAllChores}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 pt-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-primary" />
                  Pending Chores
                  <Badge variant="secondary" className="ml-1">{pendingChores.length}</Badge>
                </span>
                <div className="flex items-center gap-2">
                  {pendingChores.length > 3 && (
                    showAllChores ? <CaretUp size={16} /> : <CaretDown size={16} />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CardContent className="px-4 pb-3 space-y-3">
      {(overdueChores.length + dueTodayChores.length + upcomingShort.length) > 0 ? (
              <>
                {overdueChores.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1">
                      <Warning size={12} /> Overdue
                    </p>
                    <div className="space-y-1.5">
                      {overdueChores.map(({ chore }) => (
                        <ChoreItem key={chore.id} chore={chore} highlight={highlightChoreId === chore.id} onComplete={handleCompleteChore} onClick={() => setDetailChore(chore)} />
                      ))}
                    </div>
                  </div>
                )}
                {dueTodayChores.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-primary mb-1">Due Today</p>
                    <div className="space-y-1.5">
                      {dueTodayChores.map(({ chore }) => (
                        <ChoreItem key={chore.id} chore={chore} highlight={highlightChoreId === chore.id} onComplete={handleCompleteChore} onClick={() => setDetailChore(chore)} />
                      ))}
                    </div>
                  </div>
                )}
                {upcomingShort.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Upcoming</p>
                    <div className="space-y-1.5">
                      {upcomingShort.map(({ chore }) => (
                        <ChoreItem key={chore.id} chore={chore} highlight={highlightChoreId === chore.id} onComplete={handleCompleteChore} onClick={() => setDetailChore(chore)} />
                      ))}
                    </div>
                    {upcomingChores.length > 2 && (
                      <p className="text-[11px] text-muted-foreground mt-1">+{upcomingChores.length - 2} more later</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <Sparkle size={24} className="mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">All caught up! 🎉</p>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => onNavigate?.('chores')}
            >
              Manage Chores <ArrowRight size={14} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      </Collapsible>

      {/* Completed Recently */}
      {recentCompletions.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Card className="cursor-pointer">
              <CardHeader className="pb-2 pt-3 px-4 flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-500" />
                  Completed Recently
                </CardTitle>
                <CaretDown size={14} className="ui-open:rotate-180 transition-transform" />
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card>
              <CardContent className="px-4 pb-3 space-y-2">
                {recentCompletions.slice(0, 5).map(({ completion, chore }) => (
                  <button
                    key={completion.id}
                    className="flex items-center justify-between w-full p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-left hover:bg-green-100/80 dark:hover:bg-green-900/40 transition-colors"
                    onClick={() => chore && setDetailChore(chore)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{chore?.title || 'Chore'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Done {formatDistanceToNow(completion.completedAt, { addSuffix: true })}
                        {completion.completedBy && ` by ${completion.completedBy}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[11px] px-2 py-1">Open</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Room Progress */}
      {roomProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <House size={18} className="text-primary" />
              Room Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {roomProgress.map(room => (
              <div key={room.room} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{room.room}</span>
                  <span className="text-muted-foreground">
                    {room.total - room.pending}/{room.total} done
                  </span>
                </div>
                <Progress value={room.completion} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Shopping List - Compact */}
      {showShoppingTab && unpurchasedItems.length > 0 && (
        <Collapsible open={showShoppingPanel} onOpenChange={setShowShoppingPanel}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 pt-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart size={18} className="text-primary" />
                    Shopping List
                    <Badge variant="secondary" className="ml-1">{unpurchasedItems.length}</Badge>
                  </span>
                  {showShoppingPanel ? <CaretUp size={16} /> : <CaretDown size={16} />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {unpurchasedItems.slice(0, 12).map(item => (
                    <Badge 
                      key={item.id} 
                      variant="outline"
                      className="text-xs py-1 cursor-pointer"
                      onClick={() => setDetailItem(item)}
                    >
                      {item.name}
                      {item.quantity && item.quantity !== '1' && (
                        <span className="ml-1 opacity-60">×{item.quantity}</span>
                      )}
                    </Badge>
                  ))}
                  {unpurchasedItems.length > 12 && (
                    <Badge variant="secondary" className="text-xs">
                      +{unpurchasedItems.length - 12} more
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => onNavigate?.('shopping')}
                >
                  Go Shopping <ArrowRight size={14} className="ml-1" />
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Upcoming Events - Compact List */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarBlank size={18} className="text-primary" />
                Coming Up
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 text-xs"
                onClick={() => onNavigate?.('calendar')}
              >
                Calendar <ArrowRight size={12} className="ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1">
              {upcomingEvents.map(event => {
                const eventDate = parseISO(event.date)
                const isTmrw = isTomorrow(eventDate)
                return (
                  <div 
                    key={event.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setDetailEvent(event)}
                  >
                    <div className="w-10 text-center flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {isTmrw ? 'TMR' : format(eventDate, 'EEE').toUpperCase()}
                      </p>
                      <p className="text-sm font-bold">{format(eventDate, 'd')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{event.title}</p>
                    </div>
                    {event.startTime && (
                      <span className="text-xs text-muted-foreground">{event.startTime}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Household Members - Compact */}
      {members.length > 1 && selectedMember === 'all' && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={18} className="text-primary" />
              Family Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-3">
              {members.slice(0, 4).map(member => {
                const memberChores = chores.filter(c => c.assignedTo === member.displayName)
                const memberPending = memberChores.filter(c => !c.completed).length
                const memberCompleted = memberChores.filter(c => c.completed).length
                const rate = memberChores.length > 0 
                  ? Math.round((memberCompleted / memberChores.length) * 100)
                  : 0

                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {member.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{member.displayName}</span>
                        <span className="text-xs text-muted-foreground">{memberPending} pending</span>
                      </div>
                      <Progress value={rate} className="h-1.5" />
                    </div>
                    <span className="text-xs font-semibold text-primary w-8 text-right">{rate}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {pendingChores.length === 0 && todaysEvents.length === 0 && unpurchasedItems.length === 0 && (
        <Card className="p-6 text-center">
          <Sparkle size={40} className="mx-auto text-primary mb-3" />
          <h3 className="font-semibold mb-1">All Clear!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No pending tasks, events, or shopping items.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button size="sm" variant="outline" onClick={() => onNavigate?.('chores')}>
              Add Chore
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.('calendar')}>
              Add Event
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// Quick Stat Pill Component
interface QuickStatPillProps {
  icon: typeof Broom
  label: string
  value: number
  subtext?: string
  highlight?: boolean
  onClick?: () => void
}

function QuickStatPill({ icon: Icon, label, value, subtext, highlight, onClick }: QuickStatPillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full
        border transition-all active:scale-95
        ${highlight 
          ? 'bg-primary/10 border-primary/30 text-primary' 
          : 'bg-muted/50 border-border hover:bg-muted'
        }
      `}
    >
      <Icon size={16} className={highlight ? 'text-primary' : 'text-muted-foreground'} />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {subtext || label}
      </span>
    </button>
  )
}

// Chore Item Component
interface ChoreItemProps {
  chore: Chore
  onComplete: (chore: Chore) => void
  highlight?: boolean
}

function ChoreItem({ chore, onComplete, onClick, highlight }: ChoreItemProps & { onClick?: () => void }) {
  const status = getChoreStatus(chore)
  const friendly = status.isOverdue
    ? (status.daysOverdue > 0 ? `Overdue by ${status.daysOverdue} day${status.daysOverdue !== 1 ? 's' : ''}` : 'Overdue')
    : status.isDueToday
      ? 'Due today'
      : status.isDueSoon
        ? 'Due tomorrow'
        : `Due ${formatDistanceToNow(new Date(status.dueAt || Date.now()), { addSuffix: true })}`
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer min-h-[44px] ${highlight ? 'ring-2 ring-primary' : ''}`} onClick={onClick}>
      {/* Complete Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(chore); }}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-muted-foreground/30 
                   hover:border-primary hover:bg-primary/10 flex items-center justify-center 
                   transition-all opacity-60 group-hover:opacity-100"
        title="Mark complete"
      >
        <Check size={10} className="text-transparent group-hover:text-primary" />
      </button>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        chore.priority === 'high' ? 'bg-red-500' :
        chore.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{chore.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {friendly}
        </p>
        <div className="flex gap-1 mt-1">
          {status.isOverdue && <Badge variant="destructive" className="h-5 px-2 text-[11px]">Overdue</Badge>}
          {status.isDueToday && !status.isOverdue && <Badge variant="secondary" className="h-5 px-2 text-[11px]">Today</Badge>}
          {chore.room && <Badge variant="outline" className="h-5 px-2 text-[11px]">{chore.room}</Badge>}
          {chore.assignedTo && <Badge variant="outline" className="h-5 px-2 text-[11px]">Assigned: {chore.assignedTo}</Badge>}
        </div>
      </div>
      {chore.streak && chore.streak >= 2 && (
        <Badge className="text-[10px] px-1 py-0 gap-0.5 bg-orange-500">
          <Fire size={8} />
          {chore.streak}
        </Badge>
      )}
      {chore.assignedTo && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {chore.assignedTo}
        </Badge>
      )}
      {chore.estimatedMinutes && (
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <Clock size={10} />
          {chore.estimatedMinutes}m
        </span>
      )}
    </div>
  )
}
