import { useState, useMemo, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Trash, ShoppingCart, Sparkle, Flag, Storefront, Funnel, CaretDown, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ShoppingItem, Meal, Recipe } from '@/lib/types'
import { toast } from 'sonner'
import { showUserFriendlyError, validateRequired } from '@/lib/error-helpers'
import { startOfWeek, addDays, format } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'

const DEFAULT_CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Household', 'Other']

const DEFAULT_STORES = ['Grocery Store', 'Farmers Market', 'Warehouse Club', 'Specialty Store', 'Convenience Store', 'Online', 'Other']

export default function ShoppingSection() {
  const { currentHousehold } = useAuth()
  const [itemsRaw, setItems] = useKV<ShoppingItem[]>('shopping-items', [])
  const [mealsRaw] = useKV<Meal[]>('meals', [])
  const [recipesRaw] = useKV<Recipe[]>('recipes', [])
  const [categoriesKV, setCategories] = useKV<string[]>('shopping-categories', DEFAULT_CATEGORIES)
  const [storesKV, setStores] = useKV<string[]>('shopping-stores', DEFAULT_STORES)
  // Filter data by current household
  const allItems = itemsRaw ?? []
  const allMeals = mealsRaw ?? []
  const allRecipes = recipesRaw ?? []
  const items = currentHousehold ? allItems.filter(i => i.householdId === currentHousehold.id) : []
  const meals = currentHousehold ? allMeals.filter(m => m.householdId === currentHousehold.id) : []
  const recipes = currentHousehold ? allRecipes.filter(r => r.householdId === currentHousehold.id) : []
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [manageListsOpen, setManageListsOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newStore, setNewStore] = useState('')
  
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStore, setFilterStore] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'category' | 'store'>('created')
  
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Other',
    quantity: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    store: '',
    notes: ''
  })
  const [quickItem, setQuickItem] = useState('')
  const [quickQuantity, setQuickQuantity] = useState('1')
  const quickInputRef = useRef<HTMLInputElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  const categoryOptions = (categoriesKV && categoriesKV.length > 0 ? categoriesKV : DEFAULT_CATEGORIES).sort()
  const storeOptions = (storesKV && storesKV.length > 0 ? storesKV : DEFAULT_STORES).sort()

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    const next = Array.from(new Set([...(categoriesKV ?? DEFAULT_CATEGORIES), name]))
    setCategories(next)
    setNewCategory('')
  }

  const addStore = () => {
    const name = newStore.trim()
    if (!name) return
    const next = Array.from(new Set([...(storesKV ?? DEFAULT_STORES), name]))
    setStores(next)
    setNewStore('')
  }

  const resetForm = () => {
    setItemForm({
      name: '',
      category: 'Other',
      quantity: '',
      priority: 'medium',
      store: '',
      notes: ''
    })
  }

  const handleSaveItem = () => {
    const nameError = validateRequired(itemForm.name, 'Item name')
    if (nameError) {
      toast.error(nameError)
      return
    }

    const itemData = {
      name: itemForm.name.trim(),
      category: itemForm.category,
      quantity: itemForm.quantity.trim(),
      priority: itemForm.priority,
      store: itemForm.store || undefined,
      notes: itemForm.notes.trim() || undefined
    }

    if (editingItem) {
      const updated = allItems.map((item) =>
        item.id === editingItem.id
          ? { ...item, ...itemData }
          : item
      )
      setItems(updated)
      toast.success('Item updated')
    } else {
      if (!currentHousehold) {
        toast.error('No household selected')
        return
      }
      
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        householdId: currentHousehold.id,
        ...itemData,
        purchased: false,
        createdAt: Date.now()
      }

      const updated = [...allItems, newItem]
      setItems(updated)
      toast.success('Item added to list')
    }

    setDialogOpen(false)
    setEditingItem(null)
    resetForm()
    nameInputRef.current?.focus()
  }

  const handleToggleItem = (id: string) => {
    const updated = allItems.map((item) =>
      item.id === id ? { ...item, purchased: !item.purchased } : item
    )
    setItems(updated)
  }

  const handleDeleteItem = (id: string) => {
    const updated = allItems.filter((item) => item.id !== id)
    setItems(updated)
    toast.success('Item deleted')
  }

  const openEditDialog = (item: ShoppingItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity || '',
      priority: item.priority || 'medium',
      store: item.store || '',
      notes: item.notes || ''
    })
    setDialogOpen(true)
  }

  const clearPurchased = () => {
    const confirmed = window.confirm('Clear all purchased items? This cannot be undone.')
    if (confirmed) {
      // Keep other households' items + current household's non-purchased items
      const updated = allItems.filter((item) => item.householdId !== currentHousehold?.id || !item.purchased)
      setItems(updated)
      toast.success('Purchased items cleared')
    }
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

    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }

    const newItems: ShoppingItem[] = allIngredients.map((ingredient) => ({
      id: `${Date.now()}-${Math.random()}`,
      householdId: currentHousehold.id,
      name: ingredient,
      category: 'Other',
      quantity: '',
      purchased: false,
      createdAt: Date.now()
    }))

    const updated = [...allItems, ...newItems]
    setItems(updated)
    setGenerateDialogOpen(false)
    toast.success(`Added ${newItems.length} items from meal plan`)
  }

  const handleQuickAdd = () => {
    const nameError = validateRequired(quickItem, 'Item name')
    if (nameError) {
      toast.error(nameError)
      return
    }
    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }
    const newItem: ShoppingItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      householdId: currentHousehold.id,
      name: quickItem.trim(),
      category: 'Other',
      quantity: quickQuantity.trim(),
      priority: 'medium',
      purchased: false,
      createdAt: Date.now()
    }
    setItems([...allItems, newItem])
    setQuickItem('')
    setQuickQuantity('1')
    quickInputRef.current?.focus()
    toast.success('Item added')
  }

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false
      if (filterStore !== 'all' && item.store !== filterStore) return false
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false
      return true
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          const aPriority = a.priority || 'medium'
          const bPriority = b.priority || 'medium'
          return priorityOrder[aPriority] - priorityOrder[bPriority]
        }
        case 'category':
          return a.category.localeCompare(b.category)
        case 'store':
          return (a.store || '').localeCompare(b.store || '')
        case 'created':
        default:
          return b.createdAt - a.createdAt
      }
    })
  }, [items, filterCategory, filterStore, filterPriority, sortBy])

  const activeItems = filteredAndSortedItems.filter((item) => !item.purchased)
  const purchasedItems = filteredAndSortedItems.filter((item) => item.purchased)

  const groupedItems = activeItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ShoppingItem[]>)
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const sortedGroupedItems = Object.fromEntries(
    Object.entries(groupedItems).map(([category, list]) => [
      category,
      [...list].sort((a, b) => {
        const pa = priorityOrder[a.priority || 'medium'] ?? 1
        const pb = priorityOrder[b.priority || 'medium'] ?? 1
        if (pa !== pb) return pa - pb
        return a.name.localeCompare(b.name)
      })
    ])
  )

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground'
      case 'low':
        return 'bg-secondary text-secondary-foreground'
      default:
        return 'bg-primary text-primary-foreground'
    }
  }

  const hasActiveFilters = filterCategory !== 'all' || filterStore !== 'all' || filterPriority !== 'all'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Shopping List</h2>
          <p className="text-sm text-muted-foreground">
            {activeItems.length} to buy, {purchasedItems.length} purchased
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Funnel />
                Filter {hasActiveFilters && <Badge variant="secondary" className="ml-1 px-1.5 py-0">•</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground">Category</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filterCategory} onValueChange={setFilterCategory}>
                <DropdownMenuRadioItem value="all">All Categories</DropdownMenuRadioItem>
                {categoryOptions.map(cat => (
                  <DropdownMenuRadioItem key={cat} value={cat}>{cat}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Store</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filterStore} onValueChange={setFilterStore}>
                <DropdownMenuRadioItem value="all">All Stores</DropdownMenuRadioItem>
                {storeOptions.map(store => (
                  <DropdownMenuRadioItem key={store} value={store}>{store}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Priority</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filterPriority} onValueChange={setFilterPriority}>
                <DropdownMenuRadioItem value="all">All Priorities</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="gap-2" onClick={() => setManageListsOpen(true)}>
            <Gear size={16} />
            Lists
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Sort <CaretDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <DropdownMenuRadioItem value="created">Date Added</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="category">Category</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="store">Store</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus size={16} />
            Add Item
          </Button>

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

          <Dialog open={manageListsOpen} onOpenChange={setManageListsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage categories & stores</DialogTitle>
                <DialogDescription>Edit the options shown in dropdowns.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Categories</h4>
                    <Button variant="outline" size="sm" onClick={() => setCategories(DEFAULT_CATEGORIES)}>
                      Reset
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCategory()
                        }
                      }}
                    />
                    <Button onClick={addCategory}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((cat) => (
                      <Badge key={cat} variant="secondary" className="gap-1">
                        {cat}
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setCategories((prev) => (prev || []).filter((c) => c !== cat))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Stores</h4>
                    <Button variant="outline" size="sm" onClick={() => setStores(DEFAULT_STORES)}>
                      Reset
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add store"
                      value={newStore}
                      onChange={(e) => setNewStore(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addStore()
                        }
                      }}
                    />
                    <Button onClick={addStore}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {storeOptions.map((store) => (
                      <Badge key={store} variant="secondary" className="gap-1">
                        {store}
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setStores((prev) => (prev || []).filter((s) => s !== store))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingItem(null)
              resetForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add Shopping Item'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="item-name">Item *</Label>
                    <Input
                      id="item-name"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      placeholder="e.g., Milk"
                      ref={nameInputRef}
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
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={itemForm.priority}
                      onValueChange={(value) => setItemForm({ ...itemForm, priority: value as any })}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store">Store</Label>
                    <Select
                      value={itemForm.store}
                      onValueChange={(value) => setItemForm({ ...itemForm, store: value })}
                    >
                      <SelectTrigger id="store">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent>
                        {storeOptions.map((store) => (
                          <SelectItem key={store} value={store}>
                            {store}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={itemForm.notes}
                      onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                      placeholder="Add any notes (brand preference, coupon, etc.)"
                      rows={2}
                    />
                  </div>
                </div>
                <Button onClick={handleSaveItem} className="w-full">
                  {editingItem ? 'Update Item' : 'Add to List'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Quick add item"
            value={quickItem}
            onChange={(e) => setQuickItem(e.target.value)}
            ref={quickInputRef}
          />
          <Input
            placeholder="Qty"
            value={quickQuantity}
            onChange={(e) => setQuickQuantity(e.target.value)}
            className="w-24"
          />
        </div>
        <Button onClick={handleQuickAdd} className="whitespace-nowrap">
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </Card>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filterCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Category: {filterCategory}
            </Badge>
          )}
          {filterStore !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Store: {filterStore}
            </Badge>
          )}
          {filterPriority !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Priority: {filterPriority}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterCategory('all')
              setFilterStore('all')
              setFilterPriority('all')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Your shopping list is empty</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add items you need to buy
          </p>
        </Card>
      ) : activeItems.length === 0 && purchasedItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Funnel size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No items match your filters</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your filters to see more items
          </p>
        </Card>
      ) : (
        <>
          {activeItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">To Buy</h3>
              {Object.entries(sortedGroupedItems).map(([category, categoryItems]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h4>
                  {categoryItems.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={item.purchased}
                          onCheckedChange={() => handleToggleItem(item.id)}
                          className="mt-1 h-5 w-5"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`item-${item.id}`}
                            className="cursor-pointer block"
                          >
                            <span className="font-medium">{item.name}</span>
                            {item.quantity && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({item.quantity})
                              </span>
                            )}
                          </label>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.notes}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.priority && item.priority !== 'medium' && (
                              <Badge className={getPriorityColor(item.priority)}>
                                <Flag size={14} className="mr-1" />
                                {item.priority}
                              </Badge>
                            )}
                            {item.store && (
                              <Badge variant="outline" className="gap-1">
                                <Storefront size={14} />
                                {item.store}
                              </Badge>
                            )}
                          </div>
                        </div>
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
