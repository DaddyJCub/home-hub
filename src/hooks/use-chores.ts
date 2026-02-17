import { useState, useMemo, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Chore, ChoreCompletion, ChoreFrequency, ChoreRotation } from '@/lib/types'
import { toast } from 'sonner'
import { validateRequired } from '@/lib/error-helpers'
import { formatDistanceToNow, addDays, startOfDay } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'
import { computeNextDueAt, frequencyToMs, getChoreStatus, isCompletedForToday, normalizeChore } from '@/lib/chore-utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

export const FREQUENCY_OPTIONS: { value: ChoreFrequency; label: string; description: string }[] = [
  { value: 'once', label: 'One-time', description: 'Do once and done' },
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Once a year' },
  { value: 'custom', label: 'Custom', description: 'Set your own interval' }
]

export const priorityConfig = {
  high: { color: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-500/10', border: 'border-red-300' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-300' },
  low: { color: 'bg-green-500', text: 'text-green-700 dark:text-green-300', bg: 'bg-green-500/10', border: 'border-green-300' }
}

export const COMPLETED_RECENT_WINDOW_HOURS = 24

export const getChoreRooms = (chore: Chore) =>
  chore.rooms?.length ? chore.rooms : chore.room ? [chore.room] : []

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChoreFormState {
  title: string
  description: string
  assignedTo: string
  frequency: ChoreFrequency
  scheduleType: 'fixed' | 'after_completion'
  customIntervalDays: number
  room: string
  rooms: string[]
  priority: 'low' | 'medium' | 'high'
  dueDateTime: string
  dueDate: string
  notes: string
  daysOfWeek: number[]
  estimatedMinutes: string
  rotation: ChoreRotation
  rotationOrder: string[]
  trackTime: boolean
}

const EMPTY_FORM: ChoreFormState = {
  title: '', description: '', assignedTo: '', frequency: 'once', scheduleType: 'fixed',
  customIntervalDays: 7, room: '', rooms: [], priority: 'medium', dueDateTime: '', dueDate: '',
  notes: '', daysOfWeek: [], estimatedMinutes: '', rotation: 'none',
  rotationOrder: [], trackTime: false
}

