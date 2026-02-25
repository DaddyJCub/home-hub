import { useState, useMemo, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import type { PersonalTask, TaskPriority } from '@/lib/types'
import { toast } from 'sonner'
import { useAuth } from '@/lib/AuthContext'
import { startOfDay, endOfDay, addDays } from 'date-fns'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const taskPriorityConfig = {
  high: { color: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-500/10', border: 'border-red-300', label: 'High' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-300', label: 'Medium' },
  low: { color: 'bg-green-500', text: 'text-green-700 dark:text-green-300', bg: 'bg-green-500/10', border: 'border-green-300', label: 'Low' },
}

// ---------------------------------------------------------------------------
// Form State
// ---------------------------------------------------------------------------

export interface TaskFormState {
  title: string
  description: string
  priority: TaskPriority
  dueDate: string
  category: string
  notes: string
}

const EMPTY_FORM: TaskFormState = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
  category: '',
  notes: '',
}

// ---------------------------------------------------------------------------
// Task Status
// ---------------------------------------------------------------------------

export interface TaskStatus {
  isOverdue: boolean
  isDueToday: boolean
  isDueSoon: boolean // within 3 days
  daysOverdue: number
}

export function getTaskStatus(task: PersonalTask): TaskStatus {
  if (task.completed || !task.dueAt) {
    return { isOverdue: false, isDueToday: false, isDueSoon: false, daysOverdue: 0 }
  }

  const now = Date.now()
  const todayStart = startOfDay(now).getTime()
  const todayEnd = endOfDay(now).getTime()
  const soonEnd = addDays(todayEnd, 3).getTime()

  const isOverdue = task.dueAt < todayStart
  const isDueToday = task.dueAt >= todayStart && task.dueAt <= todayEnd
  const isDueSoon = !isDueToday && task.dueAt > todayEnd && task.dueAt <= soonEnd
  const daysOverdue = isOverdue ? Math.ceil((todayStart - task.dueAt) / (1000 * 60 * 60 * 24)) : 0

  return { isOverdue, isDueToday, isDueSoon, daysOverdue }
}

