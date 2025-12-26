import { useKV } from '@github/spark/hooks'
import { CalendarBlank, CheckCircle, ShoppingCart, CookingPot, Broom, TrendUp, Sparkle, MapPin, Clock, User, ArrowRight } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Chore, ShoppingItem, Meal, Recipe, CalendarEvent, HouseholdMember } from '@/lib/types'
import { format, startOfWeek, addDays, isToday, isAfter, isSameDay, startOfDay } from 'date-fns'
import { useState } from 'react'
import DashboardCustomizer, { type DashboardWidget } from '@/components/DashboardCustomizer'
import WeeklyChoreSchedule from '@/components/WeeklyChoreSchedule'
import { NotificationSummary } from '@/components/NotificationSummary'
import { useAuth } from '@/lib/AuthContext'

interface DashboardSectionProps {
  onNavigate?: (tab: string) => void
}

export default function DashboardSection({ onNavigate }: DashboardSectionProps) {
  const { householdMembers, currentHousehold } = useAuth()
  const [choresRaw] = useKV<Chore[]>('chores', [])
  const [shoppingItemsRaw] = useKV<ShoppingItem[]>('shopping-items', [])
  const [mealsRaw] = useKV<Meal[]>('meals', [])
  const [recipesRaw] = useKV<Recipe[]>('recipes', [])
  const [eventsRaw] = useKV<CalendarEvent[]>('calendar-events', [])
  const [dashboardWidgetsRaw] = useKV<DashboardWidget[]>('dashboard-widgets', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  // Filter all data by current household
  const allChores = choresRaw ?? []
  const allShoppingItems = shoppingItemsRaw ?? []
  const allMeals = mealsRaw ?? []
  const allRecipes = recipesRaw ?? []
  const allEvents = eventsRaw ?? []
  const chores = currentHousehold ? allChores.filter(c => c.householdId === currentHousehold.id) : []
  const shoppingItems = currentHousehold ? allShoppingItems.filter(i => i.householdId === currentHousehold.id) : []
  const meals = currentHousehold ? allMeals.filter(m => m.householdId === currentHousehold.id) : []
  const recipes = currentHousehold ? allRecipes.filter(r => r.householdId === currentHousehold.id) : []
  const events = currentHousehold ? allEvents.filter(e => e.householdId === currentHousehold.id) : []
  const members = householdMembers ?? []
  const dashboardWidgets = dashboardWidgetsRaw ?? []

  const filteredChores = selectedMember === 'all' 
    ? chores 
    : chores.filter(c => c.assignedTo === selectedMember)
  
  const filteredEvents = selectedMember === 'all'
    ? events
    : events.filter(e => e.bookedBy === selectedMember || e.attendees?.includes(selectedMember))

  const pendingChores = filteredChores.filter((c) => !c.completed)
  const unpurchasedItems = shoppingItems.filter((i) => !i.purchased)
  
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todaysMeals = meals.filter((m) => m.date === todayStr)

  const getRecipeName = (recipeId?: string) => {
    if (!recipeId) return null
    const recipe = recipes.find((r) => r.id === recipeId)
    return recipe?.name
  }

  const getMealsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.filter((meal) => meal.date === dateStr)
  }

  const getRoomChores = () => {
    const roomMap: Record<string, Chore[]> = {}
    pendingChores.forEach((chore) => {
      const room = chore.room || 'Unassigned'
      if (!roomMap[room]) {
        roomMap[room] = []
      }
      roomMap[room].push(chore)
    })
    return roomMap
  }

  const roomChores = getRoomChores()
  const totalEstimatedTime = pendingChores.reduce((acc, chore) => 
    acc + (chore.estimatedMinutes || 0), 0
  )

  const todaysEvents = filteredEvents.filter((evt) => evt.date === todayStr)
  const upcomingEvents = filteredEvents
    .filter((evt) => {
      const eventDate = new Date(evt.date)
      const today = startOfDay(new Date())
      return isAfter(eventDate, today) || isSameDay(eventDate, today)
    })
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime)
      }
      return 0
    })
    .slice(0, 5)

  const categoryColors: Record<string, string> = {
    personal: 'bg-blue-500/20 text-blue-700 border-blue-300',
    work: 'bg-purple-500/20 text-purple-700 border-purple-300',
    appointment: 'bg-green-500/20 text-green-700 border-green-300',
    booking: 'bg-orange-500/20 text-orange-700 border-orange-300',
    other: 'bg-gray-500/20 text-gray-700 border-gray-300'
  }

  const getMemberStats = (memberName: string) => {
    const memberChores = chores.filter(c => c.assignedTo === memberName)
    const pendingChores = memberChores.filter(c => !c.completed)
    const completedChores = memberChores.filter(c => c.completed)
    const memberEvents = events.filter(e => 
      e.attendees?.includes(memberName) || e.bookedBy === memberName
    )
    
    const completionRate = memberChores.length > 0 
      ? Math.round((completedChores.length / memberChores.length) * 100)
      : 0

    return {
      totalChores: memberChores.length,
      pendingChores: pendingChores.length,
      completedChores: completedChores.length,
      completionRate,
      upcomingEvents: memberEvents.length,
      estimatedTime: pendingChores.reduce((acc, chore) => 
        acc + (chore.estimatedMinutes || 0), 0
      )
    }
  }

  const isWidgetEnabled = (widgetId: string) => {
    if (!dashboardWidgets || dashboardWidgets.length === 0) return true
    const widget = dashboardWidgets.find((w) => w.id === widgetId)
    return widget ? widget.enabled : true
  }

  const sortedWidgets = dashboardWidgets && dashboardWidgets.length > 0
    ? [...dashboardWidgets].sort((a, b) => (a.order || 0) - (b.order || 0))
    : []

  const renderWidget = (widgetId: string) => {
    if (!isWidgetEnabled(widgetId)) return null

    switch (widgetId) {
      case 'stats':
        return (
          <div key="stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => onNavigate?.('chores')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Chores</CardTitle>
                <Broom className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{pendingChores.length}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>
                    {chores.length > 0
                      ? `${Math.round((chores.length - pendingChores.length) / chores.length * 100)}% complete`
                      : 'No chores yet'}
                  </span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => onNavigate?.('shopping')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Shopping List</CardTitle>
                <ShoppingCart className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{unpurchasedItems.length}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>
                    {shoppingItems.length > 0
                      ? `${shoppingItems.length - unpurchasedItems.length} purchased`
                      : 'List is empty'}
                  </span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => onNavigate?.('recipes')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recipes</CardTitle>
                <CookingPot className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{recipes.length}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>In your collection</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => onNavigate?.('meals')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Meals Planned</CardTitle>
                <CalendarBlank className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{meals.length}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>This week</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => onNavigate?.('calendar')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <CalendarBlank className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{upcomingEvents.length}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>{todaysEvents.length > 0 ? `${todaysEvents.length} today` : 'Next few days'}</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </CardContent>
            </Card>
          </div>
        )

      case 'time-estimate':
        return totalEstimatedTime > 0 ? (
          <Card 
            key="time-estimate" 
            className="bg-accent/10 border-accent cursor-pointer hover:shadow-md transition-all"
            onClick={() => onNavigate?.('chores')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Clock size={28} className="text-accent" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">Estimated Time for Pending Chores</div>
                  <div className="text-3xl font-bold text-accent mt-1">
                    {Math.floor(totalEstimatedTime / 60)}h {totalEstimatedTime % 60}m
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">{pendingChores.length} tasks</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ~{Math.round(totalEstimatedTime / pendingChores.length)} min avg
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null

      case 'weekly-chore-schedule':
        return <WeeklyChoreSchedule key="weekly-chore-schedule" />

      case 'room-chores':
        return Object.keys(roomChores).length > 0 ? (
          <Card key="room-chores">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={24} />
                Chores by Room
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(roomChores)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([room, chores]) => {
                    const totalTime = chores.reduce((acc, c) => acc + (c.estimatedMinutes || 0), 0)
                    const priorityCount = {
                      high: chores.filter(c => c.priority === 'high').length,
                      medium: chores.filter(c => c.priority === 'medium').length,
                      low: chores.filter(c => c.priority === 'low').length,
                    }

                    return (
                      <Card key={room} className="border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <MapPin size={18} className="text-primary" />
                              {room}
                            </span>
                            <Badge variant="secondary">{chores.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {totalTime > 0 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock size={14} />
                              ~{totalTime} min total
                            </div>
                          )}
                          <div className="flex gap-2">
                            {priorityCount.high > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {priorityCount.high} high
                              </Badge>
                            )}
                            {priorityCount.medium > 0 && (
                              <Badge variant="default" className="text-xs">
                                {priorityCount.medium} med
                              </Badge>
                            )}
                            {priorityCount.low > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {priorityCount.low} low
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2 pt-2 border-t">
                            {chores.slice(0, 3).map((chore) => (
                              <div key={chore.id} className="text-sm flex items-start gap-2">
                                <CheckCircle size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                                <span className="flex-1 leading-tight">{chore.title}</span>
                              </div>
                            ))}
                            {chores.length > 3 && (
                              <p className="text-xs text-muted-foreground italic">
                                +{chores.length - 3} more...
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        ) : null

      case 'member-stats':
        return members.length > 0 && selectedMember === 'all' ? (
          <Card key="member-stats">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={24} className="text-primary" />
                Household Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => {
                  const stats = getMemberStats(member.displayName)
                  return (
                    <div key={member.id} className="p-4 rounded-lg border-2 bg-gradient-to-br from-card to-secondary/20 space-y-3 hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                            <User size={24} className="text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-lg">{member.displayName}</div>
                            <div className="text-sm text-muted-foreground">
                              {stats.pendingChores} pending tasks
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">{stats.completionRate}%</div>
                          <div className="text-xs text-muted-foreground">completion</div>
                        </div>
                      </div>
                      
                      {stats.totalChores > 0 && (
                        <div className="space-y-2">
                          <Progress value={stats.completionRate} className="h-2.5" />
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{stats.completedChores} of {stats.totalChores} chores done</span>
                            {stats.estimatedTime > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                ~{stats.estimatedTime} min
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-3 rounded-md bg-primary/10 border border-primary/20">
                          <div className="text-xl font-bold text-primary">{stats.totalChores}</div>
                          <div className="text-xs text-muted-foreground">Total Chores</div>
                        </div>
                        <div className="text-center p-3 rounded-md bg-secondary/50 border border-secondary">
                          <div className="text-xl font-bold text-foreground">{stats.upcomingEvents}</div>
                          <div className="text-xs text-muted-foreground">Events</div>
                        </div>
                        <div className="text-center p-3 rounded-md bg-accent/10 border border-accent/20">
                          <div className="text-xl font-bold text-accent">{stats.pendingChores}</div>
                          <div className="text-xs text-muted-foreground">Pending</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ) : null

      case 'todays-events':
        return todaysEvents.length > 0 ? (
          <Card key="todays-events">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarBlank size={24} />
                Today's Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border bg-secondary/30 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{event.title}</div>
                        {event.startTime && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock size={14} />
                            {event.startTime}
                            {event.endTime && ` - ${event.endTime}`}
                          </div>
                        )}
                      </div>
                      <Badge className={categoryColors[event.category]}>
                        {event.category}
                      </Badge>
                    </div>
                    {event.location && (
                      <div className="text-sm flex items-center gap-2 text-muted-foreground">
                        <MapPin size={14} />
                        {event.location}
                      </div>
                    )}
                    {event.bookedBy && (
                      <div className="text-xs text-muted-foreground">
                        Booked by: {event.bookedBy}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null

      default:
        return null
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-2 md:gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl md:text-3xl font-bold truncate">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {selectedMember === 'all' 
              ? 'Your household at a glance' 
              : `${selectedMember}'s view`}
          </p>
        </div>
        <DashboardCustomizer />
      </div>

      <NotificationSummary />

      {sortedWidgets.length > 0 ? (
        sortedWidgets.map((widget) => renderWidget(widget.id))
      ) : (
        <>
          {renderWidget('stats')}
          {renderWidget('time-estimate')}
          {renderWidget('weekly-chore-schedule')}
          {renderWidget('room-chores')}
          {renderWidget('member-stats')}
          {renderWidget('todays-events')}
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isWidgetEnabled('today-meals') && (
          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => onNavigate?.('meals')}
          >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <CookingPot size={24} />
                Today's Meals
              </span>
              <ArrowRight size={16} className="text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysMeals.length > 0 ? (
              <div className="space-y-3">
                {['breakfast', 'lunch', 'dinner'].map((type) => {
                  const typedMealType = type as 'breakfast' | 'lunch' | 'dinner'
                  const meal = todaysMeals.find((m) => m.type === typedMealType)
                  
                  return (
                    <div key={type} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          {type}
                        </div>
                        {meal ? (
                          <>
                            <div className="font-medium">{meal.name}</div>
                            {meal.recipeId && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <CookingPot size={12} className="mr-1" />
                                {getRecipeName(meal.recipeId)}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">Not planned</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CookingPot size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No meals planned for today</p>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {isWidgetEnabled('priorities') && (
          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => onNavigate?.('chores')}
          >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle size={24} />
                Top Priorities
              </span>
              <ArrowRight size={16} className="text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingChores.length > 0 ? (
                <>
                  <div className="text-sm font-semibold text-muted-foreground">Pending Chores</div>
                  {pendingChores.slice(0, 5).map((chore) => (
                    <div key={chore.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30">
                      <CheckCircle size={16} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1">{chore.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {chore.assignedTo}
                      </Badge>
                    </div>
                  ))}
                  {pendingChores.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{pendingChores.length - 5} more chores
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">All chores completed!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {isWidgetEnabled('upcoming-events') && (
          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => onNavigate?.('calendar')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <CalendarBlank size={24} />
                  Upcoming Events
                </span>
                <ArrowRight size={16} className="text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border bg-secondary/30 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{event.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(event.date), 'MMM d')}
                            {event.startTime && ` at ${event.startTime}`}
                          </div>
                        </div>
                        <Badge className={`text-xs ${categoryColors[event.category]}`}>
                          {event.category}
                        </Badge>
                      </div>
                      {event.location && (
                        <div className="text-xs flex items-center gap-1 text-muted-foreground">
                          <MapPin size={12} />
                          {event.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarBlank size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {isWidgetEnabled('weekly-calendar') && (
        <Card 
          className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
          onClick={() => onNavigate?.('meals')}
        >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <CalendarBlank size={24} />
              Weekly Meal Calendar
            </span>
            <ArrowRight size={16} className="text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            {next7Days.map((day) => {
              const dayMeals = getMealsForDay(day)
              const isDayToday = isToday(day)

              return (
                <div
                  key={day.toString()}
                  className={`p-3 rounded-lg border-2 ${
                    isDayToday ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-lg font-bold ${isDayToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayMeals.length > 0 ? (
                      dayMeals.slice(0, 3).map((meal) => (
                        <div
                          key={meal.id}
                          className="text-xs bg-secondary/50 rounded px-1.5 py-1 truncate"
                        >
                          {meal.name}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground text-center italic">-</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {isWidgetEnabled('shopping-preview') && unpurchasedItems.length > 0 && (
        <Card 
          className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
          onClick={() => onNavigate?.('shopping')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart size={24} />
                Shopping List Preview
              </span>
              <ArrowRight size={16} className="text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {unpurchasedItems.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30">
                  <span className="text-sm flex-1 truncate">{item.name}</span>
                  {item.quantity && (
                    <Badge variant="outline" className="text-xs">
                      {item.quantity}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {unpurchasedItems.length > 8 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                +{unpurchasedItems.length - 8} more items
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
