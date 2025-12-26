import { useState, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Trash, CalendarBlank, CookingPot, Sparkle, MagnifyingGlass, Check, Note, ShoppingCart, CaretLeft, CaretRight, Clock, Users, Star, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import AutoMealPlanner from '@/components/AutoMealPlanner'
import type { Meal, Recipe, ShoppingItem, RecipeCategory } from '@/lib/types'
import { toast } from 'sonner'
import { format, startOfWeek, addDays, addWeeks, isToday, parseISO } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const RECIPE_CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'side', label: 'Side Dish' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Drink' },
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'soup', label: 'Soup' },
  { value: 'salad', label: 'Salad' },
  { value: 'other', label: 'Other' },
]

export default function MealsSection() {
  const [mealsRaw, setMeals] = useKV<Meal[]>('meals', [])
  const [recipesRaw, setRecipes] = useKV<Recipe[]>('recipes', [])
  const [shoppingItemsRaw, setShoppingItems] = useKV<ShoppingItem[]>('shopping-items', [])
  const { currentHousehold } = useAuth()
  
  // Filter data by current household
  const allMeals = mealsRaw ?? []
  const allRecipes = recipesRaw ?? []
  const meals = currentHousehold ? allMeals.filter(m => m.householdId === currentHousehold.id) : []
  const recipes = currentHousehold ? allRecipes.filter(r => r.householdId === currentHousehold.id) : []
  
  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [autoPlannerOpen, setAutoPlannerOpen] = useState(false)
  const [viewRecipeOpen, setViewRecipeOpen] = useState(false)
  const [selectedViewRecipe, setSelectedViewRecipe] = useState<Recipe | null>(null)
  const [quickRecipeOpen, setQuickRecipeOpen] = useState(false)
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [addMode, setAddMode] = useState<'recipe' | 'note'>('recipe')
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeSearchOpen, setRecipeSearchOpen] = useState(false)
  const [mealForm, setMealForm] = useState({
    name: '',
    type: 'dinner' as typeof MEAL_TYPES[number],
    recipeId: '',
    servings: 4,
    notes: '',
    isNote: false
  })
  
  // Quick recipe form
  const [quickRecipeForm, setQuickRecipeForm] = useState({
    name: '',
    ingredients: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    category: 'dinner' as RecipeCategory,
    tags: ''
  })

  // Filtered recipes based on search
  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes
    const search = recipeSearch.toLowerCase()
    return recipes.filter(r => 
      r.name.toLowerCase().includes(search) ||
      r.tags?.some(t => t.toLowerCase().includes(search)) ||
      r.category?.toLowerCase().includes(search)
    )
  }, [recipes, recipeSearch])

  // Suggested recipes based on meal type
  const suggestedRecipes = useMemo(() => {
    const mealType = mealForm.type
    const categoryMap: Record<string, RecipeCategory[]> = {
      breakfast: ['breakfast'],
      lunch: ['lunch', 'salad', 'soup', 'side'],
      dinner: ['dinner', 'soup', 'side'],
      snack: ['snack', 'dessert', 'appetizer']
    }
    const relevantCategories = categoryMap[mealType] || []
    
    return recipes
      .filter(r => r.category && relevantCategories.includes(r.category))
      .slice(0, 5)
  }, [recipes, mealForm.type])

  // Recently used recipes
  const recentRecipes = useMemo(() => {
    return [...recipes]
      .filter(r => r.lastMade)
      .sort((a, b) => (b.lastMade || 0) - (a.lastMade || 0))
      .slice(0, 5)
  }, [recipes])

  const openAddMealDialog = (date: Date, type?: typeof MEAL_TYPES[number]) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'))
    if (type) {
      setMealForm(prev => ({ ...prev, type }))
    }
    setAddMode('recipe')
    setRecipeSearch('')
    setDialogOpen(true)
  }

  const handleSelectRecipe = (recipe: Recipe) => {
    setMealForm(prev => ({
      ...prev,
      name: recipe.name,
      recipeId: recipe.id,
      servings: parseInt(recipe.servings || '4') || 4
    }))
    setRecipeSearch(recipe.name)
    setRecipeSearchOpen(false)
  }

  const handleAddMeal = () => {
    if (!currentHousehold) {
      toast.error('Please select a household first')
      return
    }
    
    if (!mealForm.name.trim()) {
      toast.error('Please enter a meal name or select a recipe')
      return
    }

    const newMeal: Meal = {
      id: Date.now().toString(),
      householdId: currentHousehold.id,
      date: selectedDate,
      type: mealForm.type,
      name: mealForm.name.trim(),
      recipeId: addMode === 'recipe' ? mealForm.recipeId || undefined : undefined,
      isNote: addMode === 'note',
      servings: mealForm.servings,
      notes: mealForm.notes.trim() || undefined
    }

    setMeals((current) => [...(current ?? []), newMeal])
    
    // Update recipe's lastMade if linked
    if (mealForm.recipeId) {
      setRecipes((current) => 
        (current ?? []).map(r => 
          r.id === mealForm.recipeId 
            ? { ...r, lastMade: Date.now(), timesCooked: (r.timesCooked || 0) + 1 }
            : r
        )
      )
    }
    
    setDialogOpen(false)
    resetForm()
    toast.success(addMode === 'note' ? 'Note added' : 'Meal added to plan')
  }

  const resetForm = () => {
    setMealForm({ name: '', type: 'dinner', recipeId: '', servings: 4, notes: '', isNote: false })
    setRecipeSearch('')
    setAddMode('recipe')
  }

  const handleDeleteMeal = (id: string) => {
    setMeals((current) => (current ?? []).filter((meal) => meal.id !== id))
    toast.success('Meal removed')
  }

  const handleQuickRecipeSave = () => {
    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }
    
    if (!quickRecipeForm.name.trim()) {
      toast.error('Please enter a recipe name')
      return
    }

    const newRecipe: Recipe = {
      id: Date.now().toString(),
      householdId: currentHousehold.id,
      name: quickRecipeForm.name.trim(),
      ingredients: quickRecipeForm.ingredients.split('\n').filter(i => i.trim()),
      instructions: quickRecipeForm.instructions.trim(),
      prepTime: quickRecipeForm.prepTime.trim() || undefined,
      cookTime: quickRecipeForm.cookTime.trim() || undefined,
      servings: quickRecipeForm.servings.trim() || undefined,
      category: quickRecipeForm.category,
      tags: quickRecipeForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t),
      createdAt: Date.now()
    }

    setRecipes((current) => [...(current ?? []), newRecipe])
    
    // Auto-select the new recipe
    setMealForm(prev => ({
      ...prev,
      name: newRecipe.name,
      recipeId: newRecipe.id,
      servings: parseInt(newRecipe.servings || '4') || 4
    }))
    setRecipeSearch(newRecipe.name)
    
    setQuickRecipeOpen(false)
    setQuickRecipeForm({
      name: '',
      ingredients: '',
      instructions: '',
      prepTime: '',
      cookTime: '',
      servings: '',
      category: 'dinner',
      tags: ''
    })
    toast.success('Recipe created and selected!')
  }

  const handleAddToShoppingList = (recipe: Recipe, servings?: number) => {
    if (!currentHousehold) return
    
    const multiplier = servings && recipe.servings 
      ? servings / (parseInt(recipe.servings) || 1) 
      : 1

    const existingItems = (shoppingItemsRaw ?? []).filter(i => i.householdId === currentHousehold.id)
    
    let addedCount = 0
    const newItems: ShoppingItem[] = []
    
    recipe.ingredients.forEach(ingredient => {
      const exists = existingItems.some(
        item => item.name.toLowerCase() === ingredient.toLowerCase() && !item.purchased
      )
      
      if (!exists) {
        newItems.push({
          id: `${Date.now()}-${addedCount}`,
          householdId: currentHousehold.id,
          name: ingredient,
          category: 'Recipe Ingredients',
          quantity: multiplier !== 1 ? `x${multiplier.toFixed(1)}` : '',
          purchased: false,
          createdAt: Date.now(),
          notes: `From: ${recipe.name}`
        })
        addedCount++
      }
    })
    
    if (newItems.length > 0) {
      setShoppingItems((current) => [...(current ?? []), ...newItems])
      toast.success(`Added ${newItems.length} ingredient${newItems.length > 1 ? 's' : ''} to shopping list`)
    } else {
      toast.info('All ingredients already in shopping list')
    }
  }

  const getMealsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.filter((meal) => meal.date === dateStr)
  }

  const getMealsByType = (dayMeals: Meal[], type: typeof MEAL_TYPES[number]) => {
    return dayMeals.filter((meal) => meal.type === type)
  }

  const getRecipe = (recipeId?: string): Recipe | undefined => {
    if (!recipeId) return undefined
    return recipes.find((r) => r.id === recipeId)
  }

  const viewRecipe = (recipe: Recipe) => {
    setSelectedViewRecipe(recipe)
    setViewRecipeOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Meal Planning</h2>
          <p className="text-sm text-muted-foreground">
            Week of {format(weekStart, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setWeekOffset(w => w - 1)}
              className="h-8 px-2"
            >
              <CaretLeft size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setWeekOffset(0)}
              className="h-8 px-2 text-xs"
              disabled={weekOffset === 0}
            >
              Today
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setWeekOffset(w => w + 1)}
              className="h-8 px-2"
            >
              <CaretRight size={16} />
            </Button>
          </div>
          <Button 
            onClick={() => setAutoPlannerOpen(true)} 
            variant="outline" 
            size="sm"
            className="gap-1"
          >
            <Sparkle size={16} />
            <span className="hidden sm:inline">Auto-Plan</span>
          </Button>
        </div>
      </div>

      <AutoMealPlanner open={autoPlannerOpen} onOpenChange={setAutoPlannerOpen} />

      {/* Week Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2 md:gap-3">
        {weekDays.map((day) => {
          const dayMeals = getMealsForDay(day)
          const dayIsToday = isToday(day)

          return (
            <Card
              key={day.toString()}
              className={`p-3 ${dayIsToday ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            >
              <div className="space-y-2">
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                    <div className={`text-xl font-bold ${dayIsToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => openAddMealDialog(day)}
                  >
                    <Plus size={14} />
                  </Button>
                </div>

                {/* Meals by Type */}
                <div className="space-y-2 min-h-[120px]">
                  {MEAL_TYPES.map((type) => {
                    const typeMeals = getMealsByType(dayMeals, type)
                    if (typeMeals.length === 0 && type === 'snack') return null
                    
                    return (
                      <div key={type} className="space-y-1">
                        <button
                          onClick={() => openAddMealDialog(day, type)}
                          className="text-[10px] font-semibold text-muted-foreground uppercase hover:text-primary transition-colors cursor-pointer"
                        >
                          {type}
                        </button>
                        {typeMeals.length > 0 ? (
                          typeMeals.map((meal) => {
                            const recipe = getRecipe(meal.recipeId)
                            return (
                              <MealCard
                                key={meal.id}
                                meal={meal}
                                recipe={recipe}
                                onDelete={() => handleDeleteMeal(meal.id)}
                                onViewRecipe={recipe ? () => viewRecipe(recipe) : undefined}
                                onAddToShopping={recipe ? () => handleAddToShoppingList(recipe, meal.servings) : undefined}
                              />
                            )
                          })
                        ) : (
                          <div className="text-xs text-muted-foreground/50 italic py-1">—</div>
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

      {/* Add Meal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Meal Plan</DialogTitle>
            <DialogDescription>
              {selectedDate && format(parseISO(selectedDate), 'EEEE, MMMM d')}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'recipe' | 'note')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recipe" className="gap-1">
                <CookingPot size={14} />
                Recipe
              </TabsTrigger>
              <TabsTrigger value="note" className="gap-1">
                <Note size={14} />
                Note
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="recipe" className="space-y-4 pt-4">
              {/* Meal Type */}
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select
                  value={mealForm.type}
                  onValueChange={(value) => setMealForm({ ...mealForm, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipe Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Recipe</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs gap-1"
                    onClick={() => setQuickRecipeOpen(true)}
                  >
                    <Plus size={12} />
                    New Recipe
                  </Button>
                </div>
                
                <Popover open={recipeSearchOpen} onOpenChange={setRecipeSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={recipeSearchOpen}
                      className="w-full justify-between font-normal"
                    >
                      {mealForm.name || "Search or select a recipe..."}
                      <MagnifyingGlass className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search recipes..." 
                        value={recipeSearch}
                        onValueChange={setRecipeSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No recipes found</p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setQuickRecipeForm(prev => ({ ...prev, name: recipeSearch }))
                                setQuickRecipeOpen(true)
                                setRecipeSearchOpen(false)
                              }}
                            >
                              Create "{recipeSearch}"
                            </Button>
                          </div>
                        </CommandEmpty>
                        
                        {/* Suggested recipes based on meal type */}
                        {suggestedRecipes.length > 0 && !recipeSearch && (
                          <CommandGroup heading={`Suggested for ${mealForm.type}`}>
                            {suggestedRecipes.map(recipe => (
                              <CommandItem
                                key={recipe.id}
                                value={recipe.name}
                                onSelect={() => handleSelectRecipe(recipe)}
                                className="flex items-center gap-2"
                              >
                                <CookingPot size={14} className="text-muted-foreground" />
                                <span className="flex-1">{recipe.name}</span>
                                {recipe.rating && (
                                  <div className="flex items-center text-yellow-500">
                                    <Star size={12} weight="fill" />
                                    <span className="text-xs ml-0.5">{recipe.rating}</span>
                                  </div>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}

                        {/* Recent recipes */}
                        {recentRecipes.length > 0 && !recipeSearch && (
                          <CommandGroup heading="Recently Made">
                            {recentRecipes.map(recipe => (
                              <CommandItem
                                key={recipe.id}
                                value={recipe.name}
                                onSelect={() => handleSelectRecipe(recipe)}
                                className="flex items-center gap-2"
                              >
                                <Clock size={14} className="text-muted-foreground" />
                                <span className="flex-1">{recipe.name}</span>
                                {recipe.timesCooked && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Made {recipe.timesCooked}x
                                  </Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        
                        {/* Search results */}
                        {recipeSearch && filteredRecipes.length > 0 && (
                          <CommandGroup heading="Recipes">
                            {filteredRecipes.map(recipe => (
                              <CommandItem
                                key={recipe.id}
                                value={recipe.name}
                                onSelect={() => handleSelectRecipe(recipe)}
                                className="flex items-center gap-2"
                              >
                                <CookingPot size={14} className="text-muted-foreground" />
                                <div className="flex-1">
                                  <div>{recipe.name}</div>
                                  {recipe.tags && recipe.tags.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      {recipe.tags.slice(0, 3).join(', ')}
                                    </div>
                                  )}
                                </div>
                                {mealForm.recipeId === recipe.id && (
                                  <Check size={14} className="text-primary" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        
                        {/* All recipes */}
                        {!recipeSearch && recipes.length > 0 && (
                          <CommandGroup heading="All Recipes">
                            {recipes.slice(0, 10).map(recipe => (
                              <CommandItem
                                key={recipe.id}
                                value={recipe.name}
                                onSelect={() => handleSelectRecipe(recipe)}
                                className="flex items-center gap-2"
                              >
                                <CookingPot size={14} className="text-muted-foreground" />
                                <span className="flex-1">{recipe.name}</span>
                                {recipe.category && (
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {recipe.category}
                                  </Badge>
                                )}
                              </CommandItem>
                            ))}
                            {recipes.length > 10 && (
                              <div className="py-2 text-center text-xs text-muted-foreground">
                                Type to search {recipes.length - 10} more recipes...
                              </div>
                            )}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {/* Or enter custom name */}
                {!mealForm.recipeId && (
                  <div className="pt-2">
                    <Input
                      value={mealForm.name}
                      onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                      placeholder="Or type a custom meal name..."
                    />
                  </div>
                )}
              </div>

              {/* Servings */}
              {mealForm.recipeId && (
                <div className="space-y-2">
                  <Label>Servings</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={mealForm.servings}
                      onChange={(e) => setMealForm({ ...mealForm, servings: parseInt(e.target.value) || 1 })}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">people</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={mealForm.notes}
                  onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                  placeholder="Any special notes for this meal..."
                  rows={2}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="note" className="space-y-4 pt-4">
              {/* Meal Type */}
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select
                  value={mealForm.type}
                  onValueChange={(value) => setMealForm({ ...mealForm, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note suggestions */}
              <div className="space-y-2">
                <Label>Quick Notes</Label>
                <div className="flex flex-wrap gap-2">
                  {['Leftovers', 'Eating Out', 'Takeout', 'Skip', 'Meal Prep'].map(note => (
                    <Button
                      key={note}
                      variant={mealForm.name === note ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMealForm({ ...mealForm, name: note })}
                    >
                      {note}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom note */}
              <div className="space-y-2">
                <Label>Or custom note</Label>
                <Input
                  value={mealForm.name}
                  onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                  placeholder="e.g., Mom's birthday dinner"
                />
              </div>

              {/* Additional notes */}
              <div className="space-y-2">
                <Label>Details (optional)</Label>
                <Textarea
                  value={mealForm.notes}
                  onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                  placeholder="Restaurant name, what leftovers, etc..."
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleAddMeal} className="w-full mt-4">
            Add to Meal Plan
          </Button>
        </DialogContent>
      </Dialog>

      {/* Quick Recipe Dialog */}
      <Dialog open={quickRecipeOpen} onOpenChange={setQuickRecipeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Add Recipe</DialogTitle>
            <DialogDescription>
              Create a new recipe to add to your meal plan
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label>Recipe Name *</Label>
                <Input
                  value={quickRecipeForm.name}
                  onChange={(e) => setQuickRecipeForm({ ...quickRecipeForm, name: e.target.value })}
                  placeholder="e.g., Chicken Stir Fry"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={quickRecipeForm.category}
                    onValueChange={(value) => setQuickRecipeForm({ ...quickRecipeForm, category: value as RecipeCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPE_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Servings</Label>
                  <Input
                    value={quickRecipeForm.servings}
                    onChange={(e) => setQuickRecipeForm({ ...quickRecipeForm, servings: e.target.value })}
                    placeholder="e.g., 4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prep Time</Label>
                  <Input
                    value={quickRecipeForm.prepTime}
                    onChange={(e) => setQuickRecipeForm({ ...quickRecipeForm, prepTime: e.target.value })}
                    placeholder="e.g., 15 min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cook Time</Label>
                  <Input
                    value={quickRecipeForm.cookTime}
                    onChange={(e) => setQuickRecipeForm({ ...quickRecipeForm, cookTime: e.target.value })}
                    placeholder="e.g., 30 min"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={quickRecipeForm.tags}
                  onChange={(e) => setQuickRecipeForm({ ...quickRecipeForm, tags: e.target.value })}
                  placeholder="e.g., quick, healthy, vegetarian"
                />
              </div>

              <div className="space-y-2">
                <Label>Ingredients (one per line)</Label>
                <Textarea
                  value={quickRecipeForm.ingredients}
                  onChange={(e) => setQuickRecipeForm({ ...quickRecipeForm, ingredients: e.target.value })}
                  placeholder="2 cups rice&#10;1 lb chicken&#10;2 tbsp soy sauce"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea
                  value={quickRecipeForm.instructions}
                  onChange={(e) => setQuickRecipeForm({ ...quickRecipeForm, instructions: e.target.value })}
                  placeholder="Cooking steps..."
                  rows={4}
                />
              </div>
            </div>
          </ScrollArea>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setQuickRecipeOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleQuickRecipeSave} className="flex-1">
              Create & Select
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Recipe Dialog */}
      <Dialog open={viewRecipeOpen} onOpenChange={setViewRecipeOpen}>
        <DialogContent className="max-w-lg">
          {selectedViewRecipe && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedViewRecipe.name}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-4">
                  {selectedViewRecipe.imageUrl && (
                    <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={selectedViewRecipe.imageUrl} 
                        alt={selectedViewRecipe.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedViewRecipe.prepTime && (
                      <Badge variant="outline" className="gap-1">
                        <Clock size={12} />
                        Prep: {selectedViewRecipe.prepTime}
                      </Badge>
                    )}
                    {selectedViewRecipe.cookTime && (
                      <Badge variant="outline" className="gap-1">
                        <Clock size={12} />
                        Cook: {selectedViewRecipe.cookTime}
                      </Badge>
                    )}
                    {selectedViewRecipe.servings && (
                      <Badge variant="outline" className="gap-1">
                        <Users size={12} />
                        {selectedViewRecipe.servings}
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Ingredients</h4>
                    <ul className="space-y-1 text-sm">
                      {selectedViewRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Instructions</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedViewRecipe.instructions}</p>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-1"
                  onClick={() => handleAddToShoppingList(selectedViewRecipe)}
                >
                  <ShoppingCart size={14} />
                  Add to Shopping
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {meals.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarBlank size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No meals planned yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click the + button on any day to add a meal, or use Auto-Plan
          </p>
          <Button onClick={() => setAutoPlannerOpen(true)} className="gap-2">
            <Sparkle />
            Auto-Plan Week
          </Button>
        </Card>
      )}
    </div>
  )
}

// Meal Card Component
interface MealCardProps {
  meal: Meal
  recipe?: Recipe
  onDelete: () => void
  onViewRecipe?: () => void
  onAddToShopping?: () => void
}

function MealCard({ meal, recipe, onDelete, onViewRecipe, onAddToShopping }: MealCardProps) {
  return (
    <div className={`
      bg-secondary/50 rounded-md p-2 group relative
      ${meal.isNote ? 'border-l-2 border-yellow-500/50 bg-yellow-50/30 dark:bg-yellow-950/20' : ''}
    `}>
      <div className="text-sm font-medium pr-6 flex items-start gap-1">
        {meal.isNote && <Note size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />}
        <span className="line-clamp-2">{meal.name}</span>
      </div>
      
      {recipe && (
        <div className="flex items-center gap-1 mt-1">
          <Badge 
            variant="outline" 
            className="text-[10px] px-1 py-0 cursor-pointer hover:bg-primary/10"
            onClick={(e) => { e.stopPropagation(); onViewRecipe?.(); }}
          >
            <CookingPot size={10} className="mr-0.5" />
            Recipe
          </Badge>
          {meal.servings && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              <Users size={10} className="mr-0.5" />
              {meal.servings}
            </Badge>
          )}
        </div>
      )}
      
      {meal.notes && (
        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{meal.notes}</p>
      )}
      
      {/* Action buttons */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onAddToShopping && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0"
            onClick={(e) => { e.stopPropagation(); onAddToShopping(); }}
            title="Add to shopping list"
          >
            <ShoppingCart size={10} />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash size={10} />
        </Button>
      </div>
    </div>
  )
}
