import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Trash, CalendarBlank, CookingPot } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Meal, Recipe } from '@/lib/types'
import { toast } from 'sonner'
import { format, startOfWeek, addDays } from 'date-fns'

export default function MealsSection() {
  const [meals = [], setMeals] = useKV<Meal[]>('meals', [])
  const [recipes = []] = useKV<Recipe[]>('recipes', [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [mealForm, setMealForm] = useState({
    name: '',
    type: 'dinner' as 'breakfast' | 'lunch' | 'dinner',
    recipeId: ''
  })

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const openAddMealDialog = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'))
    setDialogOpen(true)
  }

  const handleAddMeal = () => {
    if (!mealForm.name.trim()) {
      toast.error('Please enter a meal name')
      return
    }

    const newMeal: Meal = {
      id: Date.now().toString(),
      date: selectedDate,
      type: mealForm.type,
      name: mealForm.name.trim(),
      recipeId: mealForm.recipeId || undefined
    }

    setMeals((current = []) => [...current, newMeal])
    setDialogOpen(false)
    setMealForm({ name: '', type: 'dinner', recipeId: '' })
    toast.success('Meal added to plan')
  }

  const handleDeleteMeal = (id: string) => {
    setMeals((current = []) => current.filter((meal) => meal.id !== id))
    toast.success('Meal removed')
  }

  const getMealsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.filter((meal) => meal.date === dateStr)
  }

  const getMealsByType = (dayMeals: Meal[], type: 'breakfast' | 'lunch' | 'dinner') => {
    return dayMeals.filter((meal) => meal.type === type)
  }

  const getRecipeName = (recipeId?: string) => {
    if (!recipeId) return null
    const recipe = recipes.find((r) => r.id === recipeId)
    return recipe?.name
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Meal Planning</h2>
          <p className="text-sm text-muted-foreground">
            Week of {format(weekStart, 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayMeals = getMealsForDay(day)
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

          return (
            <Card
              key={day.toString()}
              className={`p-4 ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{format(day, 'EEE')}</div>
                    <div className="text-2xl font-bold text-primary">
                      {format(day, 'd')}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAddMealDialog(day)}
                  >
                    <Plus size={16} />
                  </Button>
                </div>

                <div className="space-y-2">
                  {['breakfast', 'lunch', 'dinner'].map((type) => {
                    const typedMealType = type as 'breakfast' | 'lunch' | 'dinner'
                    const typeMeals = getMealsByType(dayMeals, typedMealType)

                    return (
                      <div key={type} className="space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">
                          {type}
                        </div>
                        {typeMeals.length > 0 ? (
                          typeMeals.map((meal) => (
                            <div
                              key={meal.id}
                              className="bg-secondary/50 rounded-md p-2 group relative"
                            >
                              <div className="text-sm font-medium pr-6">
                                {meal.name}
                              </div>
                              {meal.recipeId && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  <CookingPot size={12} className="mr-1" />
                                  {getRecipeName(meal.recipeId)}
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => handleDeleteMeal(meal.id)}
                              >
                                <Trash size={12} />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground italic">-</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="meal-type">Meal Type</Label>
              <Select
                value={mealForm.type}
                onValueChange={(value) =>
                  setMealForm({ ...mealForm, type: value as any })
                }
              >
                <SelectTrigger id="meal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-name">Meal Name</Label>
              <Input
                id="meal-name"
                value={mealForm.name}
                onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                placeholder="e.g., Spaghetti Bolognese"
              />
            </div>
            {recipes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="recipe">Link to Recipe (Optional)</Label>
                <Select
                  value={mealForm.recipeId}
                  onValueChange={(value) =>
                    setMealForm({ ...mealForm, recipeId: value })
                  }
                >
                  <SelectTrigger id="recipe">
                    <SelectValue placeholder="Select a recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No recipe</SelectItem>
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleAddMeal} className="w-full">
              Add Meal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {meals.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarBlank size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No meals planned yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click the + button on any day to add a meal
          </p>
        </Card>
      )}
    </div>
  )
}
