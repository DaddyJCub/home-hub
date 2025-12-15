import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Trash, ShoppingCart, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { ShoppingItem, Meal, Recipe } from '@/lib/types'
import { toast } from 'sonner'
import { startOfWeek, addDays, format } from 'date-fns'

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Household', 'Other']

export default function ShoppingSection() {
  const [items = [], setItems] = useKV<ShoppingItem[]>('shopping-items', [])
  const [meals = []] = useKV<Meal[]>('meals', [])
  const [recipes = []] = useKV<Recipe[]>('recipes', [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Other',
    quantity: ''
  })

  const handleSaveItem = () => {
    if (!itemForm.name.trim()) {
      toast.error('Please enter an item name')
      return
    }

    if (editingItem) {
      setItems((current = []) =>
        current.map((item) =>
          item.id === editingItem.id
            ? { ...item, name: itemForm.name.trim(), category: itemForm.category, quantity: itemForm.quantity.trim() }
            : item
        )
      )
      toast.success('Item updated')
    } else {
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name: itemForm.name.trim(),
        category: itemForm.category,
        quantity: itemForm.quantity.trim(),
        purchased: false,
        createdAt: Date.now()
      }

      setItems((current = []) => [...current, newItem])
      toast.success('Item added to list')
    }

    setDialogOpen(false)
    setEditingItem(null)
    setItemForm({ name: '', category: 'Other', quantity: '' })
  }

  const handleToggleItem = (id: string) => {
    setItems((current = []) =>
      current.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item
      )
    )
  }

  const handleDeleteItem = (id: string) => {
    setItems((current = []) => current.filter((item) => item.id !== id))
    toast.success('Item deleted')
  }

  const openEditDialog = (item: ShoppingItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity || ''
    })
    setDialogOpen(true)
  }

  const clearPurchased = () => {
    setItems((current = []) => current.filter((item) => !item.purchased))
    toast.success('Purchased items cleared')
  }

  const generateWeeklyShoppingList = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
    const weekEnd = addDays(weekStart, 6)
    
    const weekMeals = meals.filter((meal) => {
      const mealDate = new Date(meal.date)
      return mealDate >= weekStart && mealDate <= weekEnd
    })

    if (weekMeals.length === 0) {
      toast.error('No meals planned for this week')
      return
    }

    const mealsWithRecipes = weekMeals.filter((meal) => meal.recipeId)
    
    if (mealsWithRecipes.length === 0) {
      toast.error('No recipes linked to meals this week')
      return
    }

    const allIngredients: string[] = []
    mealsWithRecipes.forEach((meal) => {
      const recipe = recipes.find((r) => r.id === meal.recipeId)
      if (recipe) {
        allIngredients.push(...recipe.ingredients)
      }
    })

    if (allIngredients.length === 0) {
      toast.error('No ingredients found in linked recipes')
      return
    }

    const newItems: ShoppingItem[] = allIngredients.map((ingredient) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: ingredient,
      category: 'Other',
      quantity: '',
      purchased: false,
      createdAt: Date.now()
    }))

    setItems((current = []) => [...current, ...newItems])
    setGenerateDialogOpen(false)
    toast.success(`Added ${newItems.length} items from meal plan`)
  }

  const activeItems = items.filter((item) => !item.purchased)
  const purchasedItems = items.filter((item) => item.purchased)

  const groupedItems = activeItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ShoppingItem[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Shopping List</h2>
          <p className="text-sm text-muted-foreground">
            {activeItems.length} to buy, {purchasedItems.length} purchased
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkle />
                Generate from Meals
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Weekly Shopping List</DialogTitle>
                <DialogDescription>
                  This will add all ingredients from recipes linked to this week's meal plan to your shopping list.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-semibold text-sm">What will be added:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Ingredients from all recipes linked to meals this week</li>
                    <li>• Week starts on {format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'MMM d, yyyy')}</li>
                    <li>• Items will be added as uncategorized (you can edit them after)</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setGenerateDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={generateWeeklyShoppingList} className="flex-1 gap-2">
                    <Sparkle />
                    Generate List
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingItem(null)
              setItemForm({ name: '', category: 'Other', quantity: '' })
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add Shopping Item'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Item</Label>
                  <Input
                    id="item-name"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g., Milk"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    placeholder="e.g., 2 gallons"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={itemForm.category}
                    onValueChange={(value) => setItemForm({ ...itemForm, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveItem} className="w-full">
                  {editingItem ? 'Update Item' : 'Add to List'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Your shopping list is empty</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add items you need to buy
          </p>
        </Card>
      ) : (
        <>
          {activeItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">To Buy</h3>
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h4>
                  {categoryItems.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={item.purchased}
                          onCheckedChange={() => handleToggleItem(item.id)}
                        />
                        <label
                          htmlFor={`item-${item.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">{item.name}</span>
                          {item.quantity && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({item.quantity})
                            </span>
                          )}
                        </label>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}

          {purchasedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Purchased</h3>
                <Button variant="ghost" size="sm" onClick={clearPurchased}>
                  Clear All
                </Button>
              </div>
              {purchasedItems.map((item) => (
                <Card key={item.id} className="p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={item.purchased}
                      onCheckedChange={() => handleToggleItem(item.id)}
                    />
                    <label
                      htmlFor={`item-${item.id}`}
                      className="flex-1 cursor-pointer line-through"
                    >
                      <span className="font-medium">{item.name}</span>
                      {item.quantity && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({item.quantity})
                        </span>
                      )}
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
