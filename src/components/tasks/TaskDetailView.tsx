import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Check, Clock, Warning, Pencil, Trash, CalendarBlank, Tag, TextAlignLeft
} from '@phosphor-icons/react'
import type { PersonalTask } from '@/lib/types'
import { format, formatDistanceToNow } from 'date-fns'
import { taskPriorityConfig, getTaskStatus } from '@/hooks/use-tasks'

interface TaskDetailViewProps {
  task: PersonalTask
  onComplete: () => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export default function TaskDetailView({
  task,
  onComplete,
  onEdit,
  onDelete,
  onClose,
}: TaskDetailViewProps) {
  const status = getTaskStatus(task)
  const priorityCfg = taskPriorityConfig[task.priority]

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 pr-8">
          <span className={`w-3 h-3 rounded-full ${priorityCfg.color}`} />
          <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
            {task.title}
          </span>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={task.completed ? 'default' : 'secondary'} className={task.completed ? 'bg-green-500' : ''}>
            {task.completed ? 'Completed' : 'Pending'}
          </Badge>
          <Badge variant="outline" className={priorityCfg.text}>
            {priorityCfg.label} Priority
          </Badge>
          {task.category && (
            <Badge variant="secondary">
              <Tag size={10} className="mr-1" />
              {task.category}
            </Badge>
          )}
          {status.isOverdue && (
            <Badge variant="destructive">
              <Warning size={10} className="mr-1" />
              {status.daysOverdue}d overdue
            </Badge>
          )}
          {status.isDueToday && (
            <Badge className="bg-primary">Due Today</Badge>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <TextAlignLeft size={12} />
              Description
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        <Separator />

        {/* Dates */}
        <div className="space-y-2 text-sm">
          {task.dueAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarBlank size={14} />
              <span>Due: {format(task.dueAt, 'PPP p')}</span>
              {!task.completed && (
                <span className={`text-xs ${status.isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                  ({formatDistanceToNow(task.dueAt, { addSuffix: true })})
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock size={14} />
            <span>Created: {format(task.createdAt, 'PPP')}</span>
          </div>
          {task.completedAt && (
            <div className="flex items-center gap-2 text-green-600">
              <Check size={14} />
              <span>Completed: {format(task.completedAt, 'PPP p')}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {task.notes && (
          <>
            <Separator />
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {!task.completed && (
            <Button size="sm" onClick={() => { onComplete(); onClose() }}>
              <Check size={14} className="mr-1" /> Complete
            </Button>
          )}
          {task.completed && (
            <Button size="sm" variant="outline" onClick={() => { onComplete(); onClose() }}>
              Reopen
            </Button>
          )}
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
