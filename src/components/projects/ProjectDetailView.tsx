import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Pencil, Trash, CalendarBlank, CurrencyDollar,
  Plus, X, TextAlignLeft, Tag, Clock, ArrowRight, Check
} from '@phosphor-icons/react'
import { useState } from 'react'
import type { HomeProject } from '@/lib/types'
import { projectPriorityConfig, statusConfig, PROJECT_STATUSES } from '@/hooks/use-projects'
import { format, formatDistanceToNow } from 'date-fns'

interface ProjectDetailViewProps {
  project: HomeProject
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  onMoveToStatus: (status: HomeProject['status']) => void
  onToggleChecklistItem: (itemId: string) => void
  onAddChecklistItem: (text: string) => void
  onRemoveChecklistItem: (itemId: string) => void
  onUpdateActualCost: (cost: number) => void
}

export default function ProjectDetailView({
  project,
  onEdit,
  onDelete,
  onClose,
  onMoveToStatus,
  onToggleChecklistItem,
  onAddChecklistItem,
  onRemoveChecklistItem,
  onUpdateActualCost,
}: ProjectDetailViewProps) {
  const priorityCfg = projectPriorityConfig[project.priority]
  const status = statusConfig[project.status]
  const checklistTotal = project.checklist?.length ?? 0
  const checklistDone = project.checklist?.filter(c => c.completed).length ?? 0
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0

  const [newItem, setNewItem] = useState('')
  const [editingCost, setEditingCost] = useState(false)
  const [actualCostInput, setActualCostInput] = useState(project.actualCost?.toString() || '')

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 pr-8">
          <span className={`w-3 h-3 rounded-full ${priorityCfg.color}`} />
          <span className={project.status === 'done' ? 'line-through text-muted-foreground' : ''}>
            {project.title}
          </span>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Status & priority badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={status.text}>
            <span className={`w-2 h-2 rounded-full ${status.color} mr-1`} />
            {PROJECT_STATUSES.find(s => s.value === project.status)?.label}
          </Badge>
          <Badge variant="outline" className={priorityCfg.text}>
            {priorityCfg.label} Priority
          </Badge>
          {project.tags?.map(tag => (
            <Badge key={tag} variant="secondary">
              <Tag size={10} className="mr-1" />
              {tag}
            </Badge>
          ))}
        </div>

        {/* Move to status */}
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_STATUSES.filter(s => s.value !== project.status).map(s => (
            <Button
              key={s.value}
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onMoveToStatus(s.value)}
            >
              <ArrowRight size={12} />
              {s.label}
            </Button>
          ))}
        </div>

        {/* Description */}
        {project.description && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <TextAlignLeft size={12} />
              Description
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{project.description}</p>
          </div>
        )}

        <Separator />

        {/* Dates & Cost */}
        <div className="space-y-2 text-sm">
          {project.targetDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarBlank size={14} />
              <span>Target: {format(project.targetDate, 'PPP')}</span>
              <span className="text-xs">
                ({formatDistanceToNow(project.targetDate, { addSuffix: true })})
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock size={14} />
            <span>Added: {format(project.createdAt, 'PPP')}</span>
          </div>
          {project.completedAt && (
            <div className="flex items-center gap-2 text-green-600">
              <Check size={14} />
              <span>Completed: {format(project.completedAt, 'PPP')}</span>
            </div>
          )}

          {/* Cost tracking */}
          {(project.estimatedCost != null || project.actualCost != null) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CurrencyDollar size={14} />
              <span>
                Est.: ${(project.estimatedCost ?? 0).toLocaleString()}
                {project.actualCost != null && (
                  <> &bull; Actual: ${project.actualCost.toLocaleString()}</>
                )}
              </span>
              {!editingCost && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => { setEditingCost(true); setActualCostInput(project.actualCost?.toString() || '') }}
                >
                  {project.actualCost != null ? 'Update' : 'Add actual'}
                </Button>
              )}
            </div>
          )}
          {editingCost && (
            <div className="flex gap-2 items-center ml-5">
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="Actual cost"
                value={actualCostInput}
                onChange={(e) => setActualCostInput(e.target.value)}
                className="h-8 w-32"
              />
              <Button
                size="sm"
                className="h-8"
                onClick={() => {
                  const cost = parseFloat(actualCostInput)
                  if (!isNaN(cost)) onUpdateActualCost(cost)
                  setEditingCost(false)
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingCost(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Checklist */}
        {(checklistTotal > 0 || project.status !== 'done') && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Checklist ({checklistDone}/{checklistTotal})
                </span>
                {checklistTotal > 0 && (
                  <span className="text-xs text-muted-foreground">{checklistPercent}%</span>
                )}
              </div>
              {checklistTotal > 0 && <Progress value={checklistPercent} className="h-2" />}
              <div className="space-y-1.5">
                {project.checklist?.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm group">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => onToggleChecklistItem(item.id)}
                    />
                    <span className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveChecklistItem(item.id)}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
              {/* Add new item */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add step..."
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newItem.trim()) { onAddChecklistItem(newItem.trim()); setNewItem('') }
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    if (newItem.trim()) { onAddChecklistItem(newItem.trim()); setNewItem('') }
                  }}
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {project.notes && (
          <>
            <Separator />
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => { onEdit(); onClose() }}>
            <Pencil size={14} className="mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => { onDelete(); onClose() }}>
            <Trash size={14} className="mr-1" /> Delete
          </Button>
        </div>
      </div>
    </>
  )
}
