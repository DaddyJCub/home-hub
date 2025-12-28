import { useState, useMemo, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { 
  Plus, Check, Trash, Repeat, Broom, Funnel, CaretDown, MapPin, Clock, Flag,
  CheckCircle, Circle, Lightning, Fire, Trophy, ArrowsClockwise, SkipForward,
  Timer, User, Users, CalendarCheck, Warning, Sparkle, CaretUp, Play, Stop,
  ChartBar, Eye, Pencil, X, ArrowRight, House, Calendar, Gear
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
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
import { format, formatDistanceToNow, isPast, isToday, addDays, startOfDay, differenceInDays, isWithinInterval } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'
import { computeNextDueAt, frequencyToMs, getChoreStatus, isCompletedForToday, normalizeChore } from '@/lib/chore-utils'

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

const COMPLETED_RECENT_WINDOW_HOURS = 24

export default function ChoresSection({ highlightChoreId }: { highlightChoreId?: string | null }) {
  const { currentHousehold, householdMembers } = useAuth()
  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [completionsRaw, setCompletions] = useKV<ChoreCompletion[]>('chore-completions', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  const [rooms, setRooms] = useKV<string[]>('rooms', [
    'Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Garage', 
    'Yard', 'Office', 'Laundry', 'Dining Room', 'Basement', 'Attic', 'Other'
  ])
  
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
  const [detailChore, setDetailChore] = useState<Chore | null>(null)
  const [manageRoomsOpen, setManageRoomsOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [roomEditIndex, setRoomEditIndex] = useState<number | null>(null)
  
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
    scheduleType: 'fixed' as 'fixed' | 'after_completion',
    customIntervalDays: 7,
    room: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDateTime: '',
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
      title: '', description: '', assignedTo: '', frequency: 'once', scheduleType: 'fixed',
      customIntervalDays: 7, room: '', priority: 'medium', dueDateTime: '', dueDate: '',
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

    const dueInput = choreForm.dueDateTime || choreForm.dueDate

    const initialDue =
      dueInput && !Number.isNaN(new Date(dueInput).getTime())
        ? new Date(dueInput).getTime()
        : Date.now() + frequencyToMs(choreForm.frequency as ChoreFrequency, choreForm.customIntervalDays || 1)

    const choreData: Partial<Chore> = {
      title: choreForm.title.trim(),
      description: choreForm.description.trim() || undefined,
      assignedTo: choreForm.assignedTo,
      frequency: choreForm.frequency,
      scheduleType: choreForm.scheduleType,
      customIntervalDays: choreForm.frequency === 'custom' ? choreForm.customIntervalDays : undefined,
      room: choreForm.room || undefined,
      priority: choreForm.priority,
      dueAt: initialDue,
      dueDate: choreForm.frequency === 'once' ? dueInput || undefined : undefined,
      notes: choreForm.notes.trim() || undefined,
      daysOfWeek: choreForm.daysOfWeek.length > 0 ? choreForm.daysOfWeek : undefined,
      estimatedMinutes: choreForm.estimatedMinutes ? parseInt(choreForm.estimatedMinutes) : undefined,
      rotation: choreForm.rotation !== 'none' ? choreForm.rotation : undefined,
      rotationOrder: choreForm.rotation === 'rotate' ? choreForm.rotationOrder : undefined,
      trackTime: choreForm.trackTime || undefined
    }

    if (editingChore) {
      setChores(allChores.map(c => c.id === editingChore.id ? normalizeChore({ ...c, ...choreData } as Chore) : c))
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

      setChores([...allChores, normalizeChore(newChore)])
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
    
    const normalized = normalizeChore(chore)
    const status = getChoreStatus(normalized, now)
    const wasOnTime = !status.isOverdue
    
    // Create completion record
    const completion: ChoreCompletion = {
      id: `${chore.id}-${now}`,
      choreId: chore.id,
      completedBy: completer,
      householdId: currentHousehold!.id,
      completedAt: now,
      notes: notes || undefined
    }
    const prevCompletions = [...allCompletions]
    setCompletions([...allCompletions, completion])
    
    // Update chore
    const updatedChore: Chore = { ...normalized }
    updatedChore.lastCompletedAt = now
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
      updatedChore.dueAt = computeNextDueAt(updatedChore, now)
      
      // Handle rotation
      if (chore.rotation === 'rotate' && chore.rotationOrder && chore.rotationOrder.length > 0) {
        const nextIndex = ((chore.currentRotationIndex || 0) + 1) % chore.rotationOrder.length
        updatedChore.currentRotationIndex = nextIndex
        updatedChore.assignedTo = chore.rotationOrder[nextIndex]
      }
    }
    
    const prevChores = [...allChores]
    setChores(allChores.map(c => c.id === chore.id ? updatedChore : c))
    
    // Show streak toast if relevant
    const description = updatedChore.streak && updatedChore.streak >= 3
      ? `🔥 ${updatedChore.streak} day streak!`
      : 'Marked complete'

    toast.success('Chore completed', {
      description,
      action: {
        label: 'Undo',
        onClick: () => {
          setChores(prevChores)
          setCompletions(prevCompletions)
        }
      }
    })
    
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
      dueAt: computeNextDueAt(chore, now),
      scheduleType: chore.scheduleType || 'after_completion',
      streak: 0 // Reset streak on skip
    }
    
    setChores(allChores.map(c => c.id === chore.id ? updatedChore : c))
    toast.info('Chore skipped')
  }

  // Delete chore
  const handleDeleteChore = (id: string) => {
    const prevChores = [...allChores]
    const prevCompletions = [...allCompletions]
    setChores(allChores.filter(c => c.id !== id))
    setCompletions(allCompletions.filter(c => c.choreId !== id))
    toast.success('Chore deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setChores(prevChores)
          setCompletions(prevCompletions)
        }
      }
    })
  }

  // Open edit dialog
  const openEditDialog = (chore: Chore) => {
    setEditingChore(chore)
    const normalized = normalizeChore(chore)
    const dueDateTime = normalized.dueAt ? new Date(normalized.dueAt).toISOString().slice(0,16) : ''
    setChoreForm({
      title: chore.title,
      description: chore.description || '',
      assignedTo: chore.assignedTo,
      frequency: chore.frequency,
      scheduleType: chore.scheduleType || 'fixed',
      customIntervalDays: chore.customIntervalDays || 7,
      room: chore.room || '',
      priority: chore.priority || 'medium',
      dueDateTime,
      dueDate: chore.dueDate || (chore.frequency === 'once' && dueDateTime ? dueDateTime.slice(0, 10) : ''),
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

    const withStatus = filtered.map(chore => {
      const normalized = normalizeChore(chore)
      const status = getChoreStatus(normalized)
      return { chore: normalized, status }
    })

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
          const aDue = a.chore.dueAt || 0
          const bDue = b.chore.dueAt || 0
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

  // Separate recurring chores completed today from actually pending chores
  const completedTodayChores = processedChores.filter(({ chore }) => !chore.completed && isCompletedForToday(chore))
  const pendingChores = processedChores.filter(({ chore }) => !chore.completed && !isCompletedForToday(chore))
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
                {(rooms || []).map(room => (
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
            if (open && !editingChore) {
              const defaultDue = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0,16)
              setChoreForm(prev => ({ 
                ...prev, 
                dueDateTime: prev.dueDateTime || defaultDue,
                dueDate: prev.dueDate || defaultDue.slice(0, 10)
              }))
            }
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
                        {(rooms || []).map(room => (
                          <SelectItem key={room} value={room}>{room}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="xs" className="h-6 px-2 text-xs" onClick={() => setManageRoomsOpen(true)}>
                      <Gear size={12} className="mr-1" /> Manage Rooms
                    </Button>
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

                {/* Schedule type */}
                {choreForm.frequency !== 'once' && (
                  <div className="space-y-1.5">
                    <Label>Schedule Type</Label>
                    <Select value={choreForm.scheduleType} onValueChange={(v) => setChoreForm({ ...choreForm, scheduleType: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed (next occurrence is fixed cadence)</SelectItem>
                        <SelectItem value="after_completion">After Completion (next due shifts from completion time)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
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
                
                {/* Next due date/time */}
                <div className="space-y-1.5">
                  <Label>Next Due</Label>
                  <Input
                    type="datetime-local"
                    value={choreForm.dueDateTime}
                    onChange={(e) => setChoreForm({ ...choreForm, dueDateTime: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">This sets the upcoming occurrence; recurring chores will auto-advance after completion.</p>
                </div>

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

          <Dialog open={manageRoomsOpen} onOpenChange={setManageRoomsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Rooms</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder={roomEditIndex !== null ? 'Rename room' : 'Add room'}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      const name = newRoomName.trim()
                      if (!name) return
                      if (roomEditIndex !== null) {
                        setRooms((current) => {
                          const next = [...(current || [])]
                          next[roomEditIndex] = name
                          return next
                        })
                      } else {
                        setRooms((current) => {
                          const set = new Set(current || [])
                          set.add(name)
                          return Array.from(set)
                        })
                      }
                      setNewRoomName('')
                      setRoomEditIndex(null)
                    }}
                  >
                    {roomEditIndex !== null ? 'Save' : 'Add'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(rooms || []).map((room, idx) => (
                    <div key={room} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                      <span>{room}</span>
                      <div className="flex gap-1">
                        <Button size="xs" variant="ghost" onClick={() => { setRoomEditIndex(idx); setNewRoomName(room) }}>
                          Rename
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setRooms((current) => (current || []).filter((r) => r !== room))
                            if (filterRoom === room) setFilterRoom('all')
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(rooms || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No rooms yet. Add one to get started.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => { setManageRoomsOpen(false); setRoomEditIndex(null); setNewRoomName('') }}>
                  Close
                </Button>
              </DialogFooter>
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
                    onClick={() => setDetailChore(chore)}
                    highlight={highlightChoreId === chore.id}
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
                  onClick={() => setDetailChore(chore)}
                  highlight={highlightChoreId === chore.id}
                />
              ))}
            </div>
          )}

          {/* Completed Today Section - for recurring chores done today */}
          {completedTodayChores.length > 0 && (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 w-full">
                <CaretDown size={14} className="transition-transform ui-open:rotate-180" />
                <CheckCircle size={14} className="text-green-500" />
                <span>Done Today ({completedTodayChores.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {completedTodayChores.map(({ chore, status }) => (
                  <Card 
                    key={chore.id}
                    className="cursor-pointer transition-all hover:shadow-md border-green-200 bg-green-50/50 dark:bg-green-950/10"
                    onClick={() => setDetailChore(chore)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                          <Check size={14} weight="bold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-green-700 dark:text-green-400">{chore.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {chore.lastCompletedAt && (
                              <span>Done {formatDistanceToNow(chore.lastCompletedAt, { addSuffix: true })}</span>
                            )}
                            {chore.lastCompletedBy && (
                              <span>by {chore.lastCompletedBy}</span>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Repeat size={10} className="mr-0.5" />
                              Next: {chore.frequency}
                            </Badge>
                          </div>
                        </div>
                        <Sparkle size={16} className="text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
          
      {pendingChores.length === 0 && (
        <div className="text-center py-12">
          <Sparkle size={40} className="mx-auto text-primary mb-3" />
          <h3 className="font-semibold mb-1">All caught up!</h3>
          <p className="text-sm text-muted-foreground">No pending chores. Add a quick win to keep momentum.</p>
          <div className="flex justify-center mt-3">
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Add a chore
            </Button>
          </div>
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
              onClick={() => setDetailChore(chore)}
              highlight={highlightChoreId === chore.id}
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
              onClick={() => setDetailChore(chore)}
              highlight={highlightChoreId === chore.id}
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

      {/* Chore Detail Dialog */}
      <Dialog open={!!detailChore} onOpenChange={() => setDetailChore(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailChore && (
            <ChoreDetailView
              chore={detailChore}
              completions={completions.filter(c => c.choreId === detailChore.id)}
              members={members}
              onComplete={() => {
                if (detailChore.trackTime) {
                  setCompleteDialogChore(detailChore)
                } else {
                  handleCompleteChore(detailChore)
                }
                setDetailChore(null)
              }}
              onSkip={() => {
                handleSkipChore(detailChore)
                setDetailChore(null)
              }}
              onEdit={() => {
                openEditDialog(detailChore)
                setDetailChore(null)
              }}
              onDelete={() => {
                handleDeleteChore(detailChore.id)
                setDetailChore(null)
              }}
              onClose={() => setDetailChore(null)}
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
  status: ReturnType<typeof getChoreStatus>
  members: { id: string; displayName: string }[]
  isTracking: boolean
  onComplete: () => void
  onSkip: () => void
  onEdit: () => void
  onDelete: () => void
  onStartTracking: () => void
  onStopTracking: () => void
  onClick: () => void
  highlight?: boolean
}

function ChoreCard({ chore, status, members, isTracking, onComplete, onSkip, onEdit, onDelete, onStartTracking, onStopTracking, onClick, highlight }: ChoreCardProps) {
  const priorityCfg = priorityConfig[chore.priority || 'medium']
  
  return (
    <Card 
      className={`
        cursor-pointer transition-all hover:shadow-md
        ${status.isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' : ''}
        ${status.isDueToday && !status.isOverdue ? 'border-primary/50 bg-primary/5' : ''}
        ${chore.completed ? 'opacity-60 scale-[0.99]' : ''}
        ${highlight ? 'ring-2 ring-primary' : ''}
      `}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Complete Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
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
                  {chore.lastCompletedAt && (
                    <span className="text-muted-foreground">
                      Last done {formatDistanceToNow(chore.lastCompletedAt, { addSuffix: true })}
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
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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

// Chore Detail View Component
interface ChoreDetailViewProps {
  chore: Chore
  completions: ChoreCompletion[]
  members: { id: string; displayName: string }[]
  onComplete: () => void
  onSkip: () => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

function ChoreDetailView({ chore, completions, members, onComplete, onSkip, onEdit, onDelete, onClose }: ChoreDetailViewProps) {
  const priorityCfg = priorityConfig[chore.priority || 'medium']
  const normalized = normalizeChore(chore)
  const status = getChoreStatus(normalized)
  const recentCompletions = completions.sort((a, b) => b.completedAt - a.completedAt).slice(0, 10)
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <DialogHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <DialogTitle className="text-xl flex items-center gap-2">
              {chore.title}
              {chore.completed && <CheckCircle size={20} className="text-green-500" />}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={`${priorityCfg.bg} ${priorityCfg.text} border ${priorityCfg.border}`}>
                {chore.priority || 'medium'} priority
              </Badge>
              {chore.frequency !== 'once' && (
                <Badge variant="secondary" className="gap-1">
                  <Repeat size={12} />
                  {chore.frequency}
                </Badge>
              )}
              {status.isOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <Warning size={12} />
                  {status.daysOverdue} days overdue
                </Badge>
              )}
              {status.isDueToday && !status.isOverdue && (
                <Badge className="bg-primary gap-1">
                  <CalendarCheck size={12} />
                  Due today
                </Badge>
              )}
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
          <p className="font-medium flex items-center gap-1">
            <User size={14} />
            {chore.assignedTo}
          </p>
          {chore.rotation === 'rotate' && (
            <p className="text-xs text-muted-foreground mt-1">
              <ArrowsClockwise size={10} className="inline mr-0.5" />
              Rotates: {chore.rotationOrder?.join(' → ')}
            </p>
          )}
        </div>
        {chore.room && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Room</p>
            <p className="font-medium flex items-center gap-1">
              <House size={14} />
              {chore.room}
            </p>
          </div>
        )}
        {chore.estimatedMinutes && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Time Estimate</p>
            <p className="font-medium flex items-center gap-1">
              <Clock size={14} />
              {chore.estimatedMinutes} minutes
            </p>
            {chore.averageCompletionTime && (
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {chore.averageCompletionTime}m
              </p>
            )}
          </div>
        )}
        {chore.dueDate && chore.frequency === 'once' && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Due Date</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar size={14} />
              {format(new Date(chore.dueDate), 'MMM d, yyyy')}
            </p>
          </div>
        )}
        {chore.dueAt && chore.frequency !== 'once' && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Next Due</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar size={14} />
              {format(chore.dueAt, 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        )}
      </div>

      {/* Stats Section */}
      {(chore.streak !== undefined || chore.totalCompletions) && (
        <div className="flex gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
          {chore.streak !== undefined && chore.streak > 0 && (
            <div className="text-center flex-1">
              <Fire size={20} className="mx-auto text-orange-500 mb-1" />
              <p className="text-xl font-bold">{chore.streak}</p>
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
          )}
          {chore.bestStreak !== undefined && chore.bestStreak > 0 && (
            <div className="text-center flex-1">
              <Trophy size={20} className="mx-auto text-yellow-500 mb-1" />
              <p className="text-xl font-bold">{chore.bestStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
          )}
          {chore.totalCompletions !== undefined && chore.totalCompletions > 0 && (
            <div className="text-center flex-1">
              <CheckCircle size={20} className="mx-auto text-green-500 mb-1" />
              <p className="text-xl font-bold">{chore.totalCompletions}</p>
              <p className="text-xs text-muted-foreground">Total Done</p>
            </div>
          )}
        </div>
      )}

      {/* Description/Notes */}
      {(chore.description || chore.notes) && (
        <div className="p-3 rounded-lg bg-muted/30 border">
          {chore.description && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{chore.description}</p>
            </div>
          )}
          {chore.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{chore.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Last Completed */}
      {chore.lastCompletedAt && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-900">
          <CheckCircle size={18} className="text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Last completed {formatDistanceToNow(chore.lastCompletedAt, { addSuffix: true })}
            </p>
            {chore.lastCompletedBy && (
              <p className="text-xs text-green-600/80 dark:text-green-400/80">by {chore.lastCompletedBy}</p>
            )}
          </div>
        </div>
      )}

      {/* Completion History */}
      {recentCompletions.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-auto py-2">
              <span className="flex items-center gap-2">
                <Clock size={16} />
                Completion History ({completions.length})
              </span>
              <CaretDown size={16} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentCompletions.map(completion => (
                <div 
                  key={completion.id} 
                  className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                    completion.skipped ? 'bg-yellow-500/10' : 'bg-muted/30'
                  }`}
                >
                  {completion.skipped ? (
                    <SkipForward size={14} className="text-yellow-600" />
                  ) : (
                    <Check size={14} className="text-green-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {completion.skipped ? 'Skipped' : 'Completed'} by {completion.completedBy}
                    </p>
                    {completion.notes && (
                      <p className="text-xs text-muted-foreground truncate">{completion.notes}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {format(completion.completedAt, 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        {!chore.completed && (
          <>
            <Button onClick={onComplete} className="flex-1">
              <Check size={16} className="mr-1" />
              Complete
            </Button>
            {chore.frequency !== 'once' && (
              <Button variant="outline" onClick={onSkip}>
                <SkipForward size={16} className="mr-1" />
                Skip
              </Button>
            )}
          </>
        )}
        <Button variant="outline" onClick={onEdit}>
          <Pencil size={16} className="mr-1" />
          Edit
        </Button>
        <Button variant="ghost" className="text-red-600" onClick={onDelete}>
          <Trash size={16} />
        </Button>
      </div>
    </div>
  )
}
