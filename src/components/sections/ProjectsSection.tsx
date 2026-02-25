import { useState } from 'react'
import {
  HardHat, Plus, Funnel, ListBullets, Kanban,
  CurrencyDollar, Sparkle, CaretDown, CaretUp, CheckCircle
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

import { useProjects, PROJECT_STATUSES, projectPriorityConfig } from '@/hooks/use-projects'
import ProjectCard from '@/components/projects/ProjectCard'
import ProjectFormDialog from '@/components/projects/ProjectFormDialog'
import ProjectDetailView from '@/components/projects/ProjectDetailView'
import ProjectBoardView from '@/components/projects/ProjectBoardView'
import EmptyState from '@/components/EmptyState'

export default function ProjectsSection() {
  const {
    projects,
    allProjects,
    projectsByStatus,
    stats,
    hasActiveFilters,

    viewMode, setViewMode,

    dialogOpen, setDialogOpen,
    editingProject,
    detailProject, setDetailProject,
    projectForm, setProjectForm,
    sortBy, setSortBy,
    filterStatus, setFilterStatus,
    filterPriority, setFilterPriority,

    deleteProject,
    moveToStatus,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    updateProject,
    handleSaveProject,
    openEditDialog,
    resetForm,
  } = useProjects()

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const doneProjects = allProjects.filter(p => p.status === 'done')

  return (
    <div className="space-y-4 pb-20">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2">
            <HardHat className="text-primary" />
            Home Projects
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {stats.total} project{stats.total !== 1 ? 's' : ''}
            {stats.inProgress > 0 && (
              <> &bull; <span className="text-yellow-600">{stats.inProgress} in progress</span></>
            )}
            {stats.done > 0 && (
              <> &bull; <span className="text-green-600">{stats.done} done</span></>
            )}
          </p>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-none gap-1 px-2.5"
              onClick={() => setViewMode('list')}
            >
              <ListBullets size={16} />
              <span className="hidden sm:inline text-xs">List</span>
            </Button>
            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-none gap-1 px-2.5"
              onClick={() => setViewMode('board')}
            >
              <Kanban size={16} />
              <span className="hidden sm:inline text-xs">Board</span>
            </Button>
          </div>

          {/* Filter toggle */}
          <Button
            variant={filtersOpen ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Funnel size={16} />
            {hasActiveFilters && !filtersOpen && (
              <Badge variant="secondary" className="px-1 py-0 text-[10px]">On</Badge>
            )}
          </Button>

          {/* Add Project */}
          <Button size="sm" className="h-8 gap-1" onClick={() => setDialogOpen(true)}>
            <Plus size={16} />
            <span className="hidden sm:inline">New Project</span>
          </Button>
        </div>
      </div>

      {/* ── Stats cards ────────────────────────────────────────────────────── */}
      {allProjects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.total - stats.done}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.done}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">
                {stats.totalEstimated > 0 ? `$${stats.totalEstimated.toLocaleString()}` : '--'}
              </p>
              <p className="text-xs text-muted-foreground">Est. Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent className="space-y-3 rounded-lg border bg-card p-3">
          {/* Sort */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Sort</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="date">Target Date</SelectItem>
                  <SelectItem value="cost">Cost</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="manual">Manual Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status pills */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'active' as const, label: 'Active' },
                { value: 'all' as const, label: 'All' },
                ...PROJECT_STATUSES.map(s => ({ value: s.value, label: s.label })),
              ].map(({ value, label }) => (
                <button
                  key={value}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterStatus === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setFilterStatus(value as typeof filterStatus)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority pills */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Priority</span>
            <div className="flex flex-wrap gap-1.5">
              {([
                { value: 'all', label: 'All', activeClass: 'bg-primary text-primary-foreground' },
                { value: 'urgent', label: 'Urgent', activeClass: 'bg-red-600 text-white' },
                { value: 'high', label: 'High', activeClass: 'bg-red-500 text-white' },
                { value: 'medium', label: 'Med', activeClass: 'bg-yellow-500 text-white' },
                { value: 'low', label: 'Low', activeClass: 'bg-green-500 text-white' },
              ] as const).map(({ value, label, activeClass }) => (
                <button
                  key={value}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterPriority === value ? activeClass : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setFilterPriority(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Board View ─────────────────────────────────────────────────────── */}
      {viewMode === 'board' && (
        <ProjectBoardView
          projectsByStatus={projectsByStatus}
          onEditProject={openEditDialog}
          onDeleteProject={deleteProject}
          onViewProject={setDetailProject}
          onMoveToStatus={(id, status) => moveToStatus(id, status)}
        />
      )}

      {/* ── List View ───────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => openEditDialog(project)}
              onDelete={() => deleteProject(project.id)}
              onClick={() => setDetailProject(project)}
              onMoveToStatus={(status) => moveToStatus(project.id, status)}
            />
          ))}

          {/* Show done toggle (when filtered to active) */}
          {filterStatus === 'active' && doneProjects.length > 0 && (
            <>
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setShowDone(!showDone)}
              >
                {showDone ? <CaretUp size={14} /> : <CaretDown size={14} />}
                <CheckCircle size={14} className="text-green-500" />
                <span>Completed ({doneProjects.length})</span>
              </button>
              {showDone && (
                <div className="space-y-2">
                  {doneProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={() => openEditDialog(project)}
                      onDelete={() => deleteProject(project.id)}
                      onClick={() => setDetailProject(project)}
                      onMoveToStatus={(status) => moveToStatus(project.id, status)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {allProjects.length === 0 && (
        <EmptyState
          icon={HardHat}
          title="No projects yet"
          description="Plan and prioritize home improvements — from wish list to done."
          action={{ label: "Add First Project", onClick: () => setDialogOpen(true) }}
        />
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      {/* Add / Edit project dialog */}
      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        editingProject={editingProject}
        onSave={handleSaveProject}
        onReset={resetForm}
      />

      {/* Project detail dialog */}
      <Dialog open={!!detailProject} onOpenChange={() => setDetailProject(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailProject && (
            <ProjectDetailView
              project={detailProject}
              onEdit={() => openEditDialog(detailProject)}
              onDelete={() => { deleteProject(detailProject.id); setDetailProject(null) }}
              onClose={() => setDetailProject(null)}
              onMoveToStatus={(status) => {
                moveToStatus(detailProject.id, status)
                setDetailProject({ ...detailProject, status, completedAt: status === 'done' ? Date.now() : undefined })
              }}
              onToggleChecklistItem={(itemId) => {
                toggleChecklistItem(detailProject.id, itemId)
                setDetailProject({
                  ...detailProject,
                  checklist: detailProject.checklist.map(c =>
                    c.id === itemId ? { ...c, completed: !c.completed } : c
                  ),
                })
              }}
              onAddChecklistItem={(text) => {
                addChecklistItem(detailProject.id, text)
                setDetailProject({
                  ...detailProject,
                  checklist: [...detailProject.checklist, { id: Date.now().toString(), text, completed: false }],
                })
              }}
              onRemoveChecklistItem={(itemId) => {
                removeChecklistItem(detailProject.id, itemId)
                setDetailProject({
                  ...detailProject,
                  checklist: detailProject.checklist.filter(c => c.id !== itemId),
                })
              }}
              onUpdateActualCost={(cost) => {
                updateProject(detailProject.id, { actualCost: cost })
                setDetailProject({ ...detailProject, actualCost: cost })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
