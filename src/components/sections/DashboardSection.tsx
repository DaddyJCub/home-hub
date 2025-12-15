import { useKV } from '@github/spark/hooks'
import { CalendarBlank, CheckCircle, ShoppingCart, CookingPot, Broom, TrendUp, Sparkle } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Chore, ShoppingItem, Meal, Recipe } from '@/lib/types'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
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
  const [dashboardWidgets = []] = useKV<DashboardWidget[]>('dashboard-widgets', [])

  const pendingChores = chores.filter((c) => !c.completed)
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Your household at a glance</p>
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
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isWidgetEnabled('today-meals') && (
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarBlank size={24} />
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
                <CalendarBlank size={48} className="mx-auto mb-3 opacity-50" />
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