export type TaskWithStatus = {
  task: PersonalTask
  status: TaskStatus
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTasks() {
  const { currentUser } = useAuth()
  const [tasksRaw, setTasks] = useKV<PersonalTask[]>('personal-tasks', [])

  const tasks = useMemo(() => {
    const all = tasksRaw ?? []
    // Only show tasks for the current user (extra safety, since user-scoped)
    return currentUser ? all.filter(t => t.userId === currentUser.id) : all
  }, [tasksRaw, currentUser])

  // UI State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null)
  const [detailTask, setDetailTask] = useState<PersonalTask | null>(null)
  const [taskForm, setTaskForm] = useState<TaskFormState>({ ...EMPTY_FORM })
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created' | 'category'>('dueDate')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [quickTaskTitle, setQuickTaskTitle] = useState('')

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const categories = useMemo(() => {
    const cats = new Set<string>()
    tasks.forEach(t => { if (t.category) cats.add(t.category) })
    return Array.from(cats).sort()
  }, [tasks])

  const processedTasks: TaskWithStatus[] = useMemo(() => {
    let filtered = tasks.filter(t => !t.completed)

    // Filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority)
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'dueDate': {
          if (!a.dueAt && !b.dueAt) return 0
          if (!a.dueAt) return 1
          if (!b.dueAt) return -1
          return a.dueAt - b.dueAt
        }
        case 'priority': {
          const order = { high: 0, medium: 1, low: 2 }
          return order[a.priority] - order[b.priority]
        }
        case 'created':
          return b.createdAt - a.createdAt
        case 'category':
          return (a.category || '').localeCompare(b.category || '')
        default:
          return 0
      }
    })

    return sorted.map(task => ({ task, status: getTaskStatus(task) }))
  }, [tasks, sortBy, filterPriority, filterCategory])

  const pendingTasks = useMemo(() => processedTasks.filter(t => !t.task.completed), [processedTasks])
  const overdueTasks = useMemo(() => processedTasks.filter(t => t.status.isOverdue), [processedTasks])
  const dueTodayTasks = useMemo(() => processedTasks.filter(t => t.status.isDueToday), [processedTasks])
  const dueSoonTasks = useMemo(() => processedTasks.filter(t => t.status.isDueSoon), [processedTasks])
  const upcomingTasks = useMemo(() =>
    processedTasks.filter(t => !t.status.isOverdue && !t.status.isDueToday && !t.status.isDueSoon),
    [processedTasks]
  )
  const completedTasks = useMemo(() =>
    tasks.filter(t => t.completed).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [tasks]
  )

  const hasActiveFilters = filterPriority !== 'all' || filterCategory !== 'all'

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setTaskForm({ ...EMPTY_FORM })
    setEditingTask(null)
  }, [])

  const addTask = useCallback((task: Omit<PersonalTask, 'id' | 'userId' | 'createdAt' | 'completed'>) => {
    if (!currentUser) return
    const newTask: PersonalTask = {
      ...task,
      id: Date.now().toString(),
      userId: currentUser.id,
      createdAt: Date.now(),
      completed: false,
    }
    setTasks([...(tasksRaw ?? []), newTask])
    toast.success('Task added')
  }, [currentUser, tasksRaw, setTasks])

  const updateTask = useCallback((id: string, updates: Partial<PersonalTask>) => {
    setTasks((tasksRaw ?? []).map(t => t.id === id ? { ...t, ...updates } : t))
    toast.success('Task updated')
  }, [tasksRaw, setTasks])

  const deleteTask = useCallback((id: string) => {
    setTasks((tasksRaw ?? []).filter(t => t.id !== id))
    toast.success('Task deleted')
  }, [tasksRaw, setTasks])

  const toggleComplete = useCallback((id: string) => {
    const task = (tasksRaw ?? []).find(t => t.id === id)
    if (!task) return
    const completed = !task.completed
    setTasks((tasksRaw ?? []).map(t =>
      t.id === id
        ? { ...t, completed, completedAt: completed ? Date.now() : undefined }
        : t
    ))
    toast.success(completed ? 'Task completed!' : 'Task reopened')
  }, [tasksRaw, setTasks])

  const handleSaveTask = useCallback(() => {
    if (!taskForm.title.trim()) {
      toast.error('Task title is required')
      return
    }
    if (!currentUser) return

    const dueAt = taskForm.dueDate ? new Date(taskForm.dueDate).getTime() : undefined

    if (editingTask) {
      updateTask(editingTask.id, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        priority: taskForm.priority,
        dueAt,
        category: taskForm.category.trim() || undefined,
        notes: taskForm.notes.trim() || undefined,
      })
    } else {
      addTask({
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        priority: taskForm.priority,
        dueAt,
        category: taskForm.category.trim() || undefined,
        notes: taskForm.notes.trim() || undefined,
      })
    }

    setDialogOpen(false)
    resetForm()
  }, [taskForm, editingTask, currentUser, addTask, updateTask, resetForm])

  const openEditDialog = useCallback((task: PersonalTask) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '',
      category: task.category || '',
      notes: task.notes || '',
    })
    setDialogOpen(true)
  }, [])

  const handleQuickTask = useCallback(() => {
    const title = quickTaskTitle.trim()
    if (!title) return
    addTask({ title, priority: 'medium' })
    setQuickTaskTitle('')
  }, [quickTaskTitle, addTask])

  return {
    tasks,
    processedTasks,
    pendingTasks,
    overdueTasks,
    dueTodayTasks,
    dueSoonTasks,
    upcomingTasks,
    completedTasks,
    categories,
    hasActiveFilters,

    // UI State
    dialogOpen, setDialogOpen,
    editingTask, setEditingTask,
    detailTask, setDetailTask,
    taskForm, setTaskForm,
    sortBy, setSortBy,
    filterPriority, setFilterPriority,
    filterCategory, setFilterCategory,
    quickTaskTitle, setQuickTaskTitle,

    // Actions
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    handleSaveTask,
    openEditDialog,
    handleQuickTask,
    resetForm,
  }
}
