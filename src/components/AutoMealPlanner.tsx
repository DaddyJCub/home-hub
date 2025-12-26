import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Sparkle, CalendarBlank, Tag, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Recipe, Meal } from '@/lib/types'
import { toast } from 'sonner'
import { format, startOfWeek, addDays, getDay } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'

interface AutoMealPlannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DayConstraint {
  dayOfWeek: number
  requiredTag?: string
}

interface DaypartConfig {
  dayOfWeek: number
  breakfast: boolean
  lunch: boolean
  dinner: boolean
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AutoMealPlanner({ open, onOpenChange }: AutoMealPlannerProps) {
  const [recipesRaw] = useKV<Recipe[]>('recipes', [])
  const [mealsRaw, setMeals] = useKV<Meal[]>('meals', [])
  const recipes = recipesRaw ?? []
  const meals = mealsRaw ?? []
  const { currentHousehold } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [dayConstraintsRaw, setDayConstraints] = useKV<DayConstraint[]>('meal-day-constraints', [])
  const [daypartConfigsRaw, setDaypartConfigs] = useKV<DaypartConfig[]>('meal-daypart-configs', [])
  const dayConstraints = dayConstraintsRaw ?? []
  const daypartConfigs = daypartConfigsRaw ?? []
  
  const [newConstraintDay, setNewConstraintDay] = useState<string>('0')
  const [newConstraintTag, setNewConstraintTag] = useState<string>('')

  const allTags = Array.from(new Set(recipes.flatMap((r) => r.tags || []))).sort()

  const getDaypartConfig = (dayOfWeek: number): DaypartConfig => {
    const existing = daypartConfigs.find(c => c.dayOfWeek === dayOfWeek)
    return existing || { dayOfWeek, breakfast: true, lunch: true, dinner: true }
  }

  const toggleDaypart = (dayOfWeek: number, daypart: 'breakfast' | 'lunch' | 'dinner') => {
    setDaypartConfigs((current) => {
      const currentArr = current ?? []
      const existing = currentArr.find(c => c.dayOfWeek === dayOfWeek)
      if (existing) {
        return currentArr.map(c => 
          c.dayOfWeek === dayOfWeek 
            ? { ...c, [daypart]: !c[daypart] }
            : c
        )
      } else {
        return [...currentArr, { 
          dayOfWeek, 
          breakfast: daypart === 'breakfast' ? false : true,
          lunch: daypart === 'lunch' ? false : true,
          dinner: daypart === 'dinner' ? false : true
        }]
      }
    })
  }

  const addDayConstraint = () => {
    if (!newConstraintTag) {
      toast.error('Please select a tag')
      return
    }
    
    const dayOfWeek = parseInt(newConstraintDay)
    const exists = dayConstraints.some(c => c.dayOfWeek === dayOfWeek)
    
    if (exists) {
      setDayConstraints((current) => {
        const currentArr = current ?? []
        return currentArr.map(c => 
          c.dayOfWeek === dayOfWeek 
            ? { ...c, requiredTag: newConstraintTag }
            : c
        )
      })
    } else {
      setDayConstraints((current) => [
        ...(current ?? []),
        { dayOfWeek, requiredTag: newConstraintTag }
      ])
    }
    
    setNewConstraintTag('')
    toast.success(`${DAYS_OF_WEEK[dayOfWeek]} constraint added`)
  }

  const removeDayConstraint = (dayOfWeek: number) => {
    setDayConstraints((current) => (current ?? []).filter(c => c.dayOfWeek !== dayOfWeek))
    toast.success('Constraint removed')
  }

  const handleGenerateMealPlan = () => {
    if (recipes.length === 0) {
      toast.error('Add some recipes first before auto-planning')
      return
    }

    setIsGenerating(true)
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
      const weekDays = Array.from({ length: 7 }, (_, i) => ({
        date: format(addDays(weekStart, i), 'yyyy-MM-dd'),
        dayOfWeek: i
      }))

      const newMeals: Meal[] = []
      const usedRecipeCount = new Map<string, number>()

      for (const { date, dayOfWeek } of weekDays) {
        const daypartConfig = getDaypartConfig(dayOfWeek)
        const constraint = dayConstraints.find(c => c.dayOfWeek === dayOfWeek)

        const dayparts: ('breakfast' | 'lunch' | 'dinner')[] = []
        if (daypartConfig.breakfast) dayparts.push('breakfast')
        if (daypartConfig.lunch) dayparts.push('lunch')
        if (daypartConfig.dinner) dayparts.push('dinner')

        for (const daypart of dayparts) {
          let eligibleRecipes = recipes
          
          if (constraint?.requiredTag && daypart === 'dinner') {
            eligibleRecipes = recipes.filter(r => r.tags?.includes(constraint.requiredTag!))
          }
          
          if (eligibleRecipes.length === 0) {
            eligibleRecipes = recipes
          }

          eligibleRecipes = eligibleRecipes.filter(r => {
            const useCount = usedRecipeCount.get(r.id) || 0
            return useCount < 2
          })

          if (eligibleRecipes.length === 0) {
            eligibleRecipes = recipes
            usedRecipeCount.clear()
          }

          const randomRecipe = eligibleRecipes[Math.floor(Math.random() * eligibleRecipes.length)]
          
          newMeals.push({
            id: `${Date.now()}-${date}-${daypart}`,
            householdId: currentHousehold?.id || '',
            date,
            type: daypart,
            name: randomRecipe.name,
            recipeId: randomRecipe.id
          })

          usedRecipeCount.set(randomRecipe.id, (usedRecipeCount.get(randomRecipe.id) || 0) + 1)
        }
      }

      setMeals((current) => {
        const currentArr = current ?? []
        const weekDates = weekDays.map(d => d.date)
        const currentNonWeek = currentArr.filter(m => !weekDates.includes(m.date))
        return [...currentNonWeek, ...newMeals]
      })

      toast.success(`Generated ${newMeals.length} meals for the week!`)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to generate meal plan:', error)
      toast.error('Failed to generate meal plan. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle />
            Auto-Generate Meal Plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Day-Specific Constraints</Label>
            <p className="text-sm text-muted-foreground">
              Require specific tags for dinner on certain days (e.g., Wednesdays = crockpot)
            </p>
            
            <div className="flex gap-2">
              <Select value={newConstraintDay} onValueChange={setNewConstraintDay}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={newConstraintTag} onValueChange={setNewConstraintTag}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select required tag" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={addDayConstraint} size="sm">
                <Tag />
              </Button>
            </div>

            {dayConstraints.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {dayConstraints.map((constraint) => (
                  <Badge key={constraint.dayOfWeek} variant="secondary" className="gap-1 pr-1">
                    {DAYS_OF_WEEK[constraint.dayOfWeek]}: {constraint.requiredTag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeDayConstraint(constraint.dayOfWeek)}
                    >
                      <X size={12} />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Daypart Availability</Label>
            <p className="text-sm text-muted-foreground">
              Configure which meals to plan for each day
            </p>
            
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day, dayOfWeek) => {
                const config = getDaypartConfig(dayOfWeek)
                return (
                  <div key={dayOfWeek} className="flex items-center gap-4 py-2 border-b">
                    <div className="w-24 font-medium text-sm">{day}</div>
                    <div className="flex gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${dayOfWeek}-breakfast`}
                          checked={config.breakfast}
                          onCheckedChange={() => toggleDaypart(dayOfWeek, 'breakfast')}
                        />
                        <Label htmlFor={`${dayOfWeek}-breakfast`} className="cursor-pointer text-sm">
                          Breakfast
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${dayOfWeek}-lunch`}
                          checked={config.lunch}
                          onCheckedChange={() => toggleDaypart(dayOfWeek, 'lunch')}
                        />
                        <Label htmlFor={`${dayOfWeek}-lunch`} className="cursor-pointer text-sm">
                          Lunch
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${dayOfWeek}-dinner`}
                          checked={config.dinner}
                          onCheckedChange={() => toggleDaypart(dayOfWeek, 'dinner')}
                        />
                        <Label htmlFor={`${dayOfWeek}-dinner`} className="cursor-pointer text-sm">
                          Dinner
                        </Label>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarBlank size={16} />
              What will happen:
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>• Randomly select from your {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</li>
              <li>• Respect day-specific tag constraints</li>
              <li>• Only plan meals for enabled dayparts</li>
              <li>• Limit recipes to 2 uses per week for variety</li>
              <li>• Replace any existing meals for this week</li>
            </ul>
          </div>

          <Button 
            onClick={handleGenerateMealPlan} 
            disabled={isGenerating}
            className="w-full gap-2"
          >
            <Sparkle />
            {isGenerating ? 'Generating...' : 'Generate Weekly Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
