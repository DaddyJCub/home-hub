import { useState, useMemo, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { 
  Plus, Check, Trash, Repeat, Broom, Funnel, CaretDown, MapPin, Clock, Flag,
  CheckCircle, Circle, Lightning, Fire, Trophy, ArrowsClockwise, SkipForward,
  Timer, User, Users, CalendarCheck, Warning, Sparkle, CaretUp, Play, Stop,
  ChartBar, Eye, Pencil, X, ArrowRight, House, Calendar
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { Chore, ChoreCompletion, ChoreFrequency, ChoreRotation } from '@/lib/types'
import { toast } from 'sonner'
import { format, formatDistanceToNow, isPast, isToday, addDays, startOfDay, differenceInDays } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'

const ROOMS = [
  'Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Garage', 
  'Yard', 'Office', 'Laundry', 'Dining Room', 'Basement', 'Attic', 'Other'
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

const FREQUENCY_OPTIONS: { value: ChoreFrequency; label: string; description: string }[] = [
  { value: 'once', label: 'One-time', description: 'Do once and done' },
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Once a year' },
  { value: 'custom', label: 'Custom', description: 'Set your own interval' }
]

const priorityConfig = {
  high: { color: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-500/10', border: 'border-red-300' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-300' },
  low: { color: 'bg-green-500', text: 'text-green-700 dark:text-green-300', bg: 'bg-green-500/10', border: 'border-green-300' }
}

// Calculate next due date based on frequency
function calculateNextDue(frequency: ChoreFrequency, customDays?: number, lastCompleted?: number): number {
  const base = lastCompleted || Date.now()
  const msPerDay = 24 * 60 * 60 * 1000
  
  switch (frequency) {
    case 'daily': return base + msPerDay
    case 'weekly': return base + 7 * msPerDay
    case 'biweekly': return base + 14 * msPerDay
    case 'monthly': return base + 30 * msPerDay
    case 'quarterly': return base + 90 * msPerDay
    case 'yearly': return base + 365 * msPerDay
    case 'custom': return base + (customDays || 7) * msPerDay
    default: return 0
  }
}

// Get overdue status
function getOverdueStatus(chore: Chore): { isOverdue: boolean; isDueToday: boolean; isDueSoon: boolean; daysOverdue: number } {
  if (chore.completed || chore.frequency === 'once') {
    if (chore.dueDate) {
      const dueDate = new Date(chore.dueDate)
      const today = startOfDay(new Date())
      const daysOverdue = differenceInDays(today, dueDate)
      return {
        isOverdue: !chore.completed && daysOverdue > 0,
        isDueToday: !chore.completed && daysOverdue === 0,
        isDueSoon: !chore.completed && daysOverdue >= -2 && daysOverdue < 0,
        daysOverdue
      }
    }
    return { isOverdue: false, isDueToday: false, isDueSoon: false, daysOverdue: 0 }
  }
  
  const nextDue = chore.nextDue || calculateNextDue(chore.frequency, chore.customIntervalDays, chore.lastCompleted)
  const now = Date.now()
  const daysOverdue = Math.floor((now - nextDue) / (24 * 60 * 60 * 1000))
  
  return {
    isOverdue: daysOverdue > 0,
    isDueToday: daysOverdue === 0,
    isDueSoon: daysOverdue >= -2 && daysOverdue < 0,
    daysOverdue
  }
}

export default function ChoresSection() {
  const { currentHousehold, householdMembers } = useAuth()
  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [completionsRaw, setCompletions] = useKV<ChoreCompletion[]>('chore-completions', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  
  const allChores = choresRaw ?? []
  const allCompletions = completionsRaw ?? []
  const chores = currentHousehold ? allChores.filter(c => c.householdId === currentHousehold.id) : []
  const completions = currentHousehold ? allCompletions.filter(c => c.householdId === currentHousehold.id) : []
  const members = householdMembers ?? []
  
  // UI State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending')
  const [showStats, setShowStats] = useState(false)
  const [trackingChoreId, setTrackingChoreId] = useState<string | null>(null)
  const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null)
  const [completeDialogChore, setCompleteDialogChore] = useState<Chore | null>(null)
  
  // Filters
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'room' | 'created'>('dueDate')
  
  // Form state
  const [choreForm, setChoreForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    frequency: 'once' as ChoreFrequency,
    customIntervalDays: 7,
    room: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    notes: '',
    daysOfWeek: [] as number[],
    estimatedMinutes: '',
    rotation: 'none' as ChoreRotation,
    rotationOrder: [] as string[],
    trackTime: false
  })

  // Reset form
  const resetForm = useCallback(() => {
    setChoreForm({
      title: '', description: '', assignedTo: '', frequency: 'once',
      customIntervalDays: 7, room: '', priority: 'medium', dueDate: '',
      notes: '', daysOfWeek: [], estimatedMinutes: '', rotation: 'none',
      rotationOrder: [], trackTime: false
    })
  }, [])

  // Toggle day of week
  const toggleDayOfWeek = (day: number) => {
    setChoreForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }))
  }

  // Save chore
  const handleSaveChore = () => {
    if (!choreForm.title.trim() || !choreForm.assignedTo) {
      toast.error('Please fill in required fields')
      return
    }
    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }

    const choreData: Partial<Chore> = {
      title: choreForm.title.trim(),
      description: choreForm.description.trim() || undefined,
      assignedTo: choreForm.assignedTo,
      frequency: choreForm.frequency,
      customIntervalDays: choreForm.frequency === 'custom' ? choreForm.customIntervalDays : undefined,
      room: choreForm.room || undefined,
      priority: choreForm.priority,
      dueDate: choreForm.frequency === 'once' ? choreForm.dueDate || undefined : undefined,
      notes: choreForm.notes.trim() || undefined,
      daysOfWeek: choreForm.daysOfWeek.length > 0 ? choreForm.daysOfWeek : undefined,
      estimatedMinutes: choreForm.estimatedMinutes ? parseInt(choreForm.estimatedMinutes) : undefined,
      rotation: choreForm.rotation !== 'none' ? choreForm.rotation : undefined,
      rotationOrder: choreForm.rotation === 'rotate' ? choreForm.rotationOrder : undefined,
      trackTime: choreForm.trackTime || undefined
    }

    if (editingChore) {
      setChores(allChores.map(c => c.id === editingChore.id ? { ...c, ...choreData } : c))
      toast.success('Chore updated')
    } else {
      const newChore: Chore = {
        id: Date.now().toString(),
        householdId: currentHousehold.id,
        ...choreData,
        completed: false,
        createdAt: Date.now(),
        streak: 0,
        bestStreak: 0,
        totalCompletions: 0
      } as Chore
      
      // Calculate initial next due
      if (newChore.frequency !== 'once') {
        newChore.nextDue = calculateNextDue(newChore.frequency, newChore.customIntervalDays)
      }
      
      setChores([...allChores, newChore])
      toast.success('Chore added')
    }

    setDialogOpen(false)
    setEditingChore(null)
    resetForm()
  }

  // Complete chore with tracking
  const handleCompleteChore = (chore: Chore, actualMinutes?: number, completedBy?: string, notes?: string) => {
    const now = Date.now()
    const completer = completedBy || chore.assignedTo
    
    // Check if completed on time for streak
    const { isOverdue } = getOverdueStatus(chore)
    const wasOnTime = !isOverdue
    
    // Create completion record
    const completion: ChoreCompletion = {
      id: `${chore.id}-${now}`,
      choreId: chore.id,
      completedBy: completer,
      householdId: currentHousehold!.id,
      completedAt: now,
      notes: notes || undefined
    }
    setCompletions([...allCompletions, completion])
    
    // Update chore
    const updatedChore: Chore = { ...chore }
    updatedChore.lastCompleted = now
    updatedChore.lastCompletedBy = completer
    updatedChore.totalCompletions = (chore.totalCompletions || 0) + 1
    
    // Update streak
    if (wasOnTime && chore.frequency !== 'once') {
      updatedChore.streak = (chore.streak || 0) + 1
      if (updatedChore.streak > (chore.bestStreak || 0)) {
        updatedChore.bestStreak = updatedChore.streak
      }
    } else {
      updatedChore.streak = 0
    }
    
    // Update average time if tracked
    if (actualMinutes && chore.trackTime) {
      const prevAvg = chore.averageCompletionTime || chore.estimatedMinutes || actualMinutes
      const prevCount = (chore.totalCompletions || 1) - 1
      updatedChore.averageCompletionTime = Math.round((prevAvg * prevCount + actualMinutes) / (prevCount + 1))
    }
    
    // Handle recurring vs one-time
    if (chore.frequency === 'once') {
      updatedChore.completed = true
    } else {
      updatedChore.completed = false
      updatedChore.nextDue = calculateNextDue(chore.frequency, chore.customIntervalDays, now)
      
      // Handle rotation
      if (chore.rotation === 'rotate' && chore.rotationOrder && chore.rotationOrder.length > 0) {
        const nextIndex = ((chore.currentRotationIndex || 0) + 1) % chore.rotationOrder.length
        updatedChore.currentRotationIndex = nextIndex
        updatedChore.assignedTo = chore.rotationOrder[nextIndex]
      }
    }
    
    setChores(allChores.map(c => c.id === chore.id ? updatedChore : c))
    
    // Show streak toast if relevant
    if (updatedChore.streak && updatedChore.streak >= 3) {
      toast.success(`🔥 ${updatedChore.streak} day streak!`, { description: 'Keep it up!' })
    } else {
      toast.success('Chore completed!')
    }
    
    setCompleteDialogChore(null)
    setTrackingChoreId(null)
    setTrackingStartTime(null)
  }

  // Skip chore
  const handleSkipChore = (chore: Chore) => {
    if (chore.frequency === 'once') {
      toast.error('Cannot skip one-time chores')
      return
    }
    
    const now = Date.now()
    const completion: ChoreCompletion = {
      id: `${chore.id}-${now}-skip`,
      choreId: chore.id,
      completedBy: chore.assignedTo,
      householdId: currentHousehold!.id,
      completedAt: now,
      skipped: true
    }
    setCompletions([...allCompletions, completion])
    
    const updatedChore: Chore = {
      ...chore,
      lastSkipped: now,
      nextDue: calculateNextDue(chore.frequency, chore.customIntervalDays, now),
      streak: 0 // Reset streak on skip
    }
    
    setChores(allChores.map(c => c.id === chore.id ? updatedChore : c))
    toast.info('Chore skipped')
  }

  // Delete chore
  const handleDeleteChore = (id: string) => {
    setChores(allChores.filter(c => c.id !== id))
    setCompletions(allCompletions.filter(c => c.choreId !== id))
    toast.success('Chore deleted')
  }

  // Open edit dialog
  const openEditDialog = (chore: Chore) => {
    setEditingChore(chore)
    setChoreForm({
      title: chore.title,
      description: chore.description || '',
      assignedTo: chore.assignedTo,
      frequency: chore.frequency,
      customIntervalDays: chore.customIntervalDays || 7,
      room: chore.room || '',
      priority: chore.priority || 'medium',
      dueDate: chore.dueDate || '',
      notes: chore.notes || '',
      daysOfWeek: chore.daysOfWeek || [],
      estimatedMinutes: chore.estimatedMinutes?.toString() || '',
      rotation: chore.rotation || 'none',
      rotationOrder: chore.rotationOrder || [],
      trackTime: chore.trackTime || false
    })
    setDialogOpen(true)
  }

  // Start time tracking
  const startTracking = (choreId: string) => {
    setTrackingChoreId(choreId)
    setTrackingStartTime(Date.now())
    toast.info('Timer started')
  }

  // Stop tracking and complete
  const stopTracking = (chore: Chore) => {
    if (trackingStartTime) {
      const elapsed = Math.round((Date.now() - trackingStartTime) / 60000)
      setCompleteDialogChore(chore)
    }
  }

  // Filtered and sorted chores
  const processedChores = useMemo(() => {
    let filtered = chores.filter(chore => {
      if (selectedMember !== 'all' && chore.assignedTo !== selectedMember) return false
      if (filterRoom !== 'all' && chore.room !== filterRoom) return false
      if (filterPriority !== 'all' && chore.priority !== filterPriority) return false
      return true
    })

    // Add overdue status
    const withStatus = filtered.map(chore => ({
      chore,
      status: getOverdueStatus(chore)
    }))

    // Sort
    withStatus.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const order = { high: 0, medium: 1, low: 2 }
          return (order[a.chore.priority || 'medium'] || 1) - (order[b.chore.priority || 'medium'] || 1)
        }
        case 'dueDate': {
          // Overdue first, then due today, then due soon
          if (a.status.isOverdue !== b.status.isOverdue) return a.status.isOverdue ? -1 : 1
          if (a.status.isDueToday !== b.status.isDueToday) return a.status.isDueToday ? -1 : 1
          const aDue = a.chore.nextDue || (a.chore.dueDate ? new Date(a.chore.dueDate).getTime() : 0)
          const bDue = b.chore.nextDue || (b.chore.dueDate ? new Date(b.chore.dueDate).getTime() : 0)
          return aDue - bDue
        }
        case 'room':
          return (a.chore.room || '').localeCompare(b.chore.room || '')
        default:
          return b.chore.createdAt - a.chore.createdAt
      }
    })

    return withStatus
  }, [chores, selectedMember, filterRoom, filterPriority, sortBy])

  const pendingChores = processedChores.filter(({ chore }) => !chore.completed)
  const completedChores = processedChores.filter(({ chore }) => chore.completed)
  const overdueChores = pendingChores.filter(({ status }) => status.isOverdue)
  const dueTodayChores = pendingChores.filter(({ status }) => status.isDueToday && !status.isOverdue)

  // Stats
  const stats = useMemo<{ totalCompleted: number; avgStreak: number; byMember: Record<string, number>; thisWeek: number }>(() => {
    const totalCompleted = chores.reduce((acc, c) => acc + (c.totalCompletions || 0), 0)
    const totalStreak = chores.reduce((acc, c) => acc + (c.streak || 0), 0)
    const avgStreak = chores.length > 0 ? Math.round(totalStreak / chores.length) : 0
    
    // Completions by member
    const byMember: Record<string, number> = {}
    completions.forEach(c => {
      byMember[c.completedBy] = (byMember[c.completedBy] || 0) + 1
    })
    
    // This week's completions
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const thisWeek = completions.filter(c => c.completedAt > weekAgo && !c.skipped).length
    
    return { totalCompleted, avgStreak, byMember, thisWeek }
  }, [chores, completions])

  const hasActiveFilters = filterRoom !== 'all' || filterPriority !== 'all'

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <Broom className="text-primary" />
            Chores
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            {pendingChores.length} pending • {overdueChores.length > 0 && (
              <span className="text-red-600">{overdueChores.length} overdue</span>
            )}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={() => setShowStats(!showStats)}
          >
            <ChartBar size={16} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Funnel size={16} />
                {hasActiveFilters && <Badge variant="secondary" className="px-1 py-0 text-[10px]">On</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
              <DropdownMenuLabel className="text-xs text-muted-foreground">Priority</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filterPriority} onValueChange={setFilterPriority}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Sort By</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <DropdownMenuRadioItem value="dueDate">Due Date</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="room">Room</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created">Created</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) { setEditingChore(null); resetForm() }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <Plus size={16} />
                <span className="hidden sm:inline">Add Chore</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingChore ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={choreForm.title}
                    onChange={(e) => setChoreForm({ ...choreForm, title: e.target.value })}
                    placeholder="e.g., Vacuum living room"
                  />
                </div>
                
                {/* Assigned To & Room */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Assigned To *</Label>
                    <Select value={choreForm.assignedTo} onValueChange={(v) => setChoreForm({ ...choreForm, assignedTo: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {members.map(m => (
                          <SelectItem key={m.id} value={m.displayName}>{m.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Room</Label>
                    <Select value={choreForm.room} onValueChange={(v) => setChoreForm({ ...choreForm, room: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ROOMS.map(room => (
                          <SelectItem key={room} value={room}>{room}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Frequency & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Select value={choreForm.frequency} onValueChange={(v) => setChoreForm({ ...choreForm, frequency: v as ChoreFrequency })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={choreForm.priority} onValueChange={(v) => setChoreForm({ ...choreForm, priority: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Low</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="high">🔴 High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Custom interval */}
                {choreForm.frequency === 'custom' && (
                  <div className="space-y-1.5">
                    <Label>Repeat every (days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={choreForm.customIntervalDays}
                      onChange={(e) => setChoreForm({ ...choreForm, customIntervalDays: parseInt(e.target.value) || 7 })}
                    />
                  </div>
                )}
                
                {/* Days of week for weekly */}
                {(choreForm.frequency === 'weekly' || choreForm.frequency === 'biweekly') && (
                  <div className="space-y-1.5">
                    <Label>Days</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS_OF_WEEK.map(day => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={choreForm.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className="w-10 h-8"
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Due date for one-time */}
                {choreForm.frequency === 'once' && (
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={choreForm.dueDate}
                      onChange={(e) => setChoreForm({ ...choreForm, dueDate: e.target.value })}
                    />
                  </div>
                )}
                
                {/* Estimated time */}
                <div className="space-y-1.5">
                  <Label>Estimated Time (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={choreForm.estimatedMinutes}
                    onChange={(e) => setChoreForm({ ...choreForm, estimatedMinutes: e.target.value })}
                    placeholder="e.g., 30"
                  />
                </div>
                
                {/* Rotation */}
                {choreForm.frequency !== 'once' && members.length > 1 && (
                  <div className="space-y-1.5">
                    <Label>Assignment</Label>
                    <Select value={choreForm.rotation} onValueChange={(v) => setChoreForm({ ...choreForm, rotation: v as ChoreRotation })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Fixed person</SelectItem>
                        <SelectItem value="rotate">Rotate between members</SelectItem>
                        <SelectItem value="anyone">Whoever does it</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Rotation order */}
                {choreForm.rotation === 'rotate' && (
                  <div className="space-y-1.5">
                    <Label>Rotation Order</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {members.map(m => (
                        <Badge
                          key={m.id}
                          variant={choreForm.rotationOrder.includes(m.displayName) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const order = choreForm.rotationOrder.includes(m.displayName)
                              ? choreForm.rotationOrder.filter(n => n !== m.displayName)
                              : [...choreForm.rotationOrder, m.displayName]
                            setChoreForm({ ...choreForm, rotationOrder: order })
                          }}
                        >
                          {m.displayName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Track time toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Timer size={18} />
                    <Label htmlFor="track-time" className="cursor-pointer">Track actual time</Label>
                  </div>
                  <Switch
                    id="track-time"
                    checked={choreForm.trackTime}
                    onCheckedChange={(c) => setChoreForm({ ...choreForm, trackTime: c })}
                  />
                </div>
                
                {/* Notes */}
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    value={choreForm.notes}
                    onChange={(e) => setChoreForm({ ...choreForm, notes: e.target.value })}
                    placeholder="Special instructions..."
                    rows={2}
                  />
                </div>
                
                <Button onClick={handleSaveChore} className="w-full" disabled={members.length === 0}>
                  {editingChore ? 'Update Chore' : 'Add Chore'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <Trophy className="mx-auto mb-1 text-yellow-500" size={20} />
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <CheckCircle className="mx-auto mb-1 text-green-500" size={20} />
                <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                <p className="text-xs text-muted-foreground">Total Done</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <Fire className="mx-auto mb-1 text-orange-500" size={20} />
                <p className="text-2xl font-bold">{stats.avgStreak}</p>
                <p className="text-xs text-muted-foreground">Avg Streak</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <Warning className="mx-auto mb-1 text-red-500" size={20} />
                <p className="text-2xl font-bold">{overdueChores.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
            {Object.keys(stats.byMember).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Completions by member</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(stats.byMember).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                    <Badge key={name} variant="secondary" className="gap-1">
                      {name}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overdue Alert */}
      {overdueChores.length > 0 && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Warning size={18} className="text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  {overdueChores.length} overdue {overdueChores.length === 1 ? 'chore' : 'chores'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="gap-1">
            <Circle size={14} />
            Pending ({pendingChores.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <CheckCircle size={14} />
            Done ({completedChores.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1">
            All ({chores.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2 mt-4">
          {/* Due Today Section */}
          {dueTodayChores.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1 mb-2">
                <CalendarCheck size={16} />
                Due Today ({dueTodayChores.length})
              </h3>
              <div className="space-y-2">
                {dueTodayChores.map(({ chore, status }) => (
                  <ChoreCard
                    key={chore.id}
                    chore={chore}
                    status={status}
                    members={members}
                    isTracking={trackingChoreId === chore.id}
                    onComplete={() => chore.trackTime ? setCompleteDialogChore(chore) : handleCompleteChore(chore)}
                    onSkip={() => handleSkipChore(chore)}
                    onEdit={() => openEditDialog(chore)}
                    onDelete={() => handleDeleteChore(chore.id)}
                    onStartTracking={() => startTracking(chore.id)}
                    onStopTracking={() => stopTracking(chore)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Other Pending */}
          {pendingChores.filter(({ status }) => !status.isDueToday).length > 0 && (
            <div className="space-y-2">
              {dueTodayChores.length > 0 && (
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Upcoming</h3>
              )}
              {pendingChores.filter(({ status }) => !status.isDueToday).map(({ chore, status }) => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  status={status}
                  members={members}
                  isTracking={trackingChoreId === chore.id}
                  onComplete={() => chore.trackTime ? setCompleteDialogChore(chore) : handleCompleteChore(chore)}
                  onSkip={() => handleSkipChore(chore)}
                  onEdit={() => openEditDialog(chore)}
                  onDelete={() => handleDeleteChore(chore.id)}
                  onStartTracking={() => startTracking(chore.id)}
                  onStopTracking={() => stopTracking(chore)}
                />
              ))}
            </div>
          )}
          
          {pendingChores.length === 0 && (
            <div className="text-center py-12">
              <Sparkle size={40} className="mx-auto text-primary mb-3" />
              <h3 className="font-semibold mb-1">All caught up!</h3>
              <p className="text-sm text-muted-foreground">No pending chores</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 mt-4">
          {completedChores.map(({ chore, status }) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              status={status}
              members={members}
              isTracking={false}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={() => openEditDialog(chore)}
              onDelete={() => handleDeleteChore(chore.id)}
              onStartTracking={() => {}}
              onStopTracking={() => {}}
            />
          ))}
          {completedChores.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No completed chores yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-2 mt-4">
          {processedChores.map(({ chore, status }) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              status={status}
              members={members}
              isTracking={trackingChoreId === chore.id}
              onComplete={() => chore.trackTime ? setCompleteDialogChore(chore) : handleCompleteChore(chore)}
              onSkip={() => handleSkipChore(chore)}
              onEdit={() => openEditDialog(chore)}
              onDelete={() => handleDeleteChore(chore.id)}
              onStartTracking={() => startTracking(chore.id)}
              onStopTracking={() => stopTracking(chore)}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Complete Dialog with Time */}
      <Dialog open={!!completeDialogChore} onOpenChange={() => setCompleteDialogChore(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Chore</DialogTitle>
          </DialogHeader>
          {completeDialogChore && (
            <CompleteChoreForm
              chore={completeDialogChore}
              members={members}
              trackingStartTime={trackingStartTime}
              onComplete={(minutes, completedBy, notes) => handleCompleteChore(completeDialogChore, minutes, completedBy, notes)}
              onCancel={() => setCompleteDialogChore(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Empty state */}
      {chores.length === 0 && (
        <Card className="p-8 text-center">
          <Broom size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No chores yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first chore to get started</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2" size={16} />
            Add First Chore
          </Button>
        </Card>
      )}
    </div>
  )
}

// Chore Card Component
interface ChoreCardProps {
  chore: Chore
  status: { isOverdue: boolean; isDueToday: boolean; isDueSoon: boolean; daysOverdue: number }
  members: { id: string; displayName: string }[]
  isTracking: boolean
  onComplete: () => void
  onSkip: () => void
  onEdit: () => void
  onDelete: () => void
  onStartTracking: () => void
  onStopTracking: () => void
}

function ChoreCard({ chore, status, members, isTracking, onComplete, onSkip, onEdit, onDelete, onStartTracking, onStopTracking }: ChoreCardProps) {
  const priorityCfg = priorityConfig[chore.priority || 'medium']
  
  return (
    <Card className={`
      ${status.isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' : ''}
      ${status.isDueToday && !status.isOverdue ? 'border-primary/50 bg-primary/5' : ''}
      ${chore.completed ? 'opacity-60' : ''}
    `}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Complete Button */}
          <button
            onClick={onComplete}
            disabled={chore.completed}
            className={`
              mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 
              flex items-center justify-center transition-all
              ${chore.completed 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-muted-foreground/30 hover:border-primary hover:bg-primary/10'
              }
            `}
          >
            {chore.completed && <Check size={14} weight="bold" />}
          </button>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${chore.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {chore.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {/* Priority dot */}
                  <div className={`w-2 h-2 rounded-full ${priorityCfg.color}`} />
                  
                  {/* Assignee */}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <User size={10} />
                    {chore.assignedTo}
                  </Badge>
                  
                  {/* Room */}
                  {chore.room && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <House size={10} />
                      {chore.room}
                    </Badge>
                  )}
                  
                  {/* Frequency */}
                  {chore.frequency !== 'once' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <Repeat size={10} />
                      {chore.frequency}
                    </Badge>
                  )}
                  
                  {/* Streak */}
                  {chore.streak && chore.streak >= 2 && (
                    <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-orange-500">
                      <Fire size={10} />
                      {chore.streak}
                    </Badge>
                  )}
                </div>
                
                {/* Due info */}
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  {status.isOverdue && (
                    <span className="text-red-600 font-medium flex items-center gap-0.5">
                      <Warning size={12} />
                      {status.daysOverdue} day{status.daysOverdue !== 1 ? 's' : ''} overdue
                    </span>
                  )}
                  {status.isDueToday && !status.isOverdue && (
                    <span className="text-primary font-medium">Due today</span>
                  )}
                  {chore.lastCompleted && (
                    <span className="text-muted-foreground">
                      Last done {formatDistanceToNow(chore.lastCompleted, { addSuffix: true })}
                      {chore.lastCompletedBy && ` by ${chore.lastCompletedBy}`}
                    </span>
                  )}
                  {chore.estimatedMinutes && (
                    <span className="text-muted-foreground flex items-center gap-0.5">
                      <Clock size={12} />
                      ~{chore.estimatedMinutes}m
                    </span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Time tracking button */}
                {chore.trackTime && !chore.completed && (
                  isTracking ? (
                    <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={onStopTracking}>
                      <Stop size={14} />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onStartTracking}>
                      <Play size={14} />
                    </Button>
                  )
                )}
                
                {/* Skip button */}
                {chore.frequency !== 'once' && !chore.completed && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onSkip}>
                    <SkipForward size={14} />
                  </Button>
                )}
                
                {/* More actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <CaretDown size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil size={14} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-red-600">
                      <Trash size={14} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Complete Chore Form Component
interface CompleteChoreFormProps {
  chore: Chore
  members: { id: string; displayName: string }[]
  trackingStartTime: number | null
  onComplete: (minutes?: number, completedBy?: string, notes?: string) => void
  onCancel: () => void
}

function CompleteChoreForm({ chore, members, trackingStartTime, onComplete, onCancel }: CompleteChoreFormProps) {
  const [minutes, setMinutes] = useState(() => {
    if (trackingStartTime) {
      return Math.round((Date.now() - trackingStartTime) / 60000)
    }
    return chore.estimatedMinutes || 0
  })
  const [completedBy, setCompletedBy] = useState(chore.assignedTo)
  const [notes, setNotes] = useState('')
  
  return (
    <div className="space-y-4 pt-2">
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="font-medium">{chore.title}</p>
        {chore.room && <p className="text-sm text-muted-foreground">{chore.room}</p>}
      </div>
      
      {chore.trackTime && (
        <div className="space-y-1.5">
          <Label>Time Spent (minutes)</Label>
          <Input
            type="number"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
          />
          {trackingStartTime && (
            <p className="text-xs text-muted-foreground">
              Tracked: {Math.round((Date.now() - trackingStartTime) / 60000)} minutes
            </p>
          )}
        </div>
      )}
      
      {chore.rotation === 'anyone' && (
        <div className="space-y-1.5">
          <Label>Completed By</Label>
          <Select value={completedBy} onValueChange={setCompletedBy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {members.map(m => (
                <SelectItem key={m.id} value={m.displayName}>{m.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this completion..."
          rows={2}
        />
      </div>
      
      <div className="flex gap-2">
        <Button onClick={() => onComplete(minutes, completedBy, notes)} className="flex-1">
          <Check size={16} className="mr-1" />
          Complete
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

