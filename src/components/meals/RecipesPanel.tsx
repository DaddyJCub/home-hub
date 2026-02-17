import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Trash, CookingPot, MagnifyingGlass, Clock, Users, Pencil, Link as LinkIcon, X, Tag, Sparkle, Image as ImageIcon, Star, ShoppingCart, GridFour, List, Printer, ArrowLeft, ShareNetwork } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useIsMobile } from '@/hooks/use-mobile'
import EmptyState from '@/components/EmptyState'
import type { Recipe, ShoppingItem, RecipeCategory } from '@/lib/types'
import { toast } from 'sonner'
import { validateRequired } from '@/lib/error-helpers'
import { useAuth } from '@/lib/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { ollamaGenerate } from '@/lib/ollama'

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

interface RecipesPanelProps {
  recipes: Recipe[]
  setRecipes: (updater: (current: Recipe[] | undefined) => Recipe[]) => void
  shoppingItemsRaw: ShoppingItem[] | undefined
  setShoppingItems: (updater: (current: ShoppingItem[] | undefined) => ShoppingItem[]) => void
  tagLibrary: string[] | undefined
  setTagLibrary: (updater: (current: string[] | undefined) => string[]) => void
  initialRecipeId?: string | null
  onRecipeViewed?: () => void
}

export default function RecipesPanel({
  recipes,
  setRecipes,
  shoppingItemsRaw,
  setShoppingItems,
  tagLibrary,
  setTagLibrary,
  initialRecipeId,
  onRecipeViewed,
}: RecipesPanelProps) {
  const { currentHousehold } = useAuth()
  const isMobile = useIsMobile()
  const recipeViewRef = useRef<HTMLDivElement>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [addMode, setAddMode] = useState<'manual' | 'url'>('manual')
  const [isParsingUrl, setIsParsingUrl] = useState(false)
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    ingredients: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    tags: '',
    category: 'dinner' as RecipeCategory,
    sourceUrl: '',
    imageUrl: '',
  })

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  // Draft autosave
  const DRAFT_KEY = 'recipe-draft'
  useEffect(() => {
    if (!dialogOpen || editingRecipe) return
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const draft = JSON.parse(raw)
        setRecipeForm((prev) => ({ ...prev, ...draft }))
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editingRecipe])

  useEffect(() => {
    if (!dialogOpen || editingRecipe) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(recipeForm))
  }, [recipeForm, dialogOpen, editingRecipe])

  // Handle opening a recipe from external navigation (e.g., from Dashboard)
  useEffect(() => {
    if (initialRecipeId && recipes.length > 0) {
      const recipe = recipes.find((r) => r.id === initialRecipeId)
      if (recipe) {
        setSelectedRecipe(recipe)
        setCheckedIngredients(new Set())
        setViewDialogOpen(true)
        onRecipeViewed?.()
      }
    }
  }, [initialRecipeId, recipes])

  const allTags = Array.from(
    new Set(recipes.flatMap((r) => r.tags || []))
  ).sort()

  const handleParseRecipeUrl = async () => {
    if (!recipeForm.sourceUrl.trim()) {
      toast.error('Please enter a recipe URL')
      return
    }

    setIsParsingUrl(true)
    try {
      const url = recipeForm.sourceUrl

      const htmlResponse = await fetch(url)
      if (!htmlResponse.ok) {
        throw new Error('Failed to fetch recipe URL')
      }
      const htmlContent = await htmlResponse.text()

      // Truncate HTML to avoid overwhelming the model
      const trimmedHtml = htmlContent.slice(0, 15000)

      const prompt = `You are a recipe extraction assistant. Extract recipe information from the following HTML content.

HTML Content:
${trimmedHtml}

Please extract and return the following information in JSON format:
- name: The recipe title/name
- ingredients: Array of ingredient strings (each ingredient as a separate item)
- instructions: The cooking instructions as a single text block
- prepTime: Preparation time (e.g., "15 min", "1 hour")
- cookTime: Cooking time (e.g., "30 min", "1 hour")
- servings: Number of servings (e.g., "4", "6-8")
- tags: Array of relevant tags/categories (e.g., ["vegetarian", "quick", "dinner"])
- imageUrl: The main recipe image URL (look for og:image meta tag, recipe photo, or main food image - must be a full absolute URL)

Return ONLY a valid JSON object with these fields. Extract actual content from the HTML, not placeholders. For imageUrl, ensure it's a complete URL starting with http:// or https://.`

      const response = await ollamaGenerate(prompt)
      let parsed: any = {}
      try {
        // Extract JSON from response (model may wrap it in markdown code blocks)
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch?.[0] || '{}')
      } catch (err) {
        console.error('Recipe parse JSON error', { err, response })
        throw new Error('Parser returned invalid JSON. Try again or paste details manually.')
      }

      setRecipeForm({
        name: parsed.name || '',
        ingredients: Array.isArray(parsed.ingredients)
          ? parsed.ingredients.join('\n')
          : parsed.ingredients || '',
        instructions: parsed.instructions || '',
        prepTime: parsed.prepTime || '',
        cookTime: parsed.cookTime || '',
        servings: parsed.servings || '',
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.join(', ')
          : parsed.tags || '',
        category: parsed.category || recipeForm.category || 'dinner',
        sourceUrl: recipeForm.sourceUrl,
        imageUrl: parsed.imageUrl || '',
      })

      toast.success('Recipe parsed! Please review and adjust as needed.')
      setAddMode('manual')
    } catch (error: any) {
      console.error('Failed to parse recipe:', error)
      const msg = error?.message || ''
      if (msg.includes('Ollama') || msg.includes('fetch')) {
        toast.error('Could not reach Ollama. Check Settings → AI Configuration.')
      } else {
        toast.error(msg || 'Failed to parse recipe from URL. Please try adding manually.')
      }
    } finally {
      setIsParsingUrl(false)
    }
  }

  const handleSaveRecipe = () => {
    if (!recipeForm.name.trim() || !recipeForm.ingredients.trim() || !recipeForm.instructions.trim()) {
      const err =
        validateRequired(recipeForm.name, 'Recipe name') ||
        validateRequired(recipeForm.ingredients, 'Ingredients') ||
        validateRequired(recipeForm.instructions, 'Instructions') ||
        'Please fill in name, ingredients, and instructions'
      toast.error(err)
      return
    }

    const tags = Array.from(
      new Set(
        recipeForm.tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t)
      )
    )

    // Sync new tags into the tag library
    if (tags.length > 0) {
      setTagLibrary((current) => {
        const existing = current ?? []
        const merged = Array.from(new Set([...existing, ...tags])).sort()
        return merged
      })
    }

    if (editingRecipe) {
      setRecipes((current) =>
        (current ?? []).map((recipe) =>
          recipe.id === editingRecipe.id
            ? {
                ...recipe,
                name: recipeForm.name.trim() || 'Untitled recipe',
                ingredients: recipeForm.ingredients.split('\n').filter((i) => i.trim()),
                instructions: recipeForm.instructions.trim(),
                prepTime: recipeForm.prepTime.trim() || undefined,
                cookTime: recipeForm.cookTime.trim() || undefined,
                servings: recipeForm.servings.trim() || undefined,
                tags: tags.length > 0 ? tags : undefined,
                category: recipeForm.category,
                sourceUrl: recipeForm.sourceUrl.trim() || undefined,
                imageUrl: recipeForm.imageUrl.trim() || undefined,
              }
            : recipe
        )
      )
      toast.success('Recipe updated')
    } else {
      if (!currentHousehold) {
        toast.error('No household selected')
        return
      }

      const newRecipe: Recipe = {
        id: Date.now().toString(),
        householdId: currentHousehold.id,
        name: recipeForm.name.trim() || 'Untitled recipe',
        ingredients: recipeForm.ingredients.split('\n').filter((i) => i.trim()),
        instructions: recipeForm.instructions.trim(),
        prepTime: recipeForm.prepTime.trim() || undefined,
        cookTime: recipeForm.cookTime.trim() || undefined,
        servings: recipeForm.servings.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        category: recipeForm.category,
        sourceUrl: recipeForm.sourceUrl.trim() || undefined,
        imageUrl: recipeForm.imageUrl.trim() || undefined,
        createdAt: Date.now(),
      }

      setRecipes((current) => [...(current ?? []), newRecipe])
      toast.success('Recipe added')
    }

    setDialogOpen(false)
    setEditingRecipe(null)
    setAddMode('manual')
    localStorage.removeItem(DRAFT_KEY)
    setRecipeForm({
      name: '',
      ingredients: '',
      instructions: '',
      prepTime: '',
      cookTime: '',
      servings: '',
      tags: '',
      category: 'dinner',
      sourceUrl: '',
      imageUrl: '',
    })
  }

  const handleDeleteRecipe = (id: string) => {
    setRecipes((current) => (current ?? []).filter((recipe) => recipe.id !== id))
    setViewDialogOpen(false)
    toast.success('Recipe deleted')
  }

  const handleRateRecipe = (id: string, rating: number) => {
    setRecipes((current) =>
      (current ?? []).map((r) => (r.id === id ? { ...r, rating } : r))
    )
    toast.success(`Rated ${rating} star${rating !== 1 ? 's' : ''}`)
  }

  const handleAddToShoppingList = (recipe: Recipe) => {
    if (!currentHousehold) return

    const existingItems = (shoppingItemsRaw ?? []).filter(
      (i) => i.householdId === currentHousehold.id
    )
    let addedCount = 0
    const newItems: ShoppingItem[] = []

    recipe.ingredients.forEach((ingredient) => {
      const exists = existingItems.some(
        (item) => item.name.toLowerCase() === ingredient.toLowerCase() && !item.purchased
      )

      if (!exists) {
        newItems.push({
          id: `${Date.now()}-${addedCount}`,
          householdId: currentHousehold.id,
          name: ingredient,
          category: 'Recipe Ingredients',
          quantity: '',
          purchased: false,
          createdAt: Date.now(),
          notes: `From: ${recipe.name}`,
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

  const viewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setCheckedIngredients(new Set())
    setViewDialogOpen(true)
  }

  const handlePrintRecipe = () => {
    if (!selectedRecipe) return

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${selectedRecipe.name}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 { margin-bottom: 8px; font-size: 28px; }
          .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
          .meta span { margin-right: 16px; }
          .section { margin-bottom: 24px; }
          .section h2 {
            font-size: 18px;
            border-bottom: 2px solid #333;
            padding-bottom: 4px;
            margin-bottom: 12px;
          }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          .instructions { white-space: pre-wrap; }
          .source { font-size: 12px; color: #888; margin-top: 24px; }
          .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            margin-bottom: 16px;
            border-bottom: 1px solid #eee;
          }
          .header-bar button {
            padding: 8px 16px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: #f5f5f5;
            cursor: pointer;
            font-size: 14px;
          }
          .header-bar button:hover {
            background: #eee;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header-bar no-print">
          <button onclick="window.close()">&larr; Back to App</button>
          <button onclick="window.print()">Print Recipe</button>
        </div>
        <h1>${selectedRecipe.name}</h1>
        ${selectedRecipe.category ? `<p class="meta" style="text-transform: capitalize;">${selectedRecipe.category}</p>` : ''}
        <div class="meta">
          ${selectedRecipe.prepTime ? `<span>Prep: ${selectedRecipe.prepTime}</span>` : ''}
          ${selectedRecipe.cookTime ? `<span>Cook: ${selectedRecipe.cookTime}</span>` : ''}
          ${selectedRecipe.servings ? `<span>Servings: ${selectedRecipe.servings}</span>` : ''}
        </div>
        <div class="section">
          <h2>Ingredients</h2>
          <ul>
            ${selectedRecipe.ingredients.map((i) => `<li>${i}</li>`).join('')}
          </ul>
        </div>
        <div class="section">
          <h2>Instructions</h2>
          <div class="instructions">${selectedRecipe.instructions}</div>
        </div>
        ${selectedRecipe.sourceUrl ? `<p class="source">Source: ${selectedRecipe.sourceUrl}</p>` : ''}
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  const handleShareRecipe = async () => {
    if (!selectedRecipe) return

    const shareText = `${selectedRecipe.name}\n\nIngredients:\n${selectedRecipe.ingredients.map((i) => `\u2022 ${i}`).join('\n')}\n\nInstructions:\n${selectedRecipe.instructions}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedRecipe.name,
          text: shareText,
        })
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareText)
          toast.success('Recipe copied to clipboard')
        }
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText)
      toast.success('Recipe copied to clipboard')
    }
  }

  const toggleIngredientCheck = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const openEditDialog = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setRecipeForm({
      name: recipe.name,
      ingredients: recipe.ingredients.join('\n'),
      instructions: recipe.instructions,
      prepTime: recipe.prepTime || '',
      cookTime: recipe.cookTime || '',
      servings: recipe.servings || '',
      tags: recipe.tags?.join(', ') || '',
      category: recipe.category || 'dinner',
      sourceUrl: recipe.sourceUrl || '',
      imageUrl: recipe.imageUrl || '',
    })
    setViewDialogOpen(false)
    setDialogOpen(true)
  }

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch =
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        recipe.ingredients.some((i) => i.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesTag = !selectedTag || recipe.tags?.includes(selectedTag)
      const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory
      return matchesSearch && matchesTag && matchesCategory
    })
  }, [recipes, searchQuery, selectedTag, selectedCategory])

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Recipes</h2>
          <p className="text-sm text-muted-foreground">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
            {selectedCategory !== 'all' && ` \u2022 ${filteredRecipes.length} in ${selectedCategory}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode('grid')}
            >
              <GridFour size={16} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </Button>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) {
                setEditingRecipe(null)
                setAddMode('manual')
                setRecipeForm({
                  name: '',
                  ingredients: '',
                  instructions: '',
                  prepTime: '',
                  cookTime: '',
                  servings: '',
                  tags: '',
                  category: 'dinner',
                  sourceUrl: '',
                  imageUrl: '',
                })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus />
                <span className="hidden sm:inline">Add Recipe</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}</DialogTitle>
                <DialogDescription>
                  {editingRecipe ? 'Update the recipe details below.' : 'Add a new recipe manually or import from a URL.'}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
                {!editingRecipe && (
                  <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'manual' | 'url')} className="mb-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                      <TabsTrigger value="url">From URL</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="recipe-url">Recipe URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="recipe-url"
                            value={recipeForm.sourceUrl}
                            onChange={(e) => setRecipeForm({ ...recipeForm, sourceUrl: e.target.value })}
                            placeholder="https://example.com/recipe"
                            className="flex-1"
                          />
                          <Button
                            onClick={handleParseRecipeUrl}
                            disabled={isParsingUrl}
                            className="gap-2"
                          >
                            <Sparkle />
                            {isParsingUrl ? 'Parsing...' : 'Parse'}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          AI will extract recipe details from the URL
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipe-name">Recipe Name</Label>
                    <Input
                      id="recipe-name"
                      value={recipeForm.name}
                      onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                      placeholder="e.g., Grandma's Chocolate Chip Cookies"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prep-time">Prep Time</Label>
                      <Input
                        id="prep-time"
                        value={recipeForm.prepTime}
                        onChange={(e) => setRecipeForm({ ...recipeForm, prepTime: e.target.value })}
                        placeholder="e.g., 15 min"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cook-time">Cook Time</Label>
                      <Input
                        id="cook-time"
                        value={recipeForm.cookTime}
                        onChange={(e) => setRecipeForm({ ...recipeForm, cookTime: e.target.value })}
                        placeholder="e.g., 30 min"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="servings">Servings</Label>
                      <Input
                        id="servings"
                        value={recipeForm.servings}
                        onChange={(e) => setRecipeForm({ ...recipeForm, servings: e.target.value })}
                        placeholder="e.g., 4-6"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={recipeForm.category}
                        onValueChange={(value) => setRecipeForm({ ...recipeForm, category: value as RecipeCategory })}
                      >
                        <SelectTrigger id="category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECIPE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={recipeForm.tags}
                        onChange={(e) => setRecipeForm({ ...recipeForm, tags: e.target.value })}
                        placeholder="e.g., vegetarian, quick"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image-url">Image URL (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="image-url"
                        value={recipeForm.imageUrl}
                        onChange={(e) => setRecipeForm({ ...recipeForm, imageUrl: e.target.value })}
                        placeholder="https://example.com/recipe-image.jpg"
                        className="flex-1"
                      />
                      {recipeForm.imageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setRecipeForm({ ...recipeForm, imageUrl: '' })}
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </div>
                    {recipeForm.imageUrl && (
                      <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                        <img
                          src={recipeForm.imageUrl}
                          alt="Recipe preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.parentElement!.innerHTML =
                              '<div class="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Invalid image URL</div>'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ingredients">Ingredients</Label>
                    <p className="text-xs text-muted-foreground">Tip: one ingredient per line for easy shopping list use.</p>
                    <Textarea
                      id="ingredients"
                      value={recipeForm.ingredients}
                      onChange={(e) => {
                        setRecipeForm({ ...recipeForm, ingredients: e.target.value })
                        autoGrow(e.target)
                      }}
                      onInput={(e) => autoGrow(e.target as HTMLTextAreaElement)}
                      placeholder={'Enter each ingredient on a new line\ne.g.,\n2 cups flour\n1 cup sugar\n3 eggs'}
                      rows={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions</Label>
                    <p className="text-xs text-muted-foreground">Add clear steps. Include oven temps/timing where relevant.</p>
                    <Textarea
                      id="instructions"
                      value={recipeForm.instructions}
                      onChange={(e) => {
                        setRecipeForm({ ...recipeForm, instructions: e.target.value })
                        autoGrow(e.target)
                      }}
                      onInput={(e) => autoGrow(e.target as HTMLTextAreaElement)}
                      placeholder="Enter the cooking instructions..."
                      rows={10}
                    />
                  </div>

                  {editingRecipe && recipeForm.sourceUrl && (
                    <div className="space-y-2">
                      <Label htmlFor="source-url">Source URL</Label>
                      <Input
                        id="source-url"
                        value={recipeForm.sourceUrl}
                        onChange={(e) => setRecipeForm({ ...recipeForm, sourceUrl: e.target.value })}
                        placeholder="https://example.com/recipe"
                      />
                    </div>
                  )}

                  <Button onClick={handleSaveRecipe} className="w-full">
                    {editingRecipe ? 'Update Recipe' : 'Add Recipe'}
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search / filter bar */}
      {(recipes.length > 0 || allTags.length > 0) && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as RecipeCategory | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {RECIPE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedTag === null ? 'default' : 'outline'}
                onClick={() => setSelectedTag(null)}
              >
                All Tags
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  size="sm"
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  onClick={() => setSelectedTag(tag)}
                  className="gap-1"
                >
                  <Tag size={14} />
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recipe grid / list / empty states */}
      {recipes.length === 0 ? (
        <EmptyState
          icon={CookingPot}
          title="No recipes yet"
          description="Add your favorite recipes manually or import from a URL"
        />
      ) : filteredRecipes.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlass}
          title="No matching recipes"
          description="Try adjusting your search or filter"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col"
              onClick={() => viewRecipe(recipe)}
            >
              {recipe.imageUrl && (
                <div className="relative w-full aspect-[16/10] bg-muted overflow-hidden">
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold leading-tight truncate">{recipe.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {recipe.category && <span className="capitalize">{recipe.category}</span>}
                      {(recipe.prepTime || recipe.cookTime) && (
                        <span className="flex items-center gap-0.5">
                          <Clock size={11} />
                          {[recipe.prepTime && `Prep ${recipe.prepTime}`, recipe.cookTime && `Cook ${recipe.cookTime}`].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {recipe.rating && recipe.rating > 0 && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                      <Star size={12} weight="fill" className="text-yellow-500" />
                      <span className="text-xs font-medium">{recipe.rating}</span>
                    </div>
                  )}
                </div>

                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {recipe.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground self-center">+{recipe.tags.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                    {recipe.servings ? ` · ${recipe.servings} servings` : ''}
                    {recipe.timesCooked ? ` · ${recipe.timesCooked}x` : ''}
                  </p>
                  <div className="flex gap-1 items-center">
                    {recipe.sourceUrl && (
                      <LinkIcon size={12} className="text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddToShoppingList(recipe)
                      }}
                      title="Add to shopping list"
                    >
                      <ShoppingCart size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="space-y-1.5">
          {filteredRecipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => viewRecipe(recipe)}
            >
              <div className="flex items-center gap-3 p-3">
                {recipe.imageUrl && (
                  <div className="relative w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{recipe.name}</h3>
                    {recipe.rating && recipe.rating > 0 && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Star size={11} weight="fill" className="text-yellow-500" />
                        <span className="text-[11px] font-medium">{recipe.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {recipe.category && <span className="capitalize">{recipe.category}</span>}
                    {recipe.category && (recipe.prepTime || recipe.cookTime || recipe.ingredients.length > 0) && <span>·</span>}
                    {recipe.prepTime && <span>Prep {recipe.prepTime}</span>}
                    {recipe.cookTime && <span>Cook {recipe.cookTime}</span>}
                    <span>{recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {recipe.tags && recipe.tags.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                      {recipe.tags[0]}{recipe.tags.length > 1 ? ` +${recipe.tags.length - 1}` : ''}
                    </Badge>
                  )}
                  {recipe.sourceUrl && (
                    <LinkIcon size={14} className="text-muted-foreground" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddToShoppingList(recipe)
                    }}
                    title="Add to shopping list"
                  >
                    <ShoppingCart size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Recipe Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className={isMobile ? 'max-w-full h-[100dvh] p-0 gap-0 rounded-none' : 'max-w-2xl max-h-[90vh]'}>
          {selectedRecipe && (
            <div ref={recipeViewRef} className={isMobile ? 'flex flex-col h-full' : ''}>
              {/* Mobile Header */}
              {isMobile && (
                <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <Button variant="ghost" size="sm" onClick={() => setViewDialogOpen(false)} className="gap-1">
                    <ArrowLeft size={18} />
                    Back
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handleShareRecipe} title="Share">
                      <ShareNetwork size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handlePrintRecipe} title="Print">
                      <Printer size={20} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Desktop Header */}
              {!isMobile && (
                <DialogHeader className="pr-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle>{selectedRecipe.name}</DialogTitle>
                      <DialogDescription>
                        {selectedRecipe.category && (
                          <span className="capitalize">{selectedRecipe.category}</span>
                        )}
                      </DialogDescription>
                    </div>
                    <div className="flex items-center gap-1 mr-4">
                      <Button variant="ghost" size="icon" onClick={handleShareRecipe} title="Share">
                        <ShareNetwork size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handlePrintRecipe} title="Print">
                        <Printer size={18} />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
              )}

              <ScrollArea className={isMobile ? 'flex-1' : 'max-h-[calc(90vh-8rem)] pr-4'}>
                <div className={isMobile ? 'p-4 pb-24 space-y-5' : 'space-y-6 pt-4'}>
                  {/* Mobile Title */}
                  {isMobile && (
                    <div>
                      <h1 className="text-2xl font-bold">{selectedRecipe.name}</h1>
                      {selectedRecipe.category && (
                        <p className="text-sm text-muted-foreground capitalize">{selectedRecipe.category}</p>
                      )}
                    </div>
                  )}

                  {selectedRecipe.imageUrl && (
                    <div className={`relative w-full bg-muted overflow-hidden ${isMobile ? 'h-48 rounded-xl' : 'h-64 rounded-lg'}`}>
                      <img
                        src={selectedRecipe.imageUrl}
                        alt={selectedRecipe.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rating:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRateRecipe(selectedRecipe.id, star)}
                          className="p-1 hover:scale-110 transition-transform touch-manipulation"
                        >
                          <Star
                            size={isMobile ? 24 : 20}
                            weight={star <= (selectedRecipe.rating || 0) ? 'fill' : 'regular'}
                            className={
                              star <= (selectedRecipe.rating || 0)
                                ? 'text-yellow-500'
                                : 'text-muted-foreground/30 hover:text-yellow-400'
                            }
                          />
                        </button>
                      ))}
                    </div>
                    {selectedRecipe.timesCooked && selectedRecipe.timesCooked > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {'\u2022'} Cooked {selectedRecipe.timesCooked}x
                      </span>
                    )}
                    {selectedRecipe.lastMade && (
                      <span className="text-sm text-muted-foreground">
                        {'\u2022'} {formatDistanceToNow(selectedRecipe.lastMade, { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipe.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.prepTime && (
                      <Badge variant="outline" className="gap-1">
                        <Clock size={14} />
                        Prep: {selectedRecipe.prepTime}
                      </Badge>
                    )}
                    {selectedRecipe.cookTime && (
                      <Badge variant="outline" className="gap-1">
                        <Clock size={14} />
                        Cook: {selectedRecipe.cookTime}
                      </Badge>
                    )}
                    {selectedRecipe.servings && (
                      <Badge variant="outline" className="gap-1">
                        <Users size={14} />
                        Servings: {selectedRecipe.servings}
                      </Badge>
                    )}
                  </div>

                  {selectedRecipe.sourceUrl && (
                    <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                      <LinkIcon size={16} className="text-muted-foreground flex-shrink-0" />
                      <a
                        href={selectedRecipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {selectedRecipe.sourceUrl}
                      </a>
                    </div>
                  )}

                  {/* Ingredients with checkboxes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">Ingredients</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleAddToShoppingList(selectedRecipe)}
                      >
                        <ShoppingCart size={14} />
                        <span className={isMobile ? 'sr-only' : ''}>Add to Shopping</span>
                        {!isMobile && ' List'}
                      </Button>
                    </div>
                    <ul className="space-y-1">
                      {selectedRecipe.ingredients.map((ingredient, index) => (
                        <li
                          key={index}
                          className={`flex items-start gap-3 p-2 rounded-lg transition-colors touch-manipulation ${
                            isMobile ? 'active:bg-muted cursor-pointer' : ''
                          }`}
                          onClick={isMobile ? () => toggleIngredientCheck(index) : undefined}
                        >
                          <Checkbox
                            id={`ingredient-${index}`}
                            checked={checkedIngredients.has(index)}
                            onCheckedChange={() => toggleIngredientCheck(index)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`ingredient-${index}`}
                            className={`flex-1 cursor-pointer ${checkedIngredients.has(index) ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {ingredient}
                          </label>
                        </li>
                      ))}
                    </ul>
                    {checkedIngredients.size > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {checkedIngredients.size} of {selectedRecipe.ingredients.length} checked
                      </p>
                    )}
                  </div>

                  {/* Instructions */}
                  <div>
                    <h4 className="font-semibold text-lg mb-3">Instructions</h4>
                    {(() => {
                      // Check if instructions have numbered steps
                      const lines = selectedRecipe.instructions.split('\n').filter((l) => l.trim())
                      const hasNumberedSteps = lines.some((line) => /^\d+[\.\)]\s/.test(line.trim()))

                      if (hasNumberedSteps) {
                        return (
                          <ol className="space-y-3">
                            {lines.map((line, idx) => {
                              const cleaned = line.trim().replace(/^\d+[\.\)]\s*/, '')
                              return (
                                <li key={idx} className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span className="flex-1 leading-relaxed text-[15px] pt-0.5">{cleaned}</span>
                                </li>
                              )
                            })}
                          </ol>
                        )
                      }

                      return (
                        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                          {selectedRecipe.instructions}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Action buttons */}
                  <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                    <Button
                      variant="outline"
                      onClick={() => openEditDialog(selectedRecipe)}
                      className="flex-1 gap-2"
                    >
                      <Pencil size={18} />
                      Edit Recipe
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                      className="flex-1 gap-2"
                    >
                      <Trash size={18} />
                      Delete Recipe
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
