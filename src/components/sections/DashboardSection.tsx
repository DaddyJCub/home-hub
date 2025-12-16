import { useKV } from '@github/spark/hooks'
import { CalendarBlank, CheckCircle, ShoppingCart, CookingPot, Broom, TrendUp, Sparkle, MapPin, Clock, User } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Chore, ShoppingItem, Meal, Recipe, CalendarEvent, HouseholdMember } from '@/lib/types'
import { format, startOfWeek, addDays, isToday, isAfter, isSameDay, startOfDay } from 'date-fns'
import { useState } from 'react'

interface DashboardWidget {
  id: string
  label: string
  enabled: boolean
}

export default function DashboardSection() {
  const [chores = []] = useKV<Chore[]>('chores', [])
  const [shoppingItems = []] = useKV<ShoppingItem[]>('shopping-items', [])
  const [meals = []] = useKV<Meal[]>('meals', [])
  const [recipes = []] = useKV<Recipe[]>('recipes', [])
  const [events = []] = useKV<CalendarEvent[]>('calendar-events', [])
  const [members = []] = useKV<HouseholdMember[]>('household-members', [])
  const [dashboardWidgets = []] = useKV<DashboardWidget[]>('dashboard-widgets', [])
  const [selectedMember = 'all'] = useKV<string>('selected-member-filter', 'all')

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

  const isWidgetEnabled = (widgetId: string) => {
    if (dashboardWidgets.length === 0) return true
    const widget = dashboardWidgets.find((w) => w.id === widgetId)
    return widget ? widget.enabled : true
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          {selectedMember === 'all' 
            ? 'Your household at a glance' 
            : `${selectedMember}'s view`}
        </p>
      </div>

      {isWidgetEnabled('stats') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Chores</CardTitle>
            <Broom className="text-muted-foreground" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{pendingChores.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {chores.length > 0
                ? `${Math.round((chores.length - pendingChores.length) / chores.length * 100)}% complete`
                : 'No chores yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Shopping List</CardTitle>
            <ShoppingCart className="text-muted-foreground" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{unpurchasedItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {shoppingItems.length > 0
                ? `${shoppingItems.length - unpurchasedItems.length} purchased`
                : 'List is empty'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recipes</CardTitle>
            <CookingPot className="text-muted-foreground" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{recipes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In your collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meals Planned</CardTitle>
            <CalendarBlank className="text-muted-foreground" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{meals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <CalendarBlank className="text-muted-foreground" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{upcomingEvents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {todaysEvents.length > 0 ? `${todaysEvents.length} today` : 'Next few days'}
            </p>
          </CardContent>
        </Card>
      </div>
      )}

      {members.length > 0 && selectedMember === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={24} />
              Household Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => {
                const stats = getMemberStats(member.name)
                return (
                  <div key={member.id} className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User size={20} className="text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {stats.pendingChores} pending tasks
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{stats.completionRate}%</div>
                        <div className="text-xs text-muted-foreground">completion</div>
                      </div>
                    </div>
                    
                    {stats.totalChores > 0 && (
                      <div className="space-y-2">
                        <Progress value={stats.completionRate} className="h-2" />
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
                      <div className="text-center p-2 rounded-md bg-secondary/30">
                        <div className="text-lg font-bold text-primary">{stats.totalChores}</div>
                        <div className="text-xs text-muted-foreground">Total Chores</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-secondary/30">
                        <div className="text-lg font-bold text-primary">{stats.upcomingEvents}</div>
                        <div className="text-xs text-muted-foreground">Events</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-secondary/30">
                        <div className="text-lg font-bold text-primary">{stats.pendingChores}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isWidgetEnabled('todays-events') && todaysEvents.length > 0 && (
        <Card>
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isWidgetEnabled('today-meals') && (
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CookingPot size={24} />
              Today's Meals
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
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={24} />
              Top Priorities
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
                  <p className="text-sm">All chores completed! 🎉</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {isWidgetEnabled('upcoming-events') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarBlank size={24} />
                Upcoming Events
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
                            {event.startTime && ` • ${event.startTime}`}
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
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarBlank size={24} />
            Weekly Meal Calendar
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart size={24} />
              Shopping List Preview
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
