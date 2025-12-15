import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Sparkle, CalendarBlank } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { Recipe, Meal } from '@/lib/types'
import { toast } from 'sonner'
import { format, startOfWeek, addDays } from 'date-fns'

interface AutoMealPlannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AutoMealPlanner({ open, onOpenChange }: AutoMealPlannerProps) {
  const [recipes = []] = useKV<Recipe[]>('recipes', [])
  const [meals, setMeals] = useKV<Meal[]>('meals', [])
  const [isGenerating, setIsGenerating] = useState(false)
  const [preferences, setPreferences] = useState({
    includeTags: [] as string[],
    mealTypes: ['breakfast', 'lunch', 'dinner'] as ('breakfast' | 'lunch' | 'dinner')[]
  })

  const allTags = Array.from(new Set(recipes.flatMap((r) => r.tags || []))).sort()

  const handleGenerateMealPlan = async () => {
    if (recipes.length === 0) {
      toast.error('Add some recipes first before auto-planning')
      return
    }

    setIsGenerating(true)
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
      const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))

      const filteredRecipes = preferences.includeTags.length > 0
        ? recipes.filter(r => r.tags?.some(t => preferences.includeTags.includes(t)))
        : recipes

      if (filteredRecipes.length === 0) {
        toast.error('No recipes match your tag preferences')
        setIsGenerating(false)
        return
      }

      const recipeList = filteredRecipes.map(r => ({
        id: r.id,
        name: r.name,
        tags: r.tags || []
      }))

      const recipesJson = JSON.stringify(recipeList, null, 2)
      const mealTypesStr = preferences.mealTypes.join(', ')
      const weekDaysStr = weekDays.join(', ')

      const prompt = window.spark.llmPrompt(
        [
          'You are a meal planning assistant. Generate a balanced weekly meal plan using the provided recipes.\n\nAvailable recipes:\n',
          '\n\nMeal types to include: ',
          '\nWeek dates: ',
          '\n\nPlease create a balanced meal plan that:\n- Uses variety (don\'t repeat the same recipe too often)\n- Considers tags for appropriate meal times (e.g., "breakfast" tagged recipes for breakfast)\n- Balances different types of meals throughout the week\n- Uses each recipe at most 2 times in the week\n\nReturn a JSON object with a single property "meals" containing an array of meal objects with this exact structure:\n{\n  "meals": [\n    {\n      "date": "YYYY-MM-DD",\n      "type": "breakfast" | "lunch" | "dinner",\n      "recipeId": "recipe-id-from-list",\n      "name": "Recipe name"\n    }\n  ]\n}\n\nGenerate meals for all 7 days, for each meal type in the list: ',
          '.'
        ],
        recipesJson,
        mealTypesStr,
        weekDaysStr,
        mealTypesStr
      )

      const response = await window.spark.llm(prompt, 'gpt-4o', true)
      const parsed = JSON.parse(response)

      if (!parsed.meals || !Array.isArray(parsed.meals)) {
        throw new Error('Invalid response format')
      }

      const newMeals: Meal[] = parsed.meals.map((m: any, idx: number) => ({
        id: `${Date.now()}-${idx}`,
        date: m.date,
        type: m.type,
        name: m.name,
        recipeId: m.recipeId
      }))

      setMeals((current = []) => {
        const currentNonWeek = current.filter(m => !weekDays.includes(m.date))
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

  const toggleTag = (tag: string) => {
    setPreferences((prev) => ({
      ...prev,
      includeTags: prev.includeTags.includes(tag)
        ? prev.includeTags.filter((t) => t !== tag)
        : [...prev.includeTags, tag]
    }))
  }

  const toggleMealType = (type: 'breakfast' | 'lunch' | 'dinner') => {
    setPreferences((prev) => ({
      ...prev,
      mealTypes: prev.mealTypes.includes(type)
        ? prev.mealTypes.filter((t) => t !== type)
        : [...prev.mealTypes, type]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle />
            Auto-Generate Meal Plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="space-y-3">
            <Label>Meal Types</Label>
            <div className="space-y-2">
              {(['breakfast', 'lunch', 'dinner'] as const).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`meal-type-${type}`}
                    checked={preferences.mealTypes.includes(type)}
                    onCheckedChange={() => toggleMealType(type)}
                  />
                  <Label htmlFor={`meal-type-${type}`} className="capitalize cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="space-y-3">
              <Label>Recipe Tags (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select tags to focus on specific recipe types
              </p>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={preferences.includeTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarBlank size={16} />
              What will happen:
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>• AI will analyze your {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</li>
              <li>• Create a balanced weekly plan</li>
              <li>• Replace any existing meals for this week</li>
              <li>• You can edit the plan afterwards</li>
            </ul>
          </div>

          <Button 
            onClick={handleGenerateMealPlan} 
            disabled={isGenerating || preferences.mealTypes.length === 0}
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
