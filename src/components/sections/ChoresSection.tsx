import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Check, Trash, Repeat, Broom } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { Chore, HouseholdMember } from '@/lib/types'
import { toast } from 'sonner'

export default function ChoresSection() {
  const [chores = [], setChores] = useKV<Chore[]>('chores', [])
  const [members = [], setMembers] = useKV<HouseholdMember[]>('household-members', [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  
  const [choreForm, setChoreForm] = useState<{
    title: string
    assignedTo: string
    frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  }>({
    title: '',
    assignedTo: '',
    frequency: 'once'
  })
  
  const [memberName, setMemberName] = useState('')

  const handleAddMember = () => {
    if (!memberName.trim()) return
    
    const newMember: HouseholdMember = {
      id: Date.now().toString(),
      name: memberName.trim()
    }
    
    setMembers((current = []) => [...current, newMember])
    setMemberName('')
    setMemberDialogOpen(false)
    toast.success(`${newMember.name} added to household`)
  }

  const handleSaveChore = () => {
    if (!choreForm.title.trim() || !choreForm.assignedTo) {
      toast.error('Please fill in all fields')
      return
    }

    if (editingChore) {
      setChores((current = []) =>
        current.map((chore) =>
          chore.id === editingChore.id
            ? { ...chore, ...choreForm }
            : chore
        )
      )
      toast.success('Chore updated')
    } else {
      const newChore: Chore = {
        id: Date.now().toString(),
        ...choreForm,
        completed: false,
        createdAt: Date.now()
      }
      setChores((current = []) => [...current, newChore])
      toast.success('Chore added')
    }

    setDialogOpen(false)
    setEditingChore(null)
    setChoreForm({ title: '', assignedTo: '', frequency: 'once' })
  }

  const handleToggleChore = (id: string) => {
    setChores((current = []) =>
      current.map((chore) => {
        if (chore.id !== id) return chore
        
        const newCompleted = !chore.completed
        
        if (newCompleted && chore.frequency !== 'once') {
          const now = Date.now()
          let nextDue = now
          
          switch (chore.frequency) {
            case 'daily':
              nextDue = now + 24 * 60 * 60 * 1000
              break
            case 'weekly':
              nextDue = now + 7 * 24 * 60 * 60 * 1000
              break
            case 'biweekly':
              nextDue = now + 14 * 24 * 60 * 60 * 1000
              break
            case 'monthly':
              nextDue = now + 30 * 24 * 60 * 60 * 1000
              break
          }
          
          return {
            ...chore,
            completed: false,
            lastCompleted: now,
            nextDue
          }
        }
        
        return { ...chore, completed: newCompleted }
      })
    )
  }

  const handleDeleteChore = (id: string) => {
    setChores((current = []) => current.filter((chore) => chore.id !== id))
    toast.success('Chore deleted')
  }

  const openEditDialog = (chore: Chore) => {
    setEditingChore(chore)
    setChoreForm({
      title: chore.title,
      assignedTo: chore.assignedTo,
      frequency: chore.frequency
    })
    setDialogOpen(true)
  }

  const activeChores = chores.filter((c) => !c.completed)
  const completedChores = chores.filter((c) => c.completed)

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      once: 'One-time',
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly'
    }
    return labels[frequency as keyof typeof labels]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Chores</h2>
          <p className="text-sm text-muted-foreground">
            {activeChores.length} active, {completedChores.length} completed
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Add Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Household Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="member-name">Name</Label>
                  <Input
                    id="member-name"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Enter name"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  />
                </div>
                {members.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Members</Label>
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => (
                        <Badge key={member.id} variant="secondary">
                          {member.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={handleAddMember} className="w-full">
                  Add Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingChore(null)
              setChoreForm({ title: '', assignedTo: '', frequency: 'once' })
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus />
                Add Chore
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingChore ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Chore</Label>
                  <Input
                    id="title"
                    value={choreForm.title}
                    onChange={(e) => setChoreForm({ ...choreForm, title: e.target.value })}
                    placeholder="e.g., Vacuum living room"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned">Assigned To</Label>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Please add household members first
                    </p>
                  ) : (
                    <Select
                      value={choreForm.assignedTo}
                      onValueChange={(value) => setChoreForm({ ...choreForm, assignedTo: value })}
                    >
                      <SelectTrigger id="assigned">
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={choreForm.frequency}
                    onValueChange={(value) => setChoreForm({ ...choreForm, frequency: value as any })}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveChore} className="w-full" disabled={members.length === 0}>
                  {editingChore ? 'Update Chore' : 'Add Chore'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {chores.length === 0 ? (
        <Card className="p-12 text-center">
          <Broom size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No chores yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start by adding household members, then create your first chore
          </p>
        </Card>
      ) : (
        <>
          {activeChores.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">To Do</h3>
              {activeChores.map((chore) => (
                <Card key={chore.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`chore-${chore.id}`}
                      checked={chore.completed}
                      onCheckedChange={() => handleToggleChore(chore.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`chore-${chore.id}`}
                        className="font-medium cursor-pointer block"
                      >
                        {chore.title}
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">{chore.assignedTo}</Badge>
                        {chore.frequency !== 'once' && (
                          <Badge variant="outline" className="gap-1">
                            <Repeat size={14} />
                            {getFrequencyLabel(chore.frequency)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(chore)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChore(chore.id)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {completedChores.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Completed</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChores((current = []) => current.filter((c) => !c.completed))}
                >
                  Clear All
                </Button>
              </div>
              {completedChores.map((chore) => (
                <Card key={chore.id} className="p-4 opacity-60">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`chore-${chore.id}`}
                      checked={chore.completed}
                      onCheckedChange={() => handleToggleChore(chore.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`chore-${chore.id}`}
                        className="font-medium cursor-pointer block line-through"
                      >
                        {chore.title}
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">{chore.assignedTo}</Badge>
                        <Badge variant="outline" className="gap-1">
                          <Check size={14} />
                          Done
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChore(chore.id)}
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
