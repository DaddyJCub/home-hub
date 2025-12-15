import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Trash, CookingPot, MagnifyingGlass, Clock, Users, Pencil } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Recipe } from '@/lib/types'
import { toast } from 'sonner'

export default function RecipesSection() {
  const [recipes = [], setRecipes] = useKV<Recipe[]>('recipes', [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    ingredients: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    servings: ''
  })

  const handleSaveRecipe = () => {
    if (!recipeForm.name.trim() || !recipeForm.ingredients.trim() || !recipeForm.instructions.trim()) {
      toast.error('Please fill in name, ingredients, and instructions')
      return
    }

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
                servings: recipeForm.servings.trim() || undefined
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
        createdAt: Date.now()
      }

      setRecipes((current = []) => [...current, newRecipe])
      toast.success('Recipe added')
    }

    setDialogOpen(false)
    setEditingRecipe(null)
    setRecipeForm({
      name: '',
      ingredients: '',
      instructions: '',
      prepTime: '',
      cookTime: '',
      servings: ''
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
      servings: recipe.servings || ''
    })
    setViewDialogOpen(false)
    setDialogOpen(true)
  }

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            setRecipeForm({
              name: '',
              ingredients: '',
              instructions: '',
              prepTime: '',
              cookTime: '',
              servings: ''
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

                <Button onClick={handleSaveRecipe} className="w-full">
                  {editingRecipe ? 'Update Recipe' : 'Add Recipe'}
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {recipes.length > 0 && (
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="pl-10"
          />
        </div>
      )}

      {recipes.length === 0 ? (
        <Card className="p-12 text-center">
          <CookingPot size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No recipes yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your favorite recipes to keep them organized
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
                <h3 className="font-semibold text-lg">{recipe.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.prepTime && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock size={14} />
                      Prep: {recipe.prepTime}
                    </Badge>
                  )}
                  {recipe.cookTime && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock size={14} />
                      Cook: {recipe.cookTime}
                    </Badge>
                  )}
                  {recipe.servings && (
                    <Badge variant="secondary" className="gap-1">
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
                <DialogTitle>{selectedRecipe.name}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
                <div className="space-y-6 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.prepTime && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock size={14} />
                        Prep: {selectedRecipe.prepTime}
                      </Badge>
                    )}
                    {selectedRecipe.cookTime && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock size={14} />
                        Cook: {selectedRecipe.cookTime}
                      </Badge>
                    )}
                    {selectedRecipe.servings && (
                      <Badge variant="secondary" className="gap-1">
                        <Users size={14} />
                        Servings: {selectedRecipe.servings}
                      </Badge>
                    )}
                  </div>

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
