import { useState, useMemo, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import type { HomeProject, ProjectStatus, ProjectPriority, ProjectChecklistItem } from '@/lib/types'
import { toast } from 'sonner'
import { useAuth } from '@/lib/AuthContext'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'wishlist', label: 'Wishlist', color: 'bg-purple-500' },
  { value: 'planning', label: 'Planning', color: 'bg-blue-500' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'on-hold', label: 'On Hold', color: 'bg-gray-400' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
]

export const projectPriorityConfig = {
  urgent: { color: 'bg-red-600', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-500/10', label: 'Urgent', order: 0 },
  high: { color: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-500/10', label: 'High', order: 1 },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-500/10', label: 'Medium', order: 2 },
  low: { color: 'bg-green-500', text: 'text-green-700 dark:text-green-300', bg: 'bg-green-500/10', label: 'Low', order: 3 },
}

export const statusConfig: Record<ProjectStatus, { color: string; bg: string; text: string }> = {
  wishlist: { color: 'bg-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-300' },
  planning: { color: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300' },
  'in-progress': { color: 'bg-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-300' },
  'on-hold': { color: 'bg-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-600 dark:text-gray-400' },
  done: { color: 'bg-green-500', bg: 'bg-green-500/10', text: 'text-green-700 dark:text-green-300' },
}

// ---------------------------------------------------------------------------
// Form State
// ---------------------------------------------------------------------------

export interface ProjectFormState {
  title: string
  description: string
  status: ProjectStatus
  priority: ProjectPriority
  estimatedCost: string
  targetDate: string
  notes: string
  tags: string
  checklist: ProjectChecklistItem[]
}

const EMPTY_FORM: ProjectFormState = {
  title: '',
  description: '',
  status: 'wishlist',
  priority: 'medium',
  estimatedCost: '',
  targetDate: '',
  notes: '',
  tags: '',
  checklist: [],
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProjects() {
  const { currentUser, currentHousehold } = useAuth()
  const [projectsRaw, setProjects] = useKV<HomeProject[]>('home-projects', [])
  const [viewMode, setViewMode] = useKV<'list' | 'board'>('projects-view-mode', 'list')

  const projects = useMemo(() => {
    const all = projectsRaw ?? []
    return currentHousehold ? all.filter(p => p.householdId === currentHousehold.id) : []
  }, [projectsRaw, currentHousehold])

  // UI State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<HomeProject | null>(null)
  const [detailProject, setDetailProject] = useState<HomeProject | null>(null)
  const [projectForm, setProjectForm] = useState<ProjectFormState>({ ...EMPTY_FORM })
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'cost' | 'manual' | 'status'>('priority')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all' | 'active'>('active')
  const [filterPriority, setFilterPriority] = useState<ProjectPriority | 'all'>('all')

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const filteredProjects = useMemo(() => {
    let filtered = [...projects]

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(p => p.status !== 'done')
    } else if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus)
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(p => p.priority === filterPriority)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return projectPriorityConfig[a.priority].order - projectPriorityConfig[b.priority].order
        case 'date':
          return (a.targetDate ?? Infinity) - (b.targetDate ?? Infinity)
        case 'cost':
          return (a.estimatedCost ?? 0) - (b.estimatedCost ?? 0)
        case 'status': {
          const statusOrder: Record<ProjectStatus, number> = { wishlist: 0, planning: 1, 'in-progress': 2, 'on-hold': 3, done: 4 }
          return statusOrder[a.status] - statusOrder[b.status]
        }
        case 'manual':
          return a.sortOrder - b.sortOrder
        default:
          return 0
      }
    })

    return filtered
  }, [projects, filterStatus, filterPriority, sortBy])

  // Group by status for kanban board
  const projectsByStatus = useMemo(() => {
    const groups: Record<ProjectStatus, HomeProject[]> = {
      wishlist: [],
      planning: [],
      'in-progress': [],
      'on-hold': [],
      done: [],
    }
    projects.forEach(p => {
      groups[p.status].push(p)
    })
    // Sort within each group by priority
    Object.keys(groups).forEach(status => {
      groups[status as ProjectStatus].sort((a, b) =>
        projectPriorityConfig[a.priority].order - projectPriorityConfig[b.priority].order
      )
    })
    return groups
  }, [projects])

  const tags = useMemo(() => {
    const allTags = new Set<string>()
    projects.forEach(p => p.tags?.forEach(t => allTags.add(t)))
    return Array.from(allTags).sort()
  }, [projects])

  const stats = useMemo(() => {
    const total = projects.length
    const done = projects.filter(p => p.status === 'done').length
    const inProgress = projects.filter(p => p.status === 'in-progress').length
    const totalEstimated = projects.reduce((sum, p) => sum + (p.estimatedCost ?? 0), 0)
    const totalActual = projects.filter(p => p.status === 'done').reduce((sum, p) => sum + (p.actualCost ?? 0), 0)
    return { total, done, inProgress, totalEstimated, totalActual }
  }, [projects])

  const hasActiveFilters = filterStatus !== 'active' || filterPriority !== 'all'

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setProjectForm({ ...EMPTY_FORM })
    setEditingProject(null)
  }, [])

  const addProject = useCallback((data: Omit<HomeProject, 'id' | 'householdId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => {
    if (!currentUser || !currentHousehold) return
    const newProject: HomeProject = {
      ...data,
      id: Date.now().toString(),
      householdId: currentHousehold.id,
      createdBy: currentUser.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sortOrder: (projectsRaw ?? []).length,
    }
    setProjects([...(projectsRaw ?? []), newProject])
    toast.success('Project added')
  }, [currentUser, currentHousehold, projectsRaw, setProjects])

  const updateProject = useCallback((id: string, updates: Partial<HomeProject>) => {
    setProjects((projectsRaw ?? []).map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    ))
    toast.success('Project updated')
  }, [projectsRaw, setProjects])

  const deleteProject = useCallback((id: string) => {
    setProjects((projectsRaw ?? []).filter(p => p.id !== id))
    toast.success('Project deleted')
  }, [projectsRaw, setProjects])

  const moveToStatus = useCallback((id: string, newStatus: ProjectStatus) => {
    const updates: Partial<HomeProject> = {
      status: newStatus,
      updatedAt: Date.now(),
    }
    if (newStatus === 'done') {
      updates.completedAt = Date.now()
    } else {
      updates.completedAt = undefined
    }
    setProjects((projectsRaw ?? []).map(p =>
      p.id === id ? { ...p, ...updates } : p
    ))
    const statusLabel = PROJECT_STATUSES.find(s => s.value === newStatus)?.label ?? newStatus
    toast.success(`Moved to ${statusLabel}`)
  }, [projectsRaw, setProjects])

  // Checklist management
  const toggleChecklistItem = useCallback((projectId: string, itemId: string) => {
    setProjects((projectsRaw ?? []).map(p => {
      if (p.id !== projectId) return p
      return {
        ...p,
        updatedAt: Date.now(),
        checklist: p.checklist.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      }
    }))
  }, [projectsRaw, setProjects])

  const addChecklistItem = useCallback((projectId: string, text: string) => {
    const item: ProjectChecklistItem = {
      id: Date.now().toString(),
      text,
      completed: false,
    }
    setProjects((projectsRaw ?? []).map(p => {
      if (p.id !== projectId) return p
      return {
        ...p,
        updatedAt: Date.now(),
        checklist: [...p.checklist, item],
      }
    }))
  }, [projectsRaw, setProjects])

  const removeChecklistItem = useCallback((projectId: string, itemId: string) => {
    setProjects((projectsRaw ?? []).map(p => {
      if (p.id !== projectId) return p
      return {
        ...p,
        updatedAt: Date.now(),
        checklist: p.checklist.filter(item => item.id !== itemId),
      }
    }))
  }, [projectsRaw, setProjects])

  // Reorder for drag-and-drop
  const reorderProjects = useCallback((orderedIds: string[]) => {
    setProjects((projectsRaw ?? []).map(p => {
      const idx = orderedIds.indexOf(p.id)
      return idx >= 0 ? { ...p, sortOrder: idx } : p
    }))
  }, [projectsRaw, setProjects])

  const handleSaveProject = useCallback(() => {
    if (!projectForm.title.trim()) {
      toast.error('Project title is required')
      return
    }
    if (!currentUser || !currentHousehold) return

    const targetDate = projectForm.targetDate ? new Date(projectForm.targetDate).getTime() : undefined
    const estimatedCost = projectForm.estimatedCost ? parseFloat(projectForm.estimatedCost) : undefined
    const tags = projectForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    if (editingProject) {
      updateProject(editingProject.id, {
        title: projectForm.title.trim(),
        description: projectForm.description.trim() || undefined,
        status: projectForm.status,
        priority: projectForm.priority,
        estimatedCost,
        targetDate,
        notes: projectForm.notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        checklist: projectForm.checklist,
      })
    } else {
      addProject({
        title: projectForm.title.trim(),
        description: projectForm.description.trim() || undefined,
        status: projectForm.status,
        priority: projectForm.priority,
        estimatedCost,
        targetDate,
        notes: projectForm.notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        checklist: projectForm.checklist,
      })
    }

    setDialogOpen(false)
    resetForm()
  }, [projectForm, editingProject, currentUser, currentHousehold, addProject, updateProject, resetForm])

  const openEditDialog = useCallback((project: HomeProject) => {
    setEditingProject(project)
    setProjectForm({
      title: project.title,
      description: project.description || '',
      status: project.status,
      priority: project.priority,
      estimatedCost: project.estimatedCost?.toString() || '',
      targetDate: project.targetDate ? new Date(project.targetDate).toISOString().slice(0, 10) : '',
      notes: project.notes || '',
      tags: project.tags?.join(', ') || '',
      checklist: project.checklist || [],
    })
    setDialogOpen(true)
  }, [])

  return {
    projects: filteredProjects,
    allProjects: projects,
    projectsByStatus,
    tags,
    stats,
    hasActiveFilters,

    // View mode
    viewMode: viewMode ?? 'list',
    setViewMode,

    // UI State
    dialogOpen, setDialogOpen,
    editingProject, setEditingProject,
    detailProject, setDetailProject,
    projectForm, setProjectForm,
    sortBy, setSortBy,
    filterStatus, setFilterStatus,
    filterPriority, setFilterPriority,

    // Actions
    addProject,
    updateProject,
    deleteProject,
    moveToStatus,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    reorderProjects,
    handleSaveProject,
    openEditDialog,
    resetForm,
  }
}
