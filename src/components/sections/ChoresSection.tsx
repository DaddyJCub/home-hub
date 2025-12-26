import { useState, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Check, Trash, Repeat, Broom, Funnel, CaretDown, MapPin, Clock, Flag } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Chore, HouseholdMember } from '@/lib/types'
import { toast } from 'sonner'
import { useAuth } from '@/lib/AuthContext'

const ROOMS = [
  'Kitchen',
  'Living Room',
  'Bedroom',
  'Bathroom',
  'Garage',
  'Yard',
  'Office',
  'Laundry',
  'Dining Room',
  'Basement',
  'Attic',
  'Other'
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

export default function ChoresSection() {
  const { currentHousehold } = useAuth()
  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [membersRaw, setMembers] = useKV<HouseholdMember[]>('household-members', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  const chores = choresRaw ?? []
  const members = membersRaw ?? []
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'room' | 'created'>('created')
  
  const [choreForm, setChoreForm] = useState<{
    title: string
    assignedTo: string
    frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
    room: string
    priority: 'low' | 'medium' | 'high'
    dueDate: string
    notes: string
    daysOfWeek: number[]
    estimatedMinutes: string
  }>({
    title: '',
    assignedTo: '',
    frequency: 'once',
    room: '',
    priority: 'medium',
    dueDate: '',
    notes: '',
    daysOfWeek: [],
    estimatedMinutes: ''
  })
  
  const [memberName, setMemberName] = useState('')

  const toggleDayOfWeek = (day: number) => {
    setChoreForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }))
  }

  const handleSaveChore = () => {
    if (!choreForm.title.trim() || !choreForm.assignedTo) {
      toast.error('Please fill in required fields')
      return
    }

    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }

    if ((choreForm.frequency === 'weekly' || choreForm.frequency === 'biweekly') && choreForm.daysOfWeek.length === 0) {
      toast.error('Please select at least one day of the week for recurring chores')
      return
    }

    const choreData = {
      title: choreForm.title.trim(),
      assignedTo: choreForm.assignedTo,
      frequency: choreForm.frequency,
      room: choreForm.room || undefined,
      priority: choreForm.priority,
      dueDate: choreForm.dueDate || undefined,
      notes: choreForm.notes.trim() || undefined,
      daysOfWeek: choreForm.daysOfWeek.length > 0 ? choreForm.daysOfWeek : undefined,
      estimatedMinutes: choreForm.estimatedMinutes ? parseInt(choreForm.estimatedMinutes) : undefined
    }

    if (editingChore) {
      const updated = chores.map((chore) =>
        chore.id === editingChore.id
          ? { ...chore, ...choreData }
          : chore
      )
      setChores(updated)
      toast.success('Chore updated')
    } else {
      const newChore: Chore = {
        id: Date.now().toString(),
        householdId: currentHousehold.id,
        ...choreData,
        completed: false,
        createdAt: Date.now()
      }
      const updated = [...chores, newChore]
      setChores(updated)
      toast.success('Chore added')
    }

    setDialogOpen(false)
    setEditingChore(null)
    resetForm()
  }

  const resetForm = () => {
    setChoreForm({
      title: '',
      assignedTo: '',
      frequency: 'once',
      room: '',
      priority: 'medium',
      dueDate: '',
      notes: '',
      daysOfWeek: [],
      estimatedMinutes: ''
    })
  }

  const handleToggleChore = (id: string) => {
    const updated = chores.map((chore) => {
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
    setChores(updated)
  }

  const handleDeleteChore = (id: string) => {
    const updated = chores.filter((chore) => chore.id !== id)
    setChores(updated)
    toast.success('Chore deleted')
  }

  const openEditDialog = (chore: Chore) => {
    setEditingChore(chore)
    setChoreForm({
      title: chore.title,
      assignedTo: chore.assignedTo,
      frequency: chore.frequency,
      room: chore.room || '',
      priority: chore.priority || 'medium',
      dueDate: chore.dueDate || '',
      notes: chore.notes || '',
      daysOfWeek: chore.daysOfWeek || [],
      estimatedMinutes: chore.estimatedMinutes?.toString() || ''
    })
    setDialogOpen(true)
  }

  const filteredAndSortedChores = useMemo(() => {
    let filtered = chores.filter(chore => {
      if (selectedMember !== 'all' && chore.assignedTo !== selectedMember) return false
      if (filterRoom !== 'all' && chore.room !== filterRoom) return false
      if (filterAssignee !== 'all' && chore.assignedTo !== filterAssignee) return false
      if (filterPriority !== 'all' && chore.priority !== filterPriority) return false
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
        case 'dueDate': {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        }
        case 'room':
          return (a.room || '').localeCompare(b.room || '')
        case 'created':
        default:
          return b.createdAt - a.createdAt
      }
    })
  }, [chores, selectedMember, filterRoom, filterAssignee, filterPriority, sortBy])

  const activeChores = filteredAndSortedChores.filter((c) => !c.completed)
  const completedChores = filteredAndSortedChores.filter((c) => c.completed)

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

  const hasActiveFilters = filterRoom !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all'

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 md:gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Chores</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            {selectedMember === 'all' 
              ? `${activeChores.length} active, ${completedChores.length} completed`
              : `${selectedMember}: ${activeChores.length} active, ${completedChores.length} completed`}
          </p>
        </div>
        <div className="flex gap-1.5 md:gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 md:gap-2 h-8 md:h-9 text-xs md:text-sm">
                <Funnel size={16} />
                <span className="hidden sm:inline">Filter</span>
                {hasActiveFilters && <Badge variant="secondary" className="ml-1 px-1.5 py-0">On</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground">Room</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filterRoom} onValueChange={setFilterRoom}>
                <DropdownMenuRadioItem value="all">All Rooms</DropdownMenuRadioItem>
                {ROOMS.map(room => (
                  <DropdownMenuRadioItem key={room} value={room}>{room}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Assigned To</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filterAssignee} onValueChange={setFilterAssignee}>
                <DropdownMenuRadioItem value="all">Everyone</DropdownMenuRadioItem>
                {members.map(member => (
                  <DropdownMenuRadioItem key={member.id} value={member.displayName}>{member.displayName}</DropdownMenuRadioItem>
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 md:gap-2 h-8 md:h-9 text-xs md:text-sm hidden sm:flex">
                Sort <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <DropdownMenuRadioItem value="created">Date Created</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dueDate">Due Date</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="room">Room</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingChore(null)
              resetForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-1 md:gap-2 h-8 md:h-9 text-xs md:text-sm">
                <Plus size={16} />
                <span className="hidden sm:inline">Add Chore</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingChore ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="title">Chore Title *</Label>
                    <Input
                      id="title"
                      value={choreForm.title}
                      onChange={(e) => setChoreForm({ ...choreForm, title: e.target.value })}
                      placeholder="e.g., Vacuum living room"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="assigned">Assigned To *</Label>
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
                            <SelectItem key={member.id} value={member.displayName}>
                              {member.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Select
                      value={choreForm.room}
                      onValueChange={(value) => setChoreForm({ ...choreForm, room: value })}
                    >
                      <SelectTrigger id="room">
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOMS.map((room) => (
                          <SelectItem key={room} value={room}>
                            {room}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={choreForm.priority}
                      onValueChange={(value) => setChoreForm({ ...choreForm, priority: value as any })}
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

                  {(choreForm.frequency === 'weekly' || choreForm.frequency === 'biweekly') && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Days of Week *</Label>
                      <div className="flex gap-2 flex-wrap">
                        {DAYS_OF_WEEK.map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={choreForm.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleDayOfWeek(day.value)}
                            className="w-14"
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {choreForm.frequency === 'once' && (
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={choreForm.dueDate}
                        onChange={(e) => setChoreForm({ ...choreForm, dueDate: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
                    <Input
                      id="estimatedMinutes"
                      type="number"
                      min="1"
                      value={choreForm.estimatedMinutes}
                      onChange={(e) => setChoreForm({ ...choreForm, estimatedMinutes: e.target.value })}
                      placeholder="e.g., 30"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={choreForm.notes}
                      onChange={(e) => setChoreForm({ ...choreForm, notes: e.target.value })}
                      placeholder="Add any special instructions or notes..."
                      rows={3}
                    />
                  </div>
                </div>
                <Button onClick={handleSaveChore} className="w-full" disabled={members.length === 0}>
                  {editingChore ? 'Update Chore' : 'Add Chore'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filterRoom !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Room: {filterRoom}
            </Badge>
          )}
          {filterAssignee !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Assignee: {filterAssignee}
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
              setFilterRoom('all')
              setFilterAssignee('all')
              setFilterPriority('all')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {chores.length === 0 ? (
        <Card className="p-12 text-center">
          <Broom size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No chores yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start by adding household members, then create your first chore
          </p>
        </Card>
      ) : activeChores.length === 0 && completedChores.length === 0 ? (
        <Card className="p-12 text-center">
          <Funnel size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No chores match your filters</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your filters to see more chores
          </p>
        </Card>
      ) : (
        <>
          {activeChores.length > 0 && (
            <div className="space-y-2 md:space-y-3">
              <h3 className="font-semibold text-base md:text-lg">To Do</h3>
              {activeChores.map((chore) => (
                <Card key={chore.id} className="p-3 md:p-4">
                  <div className="flex items-start gap-2 md:gap-3">
                    <Checkbox
                      id={`chore-${chore.id}`}
                      checked={chore.completed}
                      onCheckedChange={() => handleToggleChore(chore.id)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`chore-${chore.id}`}
                        className="font-medium cursor-pointer block text-sm md:text-base"
                      >
                        {chore.title}
                      </label>
                      {chore.notes && (
                        <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">
                          {chore.notes}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{chore.assignedTo}</Badge>
                        {chore.priority && (
                          <Badge className={`${getPriorityColor(chore.priority)} text-xs`}>
                            <Flag size={12} className="mr-1" />
                            {chore.priority}
                          </Badge>
                        )}
                        {chore.room && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <MapPin size={12} />
                            <span className="hidden sm:inline">{chore.room}</span>
                            <span className="sm:hidden">{chore.room.slice(0, 4)}</span>
                          </Badge>
                        )}
                        {chore.estimatedMinutes && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Clock size={12} />
                            {chore.estimatedMinutes}m
                          </Badge>
                        )}
                        {chore.frequency !== 'once' && (
                          <Badge variant="outline" className="gap-1 text-xs hidden md:flex">
                            <Repeat size={12} />
                            {getFrequencyLabel(chore.frequency)}
                          </Badge>
                        )}
                        {chore.daysOfWeek && chore.daysOfWeek.length > 0 && (
                          <Badge variant="outline" className="text-xs hidden lg:flex">
                            {chore.daysOfWeek.map(d => DAYS_OF_WEEK[d].label).join(', ')}
                          </Badge>
                        )}
                        {chore.dueDate && (
                          <Badge variant="outline" className="text-xs">
                            Due: {new Date(chore.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 md:gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(chore)}
                        className="h-8 px-2 md:px-3 text-xs"
                      >
                        <span className="hidden sm:inline">Edit</span>
                        <span className="sm:hidden">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChore(chore.id)}
                        className="h-8 px-2"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {completedChores.length > 0 && (
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base md:text-lg">Completed</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const confirmed = window.confirm('Clear all completed chores? This cannot be undone.')
                    if (confirmed) {
                      const updated = chores.filter((c) => !c.completed)
                      setChores(updated)
                    }
                  }}
                  className="text-xs h-8"
                >
                  Clear All
                </Button>
              </div>
              {completedChores.map((chore) => (
                <Card key={chore.id} className="p-3 md:p-4 opacity-60">
                  <div className="flex items-start gap-2 md:gap-3">
                    <Checkbox
                      id={`chore-${chore.id}`}
                      checked={chore.completed}
                      onCheckedChange={() => handleToggleChore(chore.id)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`chore-${chore.id}`}
                        className="font-medium cursor-pointer block line-through text-sm md:text-base"
                      >
                        {chore.title}
                      </label>
                      <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{chore.assignedTo}</Badge>
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Check size={12} />
                          Done
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChore(chore.id)}
                      className="h-8 px-2 flex-shrink-0"
                    >
                      <Trash size={16} />
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

