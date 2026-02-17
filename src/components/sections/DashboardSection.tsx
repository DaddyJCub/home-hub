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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Chore, ShoppingItem, Meal, Recipe, CalendarEvent, ChoreCompletion } from '@/lib/types'
import type { DashboardWidget } from '@/components/DashboardCustomizer'
import { format, isToday, isAfter, isSameDay, startOfDay, addDays, parseISO, isTomorrow, formatDistanceToNow } from 'date-fns'
import { useState, useMemo, useCallback, Fragment } from 'react'
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

  // Collapsible states (persisted)
  const [showAllChores, setShowAllChores] = useKV<boolean>('dashboard-show-all-chores', false)
  const [showAllEvents, setShowAllEvents] = useKV<boolean>('dashboard-show-all-events', false)
  const [showShoppingPanel, setShowShoppingPanel] = useKV<boolean>('dashboard-show-shopping', true)

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
  const handleCompleteChore = useCallback((chore: Chore, roomOverride?: string) => {
    if (!currentHousehold) return
    
    const now = Date.now()
    const normalized = normalizeChore(chore)
    const wasOnTime = !getChoreStatus(normalized, now).isOverdue
    const rooms = normalized.rooms?.length ? normalized.rooms : (normalized.room ? [normalized.room] : [])
    const completedRoomsSet = new Set(normalized.completedRooms || [])
    if (roomOverride) completedRoomsSet.add(roomOverride)
    const completedRooms = Array.from(completedRoomsSet)
    const allRoomsDone = rooms.length === 0 ? true : completedRooms.length >= rooms.length
    
    // Create completion record
    const completion: ChoreCompletion = {
      id: `${chore.id}-${now}`,
      choreId: chore.id,
      completedBy: chore.assignedTo,
      householdId: currentHousehold.id,
      completedAt: now,
      room: roomOverride
    }
    setCompletions([...allCompletions, completion])
    
    // Update chore
    const updatedChore: Chore = { ...normalized }
    updatedChore.lastCompletedAt = now
    updatedChore.lastCompletedBy = chore.assignedTo
    updatedChore.totalCompletions = (chore.totalCompletions || 0) + 1
    updatedChore.completedRooms = completedRooms
    
    // Update streak only when all rooms are done
    if (allRoomsDone) {
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
        updatedChore.completedRooms = []
        
        // Handle rotation
        if (chore.rotation === 'rotate' && chore.rotationOrder && chore.rotationOrder.length > 0) {
          const nextIndex = ((chore.currentRotationIndex || 0) + 1) % chore.rotationOrder.length
          updatedChore.currentRotationIndex = nextIndex
          updatedChore.assignedTo = chore.rotationOrder[nextIndex]
        }
      }
    } else {
      updatedChore.completed = false
    }
    
    const prevChores = [...allChores]
    const prevCompletions = [...allCompletions]
    setChores(allChores.map(c => c.id === chore.id ? updatedChore : c))
    
    // Show toast with undo
    const message = updatedChore.streak && updatedChore.streak >= 3
      ? `🔥 ${updatedChore.streak} day streak!`
      : 'Chore completed!'
    toast.success(message, {
      description: roomOverride ? `${chore.title} (${roomOverride})` : chore.title,
      action: {
        label: 'Undo',
        onClick: () => {
          setChores(prevChores)
          setCompletions(prevCompletions)
        }
      }
    })
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
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)
    const weekAgo = addDays(today, -7).getTime()
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
    return Object.entries(byRoom).map(([room, data]) => {
      const roomChores = chores.filter((c) => (c.rooms?.length ? c.rooms : [c.room || 'General']).includes(room))
      const dueToday = roomChores.filter((c) => {
        const due = c.dueAt || 0
        return due >= today.getTime() && due < tomorrow.getTime() && !c.completed
      }).length
      const overdue = roomChores.filter((c) => (c.dueAt || 0) < today.getTime() && !c.completed).length
      const completedThisWeek = completions.filter((comp) => {
        if (comp.completedAt < weekAgo) return false
        const chore = roomChores.find((c) => c.id === comp.choreId)
        return !!chore
      }).length
      return {
        room,
        total: data.total,
        pending: data.pending,
        completion: data.total === 0 ? 0 : Math.round(((data.total - data.pending) / data.total) * 100),
        dueToday,
        overdue,
        completedThisWeek
      }
    }).filter(r => r.total > 0).sort((a, b) => b.total - a.total)
  }, [chores, roomsRaw, completions])

  const [detailChore, setDetailChore] = useState<Chore | null>(null)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [detailItem, setDetailItem] = useState<ShoppingItem | null>(null)

  const greeting = getGreeting()
  const GreetingIcon = greeting.icon
  const [enabledTabsRaw] = useKV<string[]>('enabled-tabs', ['dashboard', 'chores', 'shopping', 'meals', 'calendar', 'recipes'])
  const [onboardingStatus] = useKV<{ completedSteps?: string[]; skipped?: boolean; force?: boolean }>('onboarding-status', { completedSteps: [], skipped: false })
  const showShoppingTab = enabledTabsRaw?.includes('shopping') ?? true
  const showMeals = enabledTabsRaw?.includes('meals') ?? true
  const showCalendar = enabledTabsRaw?.includes('calendar') ?? true

  const showOnboarding = useMemo(() => {
    if (!currentHousehold) return false
    if (onboardingStatus?.skipped) return false
    const empty =
      chores.length === 0 &&
      shoppingItems.length === 0 &&
      meals.length === 0 &&
      recipes.length === 0 &&
      events.length === 0
    return empty || onboardingStatus?.force
  }, [currentHousehold, chores.length, shoppingItems.length, meals.length, recipes.length, events.length, onboardingStatus])

  // Widget ordering from DashboardCustomizer
  const [dashboardWidgetsRaw] = useKV<DashboardWidget[]>('dashboard-widgets', undefined)

  const isWidgetEnabled = useCallback((id: string) => {
    if (!dashboardWidgetsRaw || dashboardWidgetsRaw.length === 0) return true
    const w = dashboardWidgetsRaw.find(w => w.id === id)
    return w ? w.enabled !== false : true
  }, [dashboardWidgetsRaw])

  // Default widget order matches current hardcoded layout
  const DEFAULT_WIDGET_ORDER = ['stats', 'weekly-chore-schedule', 'priorities', 'todays-events', 'today-meals', 'room-chores', 'shopping-preview', 'upcoming-events', 'member-stats']

  const sortedWidgetIds = useMemo(() => {
    if (!dashboardWidgetsRaw || dashboardWidgetsRaw.length === 0) {
      return DEFAULT_WIDGET_ORDER
    }
    return [...dashboardWidgetsRaw]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(w => w.id)
  }, [dashboardWidgetsRaw])

  // Widget renderer - maps widget IDs to their JSX
  const renderWidget = useCallback((id: string): React.ReactNode => {
    if (!isWidgetEnabled(id)) return null

    switch (id) {
      case 'stats':
        return (
          <div key="stats" className="lg:col-span-2 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:overflow-visible">
            <QuickStatPill
              icon={Broom}
              label="Chores"
              value={pendingChores.length}
              subtext={completionRate > 0 ? `${completionRate}% done` : 'pending'}
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
        )

      case 'weekly-chore-schedule':
        return (
          <div key="weekly-chore-schedule" className="lg:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-3">
              <Sparkle size={16} className="text-primary flex-shrink-0" />
              <span className="text-sm font-medium flex-shrink-0">Weekly Challenge</span>
              <div className="flex-1 min-w-0">
                <Progress value={challenge.percent} className="h-2" />
              </div>
              <span className="text-sm font-semibold text-primary flex-shrink-0">
                {challenge.progress}/{challenge.goal}
              </span>
              {challenge.done ? (
                <Badge variant="secondary" className="gap-1 flex-shrink-0">
                  <Fire size={12} />
                  Done!
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground flex-shrink-0">{challenge.goal - challenge.progress} to go</span>
              )}
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => setChallengeEnabled(!challengeEnabled)}>
                {challengeEnabled ? <CaretUp size={14} /> : <CaretDown size={14} />}
              </Button>
            </div>
            {challengeEnabled && challenge.done && (
              <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-7">
                Nice work! You hit this week's goal.
              </p>
            )}
          </div>
        )

      case 'priorities':
        return (
          <div key="priorities" className="lg:col-span-2 space-y-4">
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

            {/* Pending Chores - Collapsible */}
            <Collapsible open={showAllChores} onOpenChange={setShowAllChores}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-4 pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
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
                <CardContent className="px-4 pb-4 space-y-3">
                  {(overdueChores.length + dueTodayChores.length + upcomingShort.length) > 0 ? (
                    <>
                      {overdueChores.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1">
                            <Warning size={12} /> Overdue
                          </p>
                          <div className="space-y-2">
                            {overdueChores.map(({ chore }) => (
                              <ChoreItem key={chore.id} chore={chore} highlight={highlightChoreId === chore.id} onComplete={handleCompleteChore} onClick={() => setDetailChore(chore)} />
                            ))}
                          </div>
                        </div>
                      )}
                      {dueTodayChores.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1.5">Due Today</p>
                          <div className="space-y-2">
                            {dueTodayChores.map(({ chore }) => (
                              <ChoreItem key={chore.id} chore={chore} highlight={highlightChoreId === chore.id} onComplete={handleCompleteChore} onClick={() => setDetailChore(chore)} />
                            ))}
                          </div>
                        </div>
                      )}
                      {upcomingShort.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Upcoming</p>
                          <div className="space-y-2">
                            {upcomingShort.map(({ chore }) => (
                              <ChoreItem key={chore.id} chore={chore} highlight={highlightChoreId === chore.id} onComplete={handleCompleteChore} onClick={() => setDetailChore(chore)} />
                            ))}
                          </div>
                          {upcomingChores.length > 2 && (
                            <p className="text-xs text-muted-foreground mt-1">+{upcomingChores.length - 2} more later</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Sparkle size={24} className="mx-auto text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">All caught up!</p>
                    </div>
                  )}

                  {/* Completed Recently - inline */}
                  {recentCompletions.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        <CheckCircle size={12} className="inline mr-1 text-green-500" />
                        {recentCompletions.length} completed in last 24h
                      </p>
                      <div className="space-y-1">
                        {recentCompletions.slice(0, 3).map(({ completion, chore }) => (
                          <button
                            key={completion.id}
                            className="flex items-center justify-between w-full px-2 py-1.5 rounded text-left hover:bg-muted/50 transition-colors text-xs"
                            onClick={() => chore && setDetailChore(chore)}
                          >
                            <span className="truncate text-muted-foreground">{chore?.title || 'Chore'}</span>
                            <span className="text-muted-foreground/60 flex-shrink-0 ml-2">
                              {formatDistanceToNow(completion.completedAt, { addSuffix: true })}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onNavigate?.('chores')}
                  >
                    Manage Chores <ArrowRight size={14} className="ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Collapsible>
          </div>
        )

      case 'todays-events':
        if (todaysEvents.length === 0 && todaysMeals.length === 0) return null
        return (
          <Card key="todays-events">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
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
            <CardContent className="px-4 pb-4 space-y-2">
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

              {/* Meals (shown if today-meals widget is also enabled) */}
              {isWidgetEnabled('today-meals') && todaysMeals.length > 0 && (
                <div className="flex gap-2 mt-2 pt-2 border-t overflow-x-auto">
                  {['breakfast', 'lunch', 'dinner'].map(type => {
                    const meal = todaysMeals.find(m => m.type === type)
                    const hasRecipe = meal?.recipeId
                    return (
                      <div
                        key={type}
                        className={`flex-1 min-w-[100px] p-2.5 rounded-lg text-center transition-colors ${
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
                        <p className="text-xs uppercase font-semibold text-muted-foreground">{type}</p>
                        <p className={`text-sm truncate ${meal ? 'font-medium' : 'text-muted-foreground italic'}`}>
                          {meal?.name || '-'}
                        </p>
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
        )

      case 'today-meals':
        // Meals are rendered inside the todays-events card when both are enabled.
        // Only render standalone meals card if todays-events is disabled.
        if (isWidgetEnabled('todays-events')) return null
        if (todaysMeals.length === 0) return null
        return (
          <Card key="today-meals">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CookingPot size={18} className="text-primary" />
                Today's Meals
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-2 overflow-x-auto">
                {['breakfast', 'lunch', 'dinner'].map(type => {
                  const meal = todaysMeals.find(m => m.type === type)
                  const hasRecipe = meal?.recipeId
                  return (
                    <div
                      key={type}
                      className={`flex-1 min-w-[100px] p-2.5 rounded-lg text-center transition-colors ${
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
                      <p className="text-xs uppercase font-semibold text-muted-foreground">{type}</p>
                      <p className={`text-sm truncate ${meal ? 'font-medium' : 'text-muted-foreground italic'}`}>
                        {meal?.name || '-'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )

      case 'room-chores':
        if (roomProgress.length === 0) return null
        return (
          <Card key="room-chores">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <House size={18} className="text-primary" />
                Room Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {roomProgress.map(room => (
                <div key={room.room} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{room.room}</span>
                    <span className="text-xs text-muted-foreground">
                      {room.total - room.pending}/{room.total} done
                      {room.overdue > 0 && <span className="text-red-500 ml-1.5">{room.overdue} overdue</span>}
                    </span>
                  </div>
                  <Progress value={room.completion} />
                </div>
              ))}
            </CardContent>
          </Card>
        )

      case 'shopping-preview':
        if (!showShoppingTab || unpurchasedItems.length === 0) return null
        return (
          <Collapsible key="shopping-preview" open={showShoppingPanel} onOpenChange={setShowShoppingPanel}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="p-4 pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
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
                <CardContent className="px-4 pb-4">
                  <div className="space-y-1">
                    {unpurchasedItems.slice(0, 8).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors group"
                      >
                        <button
                          className="h-5 w-5 rounded border border-border flex items-center justify-center flex-shrink-0 hover:bg-primary/10 hover:border-primary transition-colors"
                          onClick={() => {
                            const updated = { ...item, purchased: true }
                            setShoppingItems((prev) => (prev ?? []).map(i => i.id === item.id ? updated : i))
                            toast.success('Purchased', { description: item.name })
                          }}
                          title="Mark as purchased"
                        >
                          <Check size={10} className="opacity-0 group-hover:opacity-40" />
                        </button>
                        <span className="text-sm truncate flex-1">{item.name}</span>
                        {item.quantity && item.quantity !== '1' && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">{item.quantity}</span>
                        )}
                      </div>
                    ))}
                    {unpurchasedItems.length > 8 && (
                      <p className="text-xs text-muted-foreground px-2 pt-1">+{unpurchasedItems.length - 8} more items</p>
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
        )

      case 'upcoming-events':
        if (upcomingEvents.length === 0) return null
        return (
          <Card key="upcoming-events">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
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
            <CardContent className="px-4 pb-4">
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
        )

      case 'member-stats':
        if (members.length <= 1 || selectedMember !== 'all') return null
        return (
          <Card key="member-stats">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User size={18} className="text-primary" />
                Family Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
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
        )

      default:
        return null
    }
  }, [isWidgetEnabled, pendingChores, completionRate, highPriorityChores, showShoppingTab, unpurchasedItems,
      showCalendar, todaysEvents, showMeals, todaysMeals, challenge, challengeEnabled, showAllChores,
      overdueChores, dueTodayChores, upcomingShort, upcomingChores, recentCompletions, roomProgress,
      showShoppingPanel, upcomingEvents, members, selectedMember, chores, showAllEvents,
      highlightChoreId, onNavigate, onViewRecipe])

  return (
    <div className="space-y-6 pb-20">
      {showOnboarding && <OnboardingChecklist />}

      {/* Greeting Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GreetingIcon size={18} className="text-primary" />
          <div>
            <h1 className="text-base font-semibold">{greeting.text}{currentUser?.displayName ? `, ${currentUser.displayName.split(' ')[0]}` : ''}</h1>
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

      {/* Detail Dialogs (portals - always rendered) */}
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

      {/* Dashboard Widgets - rendered in customizer order, 2-col on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {sortedWidgetIds.map(id => renderWidget(id))}
      </div>

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
      <span className="text-xs text-muted-foreground">
        {subtext || label}
      </span>
    </button>
  )
}

// Chore Item Component
interface ChoreItemProps {
  chore: Chore
  onComplete: (chore: Chore, roomOverride?: string) => void
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
  const rooms = chore.rooms?.length ? chore.rooms : (chore.room ? [chore.room] : [])
  const roomText = rooms.length > 0 ? rooms.slice(0, 3).join(', ') + (rooms.length > 3 ? ` +${rooms.length - 3}` : '') : ''
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer min-h-[44px] border-l-4 ${
      chore.priority === 'high' ? 'border-l-red-500' :
      chore.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
    } ${highlight ? 'ring-2 ring-primary' : ''}`} onClick={onClick}>
      {/* Complete Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
            title="Complete"
          >
            <Check size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {rooms.length > 1 ? (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Complete room</DropdownMenuLabel>
              {rooms.map((room) => (
                <DropdownMenuItem key={room} onClick={(e) => { e.stopPropagation(); onComplete(chore, room) }}>
                  {room}
                </DropdownMenuItem>
              ))}
            </>
          ) : (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(chore, rooms[0]); }}>
              Complete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{chore.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {friendly}{roomText ? ` · ${roomText}` : ''}
        </p>
        {chore.assignedTo && (
          <p className="text-xs text-muted-foreground truncate">Assigned: {chore.assignedTo}</p>
        )}
      </div>
      {chore.streak && chore.streak >= 2 && (
        <Badge className="text-xs px-1.5 py-0 gap-0.5 bg-orange-500 flex-shrink-0">
          <Fire size={10} />
          {chore.streak}
        </Badge>
      )}
      {chore.estimatedMinutes && (
        <span className="text-xs text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
          <Clock size={12} />
          {chore.estimatedMinutes}m
        </span>
      )}
    </div>
  )
}
