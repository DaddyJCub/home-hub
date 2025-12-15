import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Trash, ShoppingCart } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { ShoppingItem } from '@/lib/types'
import { toast } from 'sonner'

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Bakery', 'Beverages', 'Household', 'Other']

export default function ShoppingSection() {
  const [items = [], setItems] = useKV<ShoppingItem[]>('shopping-items', [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Other',
    quantity: ''
  })

  const handleAddItem = () => {
    if (!itemForm.name.trim()) {
      toast.error('Please enter an item name')
      return
    }

    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: itemForm.name.trim(),
      category: itemForm.category,
      quantity: itemForm.quantity.trim(),
      purchased: false,
      createdAt: Date.now()
    }

    setItems((current = []) => [...current, newItem])
    setDialogOpen(false)
    setItemForm({ name: '', category: 'Other', quantity: '' })
    toast.success('Item added to list')
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
  }

  const clearPurchased = () => {
    setItems((current = []) => current.filter((item) => !item.purchased))
    toast.success('Purchased items cleared')
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Shopping Item</DialogTitle>
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
              <Button onClick={handleAddItem} className="w-full">
                Add to List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
