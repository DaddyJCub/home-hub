import { useKV } from '@github/spark/hooks'
import { 
  CalendarBlank, CheckCircle, ShoppingCart, CookingPot, Broom, 
  Clock, User, ArrowRight, CaretDown, CaretUp, House, Sparkle,
  Sun, Moon, CloudSun, MapPin, Bell, Warning
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Chore, ShoppingItem, Meal, Recipe, CalendarEvent } from '@/lib/types'
import { format, isToday, isAfter, isSameDay, startOfDay, addDays, parseISO, isTomorrow } from 'date-fns'
import { useState, useMemo } from 'react'
import { NotificationSummary } from '@/components/NotificationSummary'
import { useAuth } from '@/lib/AuthContext'

interface DashboardSectionProps {
  onNavigate?: (tab: string) => void
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

export default function DashboardSection({ onNavigate }: DashboardSectionProps) {
  const { householdMembers, currentHousehold, currentUser } = useAuth()
  const [choresRaw] = useKV<Chore[]>('chores', [])
  const [shoppingItemsRaw] = useKV<ShoppingItem[]>('shopping-items', [])
  const [mealsRaw] = useKV<Meal[]>('meals', [])
  const [recipesRaw] = useKV<Recipe[]>('recipes', [])
  const [eventsRaw] = useKV<CalendarEvent[]>('calendar-events', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')

  // Collapsible states
  const [showAllChores, setShowAllChores] = useState(false)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [showShopping, setShowShopping] = useState(true)

  // Filter all data by current household
  const chores = useMemo(() => {
    const all = choresRaw ?? []
    return currentHousehold ? all.filter(c => c.householdId === currentHousehold.id) : []
  }, [choresRaw, currentHousehold])

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

  // Filtered data based on selected member
  const filteredChores = selectedMember === 'all' 
    ? chores 
    : chores.filter(c => c.assignedTo === selectedMember)

  const filteredEvents = selectedMember === 'all'
    ? events
    : events.filter(e => e.bookedBy === selectedMember || e.attendees?.includes(selectedMember))

  // Computed values
  const pendingChores = filteredChores.filter(c => !c.completed)
  const highPriorityChores = pendingChores.filter(c => c.priority === 'high')
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

  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  return (
    <div className="space-y-4 pb-20">
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
        <QuickStatPill
          icon={ShoppingCart}
          label="Shopping"
          value={unpurchasedItems.length}
          subtext="items"
          onClick={() => onNavigate?.('shopping')}
        />
        <QuickStatPill
          icon={CalendarBlank}
          label="Today"
          value={todaysEvents.length}
          subtext="events"
          highlight={todaysEvents.length > 0}
          onClick={() => onNavigate?.('calendar')}
        />
        <QuickStatPill
          icon={CookingPot}
          label="Meals"
          value={todaysMeals.length}
          subtext="planned"
          onClick={() => onNavigate?.('meals')}
        />
      </div>

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
                onClick={() => onNavigate?.('calendar')}
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
                  return (
                    <div 
                      key={type}
                      className={`flex-1 min-w-[100px] p-2 rounded-lg text-center ${
                        meal ? 'bg-primary/10' : 'bg-muted/30'
                      }`}
                    >
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{type}</p>
                      <p className={`text-xs truncate ${meal ? 'font-medium' : 'text-muted-foreground italic'}`}>
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
          <CardContent className="px-4 pb-3">
            {pendingChores.length > 0 ? (
              <div className="space-y-2">
                {pendingChores.slice(0, 3).map(chore => (
                  <ChoreItem key={chore.id} chore={chore} />
                ))}
                <CollapsibleContent className="space-y-2">
                  {pendingChores.slice(3).map(chore => (
                    <ChoreItem key={chore.id} chore={chore} />
                  ))}
                </CollapsibleContent>
              </div>
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

      {/* Shopping List - Compact */}
      {unpurchasedItems.length > 0 && (
        <Collapsible open={showShopping} onOpenChange={setShowShopping}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 pt-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart size={18} className="text-primary" />
                    Shopping List
                    <Badge variant="secondary" className="ml-1">{unpurchasedItems.length}</Badge>
                  </span>
                  {showShopping ? <CaretUp size={16} /> : <CaretDown size={16} />}
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
                      className="text-xs py-1"
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
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
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
function ChoreItem({ chore }: { chore: Chore }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        chore.priority === 'high' ? 'bg-red-500' :
        chore.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
      }`} />
      <span className="text-sm flex-1 truncate">{chore.title}</span>
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
