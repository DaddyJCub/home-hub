import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Trash, CookingPot, MagnifyingGlass, Clock, Users, Pencil, Link as LinkIcon, X, Tag, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Recipe } from '@/lib/types'
import { toast } from 'sonner'

export default function RecipesSection() {
  const [recipes = [], setRecipes] = useKV<Recipe[]>('recipes', [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
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
    sourceUrl: ''
  })

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
      const prompt = window.spark.llmPrompt(
        [
          'You are a recipe extraction assistant. Extract recipe information from the following URL: ',
          '\n\nPlease extract and return the following information in JSON format:\n- name: The recipe title/name\n- ingredients: Array of ingredient strings (each ingredient on its own line)\n- instructions: The cooking instructions as a single text block\n- prepTime: Preparation time (e.g., "15 min", "1 hour")\n- cookTime: Cooking time (e.g., "30 min", "1 hour")\n- servings: Number of servings (e.g., "4", "6-8")\n- tags: Array of relevant tags/categories (e.g., ["vegetarian", "quick", "dinner"])\n\nReturn ONLY the JSON object with these fields. If you cannot access the URL directly, provide a reasonable recipe structure with placeholder text indicating the fields need to be filled in manually.'
        ],
        url
      )

      const response = await window.spark.llm(prompt, 'gpt-4o', true)
      const parsed = JSON.parse(response)

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
        sourceUrl: recipeForm.sourceUrl
      })

      toast.success('Recipe parsed! Please review and adjust as needed.')
      setAddMode('manual')
    } catch (error) {
      console.error('Failed to parse recipe:', error)
      toast.error('Failed to parse recipe from URL. Please try adding manually.')
    } finally {
      setIsParsingUrl(false)
    }
  }

  const handleSaveRecipe = () => {
    if (!recipeForm.name.trim() || !recipeForm.ingredients.trim() || !recipeForm.instructions.trim()) {
      toast.error('Please fill in name, ingredients, and instructions')
      return
    }

    const tags = recipeForm.tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t)

    if (editingRecipe) {
      setRecipes((current = []) =>
        current.map((recipe) =>
          recipe.id === editingRecipe.id
            ? {
                ...recipe,
                name: recipeForm.name.trim(),
                ingredients: recipeForm.ingredients.split('\n').filter((i) => i.trim()),
                instructions: recipeForm.instructions.trim(),
                prepTime: recipeForm.prepTime.trim() || undefined,
                cookTime: recipeForm.cookTime.trim() || undefined,
                servings: recipeForm.servings.trim() || undefined,
                tags: tags.length > 0 ? tags : undefined,
                sourceUrl: recipeForm.sourceUrl.trim() || undefined
              }
            : recipe
        )
      )
      toast.success('Recipe updated')
    } else {
      const newRecipe: Recipe = {
        id: Date.now().toString(),
        name: recipeForm.name.trim(),
        ingredients: recipeForm.ingredients.split('\n').filter((i) => i.trim()),
        instructions: recipeForm.instructions.trim(),
        prepTime: recipeForm.prepTime.trim() || undefined,
        cookTime: recipeForm.cookTime.trim() || undefined,
        servings: recipeForm.servings.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        sourceUrl: recipeForm.sourceUrl.trim() || undefined,
        createdAt: Date.now()
      }

      setRecipes((current = []) => [...current, newRecipe])
      toast.success('Recipe added')
    }

    setDialogOpen(false)
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
      sourceUrl: ''
    })
  }

  const handleDeleteRecipe = (id: string) => {
    setRecipes((current = []) => current.filter((recipe) => recipe.id !== id))
    setViewDialogOpen(false)
    toast.success('Recipe deleted')
  }

  const viewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setViewDialogOpen(true)
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
      sourceUrl: recipe.sourceUrl || ''
    })
    setViewDialogOpen(false)
    setDialogOpen(true)
  }

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = !selectedTag || recipe.tags?.includes(selectedTag)
    return matchesSearch && matchesTag
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Recipes</h2>
          <p className="text-sm text-muted-foreground">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
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
              sourceUrl: ''
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus />
              Add Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}</DialogTitle>
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

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={recipeForm.tags}
                    onChange={(e) => setRecipeForm({ ...recipeForm, tags: e.target.value })}
                    placeholder="e.g., vegetarian, quick, dinner"
                  />
                  <p className="text-xs text-muted-foreground">
                    Add tags to organize and filter recipes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ingredients">Ingredients</Label>
                  <Textarea
                    id="ingredients"
                    value={recipeForm.ingredients}
                    onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: e.target.value })}
                    placeholder="Enter each ingredient on a new line&#10;e.g.,&#10;2 cups flour&#10;1 cup sugar&#10;3 eggs"
                    rows={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={recipeForm.instructions}
                    onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })}
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

      {(recipes.length > 0 || allTags.length > 0) && (
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="pl-10"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedTag === null ? 'default' : 'outline'}
                onClick={() => setSelectedTag(null)}
              >
                All
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

      {recipes.length === 0 ? (
        <Card className="p-12 text-center">
          <CookingPot size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No recipes yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your favorite recipes manually or import from a URL
          </p>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card className="p-12 text-center">
          <MagnifyingGlass size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No matching recipes</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your search or filter
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => viewRecipe(recipe)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg flex-1">{recipe.name}</h3>
                  {recipe.sourceUrl && (
                    <LinkIcon size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </div>
                
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {recipe.prepTime && (
                    <Badge variant="outline" className="gap-1">
                      <Clock size={14} />
                      Prep: {recipe.prepTime}
                    </Badge>
                  )}
                  {recipe.cookTime && (
                    <Badge variant="outline" className="gap-1">
                      <Clock size={14} />
                      Cook: {recipe.cookTime}
                    </Badge>
                  )}
                  {recipe.servings && (
                    <Badge variant="outline" className="gap-1">
                      <Users size={14} />
                      {recipe.servings}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selectedRecipe.name}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
                <div className="space-y-6 pt-4">
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
                      <LinkIcon size={16} className="text-muted-foreground" />
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

                  <div>
                    <h4 className="font-semibold mb-3">Ingredients</h4>
                    <ul className="space-y-2">
                      {selectedRecipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>
                          <span>{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Instructions</h4>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {selectedRecipe.instructions}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openEditDialog(selectedRecipe)}
                      className="flex-1 gap-2"
                    >
                      <Pencil />
                      Edit Recipe
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                      className="flex-1 gap-2"
                    >
                      <Trash />
                      Delete Recipe
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