export type ChoreWithStatus = {
  chore: Chore
  status: ReturnType<typeof getChoreStatus>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChores() {
  const { currentHousehold, householdMembers } = useAuth()
  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [completionsRaw, setCompletions] = useKV<ChoreCompletion[]>('chore-completions', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  const [rooms, setRooms] = useKV<string[]>('rooms', [
    'Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Garage',
    'Yard', 'Office', 'Laundry', 'Dining Room', 'Basement', 'Attic', 'Other'
  ])
  const [roomQuickAdd, setRoomQuickAdd] = useState<Record<string, string>>({})

  const allChores = choresRaw ?? []
  const allCompletions = completionsRaw ?? []
  const chores = currentHousehold ? allChores.filter(c => c.householdId === currentHousehold.id) : []
  const completions = currentHousehold ? allCompletions.filter(c => c.householdId === currentHousehold.id) : []
  const members = householdMembers ?? []

  // ---------------------------------------------------------------------------
  // UI State
  // ---------------------------------------------------------------------------

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [trackingChoreId, setTrackingChoreId] = useState<string | null>(null)
  const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null)
  const [completeDialogChore, setCompleteDialogChore] = useState<Chore | null>(null)
  const [roomCompleteChore, setRoomCompleteChore] = useState<Chore | null>(null)
  const [roomSelection, setRoomSelection] = useState<string[]>([])
  const [detailChore, setDetailChore] = useState<Chore | null>(null)
  const [manageRoomsOpen, setManageRoomsOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [roomEditIndex, setRoomEditIndex] = useState<number | null>(null)

  // Filters
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'room' | 'created'>('dueDate')
  const [quickChoreTitle, setQuickChoreTitle] = useState('')
  const [quickChoreRoom, setQuickChoreRoom] = useState('none')

  // Form state
  const [choreForm, setChoreForm] = useState<ChoreFormState>({ ...EMPTY_FORM })

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setChoreForm({ ...EMPTY_FORM })
  }, [])

  const toggleDayOfWeek = useCallback((day: number) => {
    setChoreForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }))
  }, [])

  // ---------------------------------------------------------------------------
  // Chore CRUD
  // ---------------------------------------------------------------------------

  const handleSaveChore = useCallback(() => {
    const titleError = validateRequired(choreForm.title, 'Chore title')
    if (titleError) {
      toast.error(titleError)
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

    const assignedValue = choreForm.assignedTo === 'anyone' ? '' : choreForm.assignedTo

    const roomsSelected = (choreForm.rooms && choreForm.rooms.length > 0)
      ? choreForm.rooms
      : (choreForm.room ? [choreForm.room] : [])

    const choreData: Partial<Chore> = {
      title: choreForm.title.trim(),
      description: choreForm.description.trim() || undefined,
      assignedTo: assignedValue,
      frequency: choreForm.frequency,
      scheduleType: choreForm.scheduleType,
      customIntervalDays: choreForm.frequency === 'custom' ? choreForm.customIntervalDays : undefined,
      room: roomsSelected[0] || undefined,
      rooms: roomsSelected,
      priority: choreForm.priority,
      dueAt: initialDue,
      dueDate: choreForm.frequency === 'once' ? dueInput || undefined : undefined,
      notes: choreForm.notes.trim() || undefined,
      daysOfWeek: choreForm.daysOfWeek.length > 0 ? choreForm.daysOfWeek : undefined,
      estimatedMinutes: choreForm.estimatedMinutes ? parseInt(choreForm.estimatedMinutes) : undefined,
      rotation: choreForm.rotation !== 'none' ? choreForm.rotation : (choreForm.assignedTo === 'anyone' ? 'anyone' : undefined),
      rotationOrder: choreForm.rotation === 'rotate' ? choreForm.rotationOrder : undefined,
      trackTime: choreForm.trackTime || undefined
    }

    if (editingChore) {
      const updated = normalizeChore({ ...editingChore, ...choreData } as Chore)
      setChores(allChores.map(c => c.id === editingChore.id ? updated : c))
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
  }, [choreForm, currentHousehold, editingChore, allChores, setChores, resetForm])

  // ---------------------------------------------------------------------------
  // Complete / Skip / Delete
  // ---------------------------------------------------------------------------

  const handleCompleteChore = useCallback((
    chore: Chore,
    actualMinutes?: number,
    completedBy?: string,
    notes?: string,
    roomsOverride?: string | string[]
  ) => {
    const now = Date.now()
    const completer = completedBy || chore.assignedTo || 'Anyone'

    const normalized = normalizeChore(chore)
    const status = getChoreStatus(normalized, now)
    const wasOnTime = !status.isOverdue
    const roomsList = getChoreRooms(normalized)
    const targetRooms = Array.isArray(roomsOverride)
      ? roomsOverride
      : roomsOverride
        ? [roomsOverride]
        : roomsList.length > 0
          ? roomsList
          : []
    const completedRoomsSet = new Set(normalized.completedRooms || [])
    targetRooms.forEach(r => completedRoomsSet.add(r))
    const completedRooms = Array.from(completedRoomsSet)
    const allRoomsDone = roomsList.length === 0 ? true : completedRooms.length >= roomsList.length

    // Create completion record
    const completion: ChoreCompletion = {
      id: `${chore.id}-${now}`,
      choreId: chore.id,
      completedBy: completer,
      householdId: currentHousehold!.id,
      completedAt: now,
      notes: notes || undefined,
      room: targetRooms[0]
    }
    const prevCompletions = [...allCompletions]
    setCompletions([...allCompletions, completion])

    // Update chore
    const updatedChore: Chore = { ...normalized }
    updatedChore.lastCompletedAt = now
    updatedChore.lastCompletedBy = completer
    updatedChore.totalCompletions = (chore.totalCompletions || 0) + Math.max(1, targetRooms.length || 1)
    updatedChore.completedRooms = completedRooms

    // Update streak and recurrence only when all rooms are done
    if (allRoomsDone) {
      if (wasOnTime && chore.frequency !== 'once') {
        updatedChore.streak = (chore.streak || 0) + 1
        if (updatedChore.streak > (chore.bestStreak || 0)) {
          updatedChore.bestStreak = updatedChore.streak
        }
      } else {
        updatedChore.streak = 0
      }

      if (actualMinutes && chore.trackTime) {
        const prevAvg = chore.averageCompletionTime || chore.estimatedMinutes || actualMinutes
        const prevCount = (chore.totalCompletions || 1) - 1
        updatedChore.averageCompletionTime = Math.round((prevAvg * prevCount + actualMinutes) / (prevCount + 1))
      }

      if (chore.frequency === 'once') {
        updatedChore.completed = true
      } else {
        updatedChore.completed = false
        updatedChore.dueAt = computeNextDueAt(updatedChore, now)
        updatedChore.completedRooms = []

        if (chore.rotation === 'rotate' && chore.rotationOrder && chore.rotationOrder.length > 0) {
          const nextIndex = ((chore.currentRotationIndex || 0) + 1) % chore.rotationOrder.length
          updatedChore.currentRotationIndex = nextIndex
          updatedChore.assignedTo = chore.rotationOrder[nextIndex]
        } else if ((chore.rotation === 'anyone' || !chore.assignedTo) && members.length > 0) {
          const randomMember = members[Math.floor(Math.random() * members.length)]
          updatedChore.assignedTo = randomMember.displayName
        }
      }
    } else {
      updatedChore.completed = false
    }

    const prevChores = [...allChores]
    setChores(allChores.map(c => c.id === chore.id ? updatedChore : c))

    const remainingRooms = roomsList.filter(r => !completedRooms.includes(r))
    const description = !allRoomsDone
      ? `${remainingRooms.length} room(s) left for this chore`
      : updatedChore.streak && updatedChore.streak >= 3
        ? `${updatedChore.streak} day streak!`
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
  }, [currentHousehold, allChores, allCompletions, members, setChores, setCompletions])

  const handleSkipChore = useCallback((chore: Chore) => {
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
      streak: 0
    }

    setChores(allChores.map(c => c.id === chore.id ? updatedChore : c))
    toast.info('Chore skipped')
  }, [currentHousehold, allChores, allCompletions, setChores, setCompletions])

  const handleDeleteChore = useCallback((id: string) => {
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
  }, [allChores, allCompletions, setChores, setCompletions])

  // ---------------------------------------------------------------------------
  // Edit / Tracking helpers
  // ---------------------------------------------------------------------------

  const openEditDialog = useCallback((chore: Chore) => {
    setEditingChore(chore)
    const normalized = normalizeChore(chore)
    const dueDateTime = normalized.dueAt ? new Date(normalized.dueAt).toISOString().slice(0, 16) : ''
    const roomsList = getChoreRooms(normalized)
    setChoreForm({
      title: chore.title,
      description: chore.description || '',
      assignedTo: chore.assignedTo,
      frequency: chore.frequency,
      scheduleType: chore.scheduleType || 'fixed',
      customIntervalDays: chore.customIntervalDays || 7,
      room: chore.room || roomsList[0] || '',
      rooms: roomsList,
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
  }, [])

  const startTracking = useCallback((choreId: string) => {
    setTrackingChoreId(choreId)
    setTrackingStartTime(Date.now())
    toast.info('Timer started')
  }, [])

  const stopTracking = useCallback((chore: Chore) => {
    if (trackingStartTime) {
      setCompleteDialogChore(chore)
    }
  }, [trackingStartTime])

  const beginCompleteChore = useCallback((chore: Chore) => {
    const roomsList = getChoreRooms(chore)
    const remaining = roomsList.filter(r => !(chore.completedRooms || []).includes(r))

    if (roomsList.length > 1 && remaining.length > 0) {
      setRoomCompleteChore(chore)
      setRoomSelection(remaining)
      return
    }

    if (chore.trackTime) {
      setCompleteDialogChore(chore)
      return
    }

    handleCompleteChore(chore, undefined, undefined, undefined, remaining.length > 0 ? remaining : undefined)
  }, [handleCompleteChore])

  // ---------------------------------------------------------------------------
  // Quick-add helpers
  // ---------------------------------------------------------------------------

  const handleQuickChore = useCallback(() => {
    const titleError = validateRequired(quickChoreTitle, 'Chore title')
    if (titleError) {
      toast.error(titleError)
      return
    }
    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }

    const roomValue = quickChoreRoom === 'none' ? '' : quickChoreRoom
    const dueAt = startOfDay(addDays(new Date(), 1)).getTime()

    const newChore: Chore = normalizeChore({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      householdId: currentHousehold.id,
      title: quickChoreTitle.trim(),
      assignedTo: '',
      room: roomValue || undefined,
      rooms: roomValue ? [roomValue] : [],
      frequency: 'once',
      scheduleType: 'fixed',
      priority: 'medium',
      completed: false,
      createdAt: Date.now(),
      dueAt,
    } as Chore)

    setChores([...allChores, newChore])
    const savedTitle = quickChoreTitle.trim()
    setQuickChoreTitle('')
    setQuickChoreRoom('none')

    toast.success(`Chore "${savedTitle}" added`, {
      action: {
        label: 'Edit Details',
        onClick: () => {
          openEditDialog(newChore)
        }
      }
    })
  }, [quickChoreTitle, quickChoreRoom, currentHousehold, allChores, setChores, openEditDialog])

  const quickAddForRoom = useCallback((roomName: string) => {
    const title = (roomQuickAdd[roomName] || '').trim()
    const titleError = validateRequired(title, 'Chore title')
    if (titleError) {
      toast.error(titleError)
      return
    }
    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }
    const dueAt = startOfDay(addDays(new Date(), 1)).getTime()
    const newChore: Chore = normalizeChore({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      householdId: currentHousehold.id,
      title,
      assignedTo: '',
      room: roomName === 'Unassigned' ? undefined : roomName,
      frequency: 'once',
      scheduleType: 'fixed',
      customIntervalDays: undefined,
      completed: false,
      createdAt: Date.now(),
      dueAt,
      priority: 'medium'
    } as Chore)
    setChores([...allChores, newChore])
    setRoomQuickAdd(prev => ({ ...prev, [roomName]: '' }))
    toast.success(`Added to ${roomName}`)
  }, [roomQuickAdd, currentHousehold, allChores, setChores])

  // ---------------------------------------------------------------------------
  // Room management helpers
  // ---------------------------------------------------------------------------

  const handleSaveRoom = useCallback(() => {
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
  }, [newRoomName, roomEditIndex, setRooms])

  const handleDeleteRoom = useCallback((room: string) => {
    setRooms((current) => (current || []).filter(r => r !== room))
    if (filterRoom === room) setFilterRoom('all')
  }, [setRooms, filterRoom])

  // ---------------------------------------------------------------------------
  // Derived / computed data
  // ---------------------------------------------------------------------------

  const processedChores = useMemo(() => {
    let filtered = chores.filter(chore => {
      if (selectedMember !== 'all' && chore.assignedTo !== selectedMember) return false
      if (filterRoom !== 'all') {
        const roomsList = getChoreRooms(chore)
        if (!roomsList.includes(filterRoom)) return false
      }
      if (filterPriority !== 'all' && chore.priority !== filterPriority) return false
      return true
    })

    const withStatus: ChoreWithStatus[] = filtered.map(chore => {
      const normalized = normalizeChore(chore)
      const status = getChoreStatus(normalized)
      return { chore: normalized, status }
    })

    withStatus.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const order = { high: 0, medium: 1, low: 2 }
          return (order[a.chore.priority || 'medium'] || 1) - (order[b.chore.priority || 'medium'] || 1)
        }
        case 'dueDate': {
          if (a.status.isOverdue !== b.status.isOverdue) return a.status.isOverdue ? -1 : 1
          if (a.status.isDueToday !== b.status.isDueToday) return a.status.isDueToday ? -1 : 1
          const aDue = a.chore.dueAt || 0
          const bDue = b.chore.dueAt || 0
          return aDue - bDue
        }
        case 'room':
          return (getChoreRooms(a.chore)[0] || '').localeCompare(getChoreRooms(b.chore)[0] || '')
        default:
          return b.chore.createdAt - a.chore.createdAt
      }
    })

    return withStatus
  }, [chores, selectedMember, filterRoom, filterPriority, sortBy])

  const completedTodayChores = processedChores.filter(({ chore }) => !chore.completed && isCompletedForToday(chore))
  const pendingChores = processedChores.filter(({ chore }) => !chore.completed && !isCompletedForToday(chore))
  const completedChores = processedChores.filter(({ chore }) => chore.completed)
  const overdueChores = pendingChores.filter(({ status }) => status.isOverdue)
  const dueTodayChores = pendingChores.filter(({ status }) => status.isDueToday && !status.isOverdue)
  const dueSoonChores = pendingChores.filter(({ status }) => status.isDueSoon && !status.isOverdue && !status.isDueToday)
  const upcomingChores = pendingChores.filter(({ status }) => !status.isOverdue && !status.isDueToday && !status.isDueSoon)

  const stats = useMemo<{ totalCompleted: number; avgStreak: number; byMember: Record<string, number>; thisWeek: number }>(() => {
    const totalCompleted = chores.reduce((acc, c) => acc + (c.totalCompletions || 0), 0)
    const totalStreak = chores.reduce((acc, c) => acc + (c.streak || 0), 0)
    const avgStreak = chores.length > 0 ? Math.round(totalStreak / chores.length) : 0

    const byMember: Record<string, number> = {}
    completions.forEach(c => {
      byMember[c.completedBy] = (byMember[c.completedBy] || 0) + 1
    })

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const thisWeek = completions.filter(c => c.completedAt > weekAgo && !c.skipped).length

    return { totalCompleted, avgStreak, byMember, thisWeek }
  }, [chores, completions])

  const roomSections = useMemo(() => {
    const names = new Set<string>()
    ;(rooms || []).forEach(r => names.add(r))
    chores.forEach(c => {
      const list = getChoreRooms(c)
      if (list.length === 0) {
        names.add('Unassigned')
      } else {
        list.forEach(r => names.add(r))
      }
    })

    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b))
    return sorted.map(room => {
      const pending = pendingChores.filter(({ chore }) => {
        const list = getChoreRooms(chore)
        return (list.length === 0 ? 'Unassigned' : list).includes(room)
      })
      const total = processedChores.filter(({ chore }) => {
        const list = getChoreRooms(chore)
        return (list.length === 0 ? 'Unassigned' : list).includes(room)
      })
      return { room, pending, total }
    })
  }, [rooms, chores, pendingChores, processedChores])

  const hasActiveFilters = filterRoom !== 'all' || filterPriority !== 'all'

  const describeDue = useCallback((status: ReturnType<typeof getChoreStatus>, dueAt?: number) => {
    if (status.isOverdue) return 'Overdue'
    if (status.isDueToday) return 'Due today'
    if (dueAt) return `Due ${formatDistanceToNow(dueAt, { addSuffix: true })}`
    return 'No due date'
  }, [])

  const handleDuplicateChore = useCallback((chore: Chore, room: string) => {
    const newChore: Chore = {
      ...chore,
      id: Date.now().toString(),
      room,
      rooms: [room],
      createdAt: Date.now(),
      completed: false,
      lastCompletedAt: undefined,
      lastCompletedBy: undefined
    }
    setChores([...allChores, normalizeChore(newChore)])
    toast.success(`Duplicated to ${room}`)
  }, [allChores, setChores])

  // ---------------------------------------------------------------------------
  // AI batch helpers
  // ---------------------------------------------------------------------------

  const addChoresBatch = useCallback((newChores: Chore[]) => {
    if (newChores.length === 0) return
    const normalized = newChores.map(c => normalizeChore(c))
    setChores([...allChores, ...normalized])
    toast.success(`Added ${newChores.length} chore${newChores.length === 1 ? '' : 's'}`)
  }, [allChores, setChores])

  const updateChoreAssignments = useCallback((updates: Array<{ choreId: string; assignedTo: string }>) => {
    if (updates.length === 0) return
    const updateMap = new Map(updates.map(u => [u.choreId, u.assignedTo]))
    const updated = allChores.map(c => {
      const newAssignee = updateMap.get(c.id)
      if (newAssignee !== undefined) {
        return normalizeChore({ ...c, assignedTo: newAssignee })
      }
      return c
    })
    setChores(updated)
    toast.success(`Reassigned ${updates.length} chore${updates.length === 1 ? '' : 's'}`)
  }, [allChores, setChores])

  const updateChoreFrequencies = useCallback((updates: Array<{ choreId: string; frequency: ChoreFrequency; customIntervalDays?: number }>) => {
    if (updates.length === 0) return
    const updateMap = new Map(updates.map(u => [u.choreId, u]))
    const updated = allChores.map(c => {
      const upd = updateMap.get(c.id)
      if (upd) {
        return normalizeChore({
          ...c,
          frequency: upd.frequency,
          customIntervalDays: upd.customIntervalDays ?? c.customIntervalDays,
        })
      }
      return c
    })
    setChores(updated)
    toast.success(`Updated schedule for ${updates.length} chore${updates.length === 1 ? '' : 's'}`)
  }, [allChores, setChores])

  // ---------------------------------------------------------------------------
  // Return value
  // ---------------------------------------------------------------------------

  return {
    // Raw data
    chores,
    completions,
    members,
    rooms: rooms || [],
    allChores,
    allCompletions,
    currentHousehold,

    // Processed lists
    processedChores,
    pendingChores,
    completedChores,
    completedTodayChores,
    overdueChores,
    dueTodayChores,
    dueSoonChores,
    upcomingChores,
    stats,
    roomSections,
    hasActiveFilters,
    selectedMember,

    // UI state + setters
    dialogOpen, setDialogOpen,
    editingChore, setEditingChore,
    showStats, setShowStats,
    trackingChoreId,
    trackingStartTime,
    completeDialogChore, setCompleteDialogChore,
    roomCompleteChore, setRoomCompleteChore,
    roomSelection, setRoomSelection,
    detailChore, setDetailChore,
    manageRoomsOpen, setManageRoomsOpen,
    newRoomName, setNewRoomName,
    roomEditIndex, setRoomEditIndex,
    roomQuickAdd, setRoomQuickAdd,

    // Filters
    filterRoom, setFilterRoom,
    filterPriority, setFilterPriority,
    sortBy, setSortBy,
    quickChoreTitle, setQuickChoreTitle,
    quickChoreRoom, setQuickChoreRoom,

    // Form
    choreForm, setChoreForm,
    resetForm,
    toggleDayOfWeek,

    // Handlers
    handleSaveChore,
    handleCompleteChore,
    handleSkipChore,
    handleDeleteChore,
    openEditDialog,
    startTracking,
    stopTracking,
    beginCompleteChore,
    handleQuickChore,
    quickAddForRoom,
    handleSaveRoom,
    handleDeleteRoom,
    handleDuplicateChore,
    setRooms,

    // AI batch helpers
    addChoresBatch,
    updateChoreAssignments,
    updateChoreFrequencies,

    // Utilities
    describeDue,
  }
}
