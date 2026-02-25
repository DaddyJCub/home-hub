import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Check, Clock, Warning, Pencil, Trash, DotsThreeVertical
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { PersonalTask } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { taskPriorityConfig, type TaskStatus } from '@/hooks/use-tasks'

export interface TaskCardProps {
  task: PersonalTask
  status: TaskStatus
  onComplete: () => void
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
}

export default function TaskCard({
  task,
  status,
  onComplete,
  onEdit,
  onDelete,
  onClick,
}: TaskCardProps) {
  const priority = task.priority || 'medium'
  const priorityCfg = taskPriorityConfig[priority]

  return (
    <Card
      variant="flat"
      className={`
        cursor-pointer transition-all hover:shadow-md overflow-hidden
        ${status.isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' : ''}
        ${status.isDueToday && !status.isOverdue ? 'border-primary/50 bg-primary/5' : ''}
        ${task.completed ? 'opacity-60' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex">
        {/* Priority color bar */}
        <div className={`w-[3px] flex-shrink-0 ${priorityCfg.color}`} />

        <CardContent className="flex-1 p-3">
          <div className="flex items-center gap-3">
            {/* Circular checkbox */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              className={`
                flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center
                transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                ${task.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-muted-foreground/40 hover:border-primary hover:bg-primary/10'
                }
              `}
              onClick={(e) => { e.stopPropagation(); onComplete() }}
              aria-label={task.completed ? 'Reopen task' : 'Complete task'}
            >
              {task.completed && <Check size={14} weight="bold" />}
            </motion.button>

            {/* Title & meta */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-sm truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {task.dueAt && !task.completed && (
                  <span className={`text-xs flex items-center gap-0.5 ${
                    status.isOverdue ? 'text-red-600 font-medium' :
                    status.isDueToday ? 'text-primary font-medium' :
                    status.isDueSoon ? 'text-yellow-600' :
                    'text-muted-foreground'
                  }`}>
                    {status.isOverdue ? <Warning size={12} /> : <Clock size={12} />}
                    {status.isOverdue
                      ? `${status.daysOverdue}d overdue`
                      : status.isDueToday
                        ? 'Due today'
                        : `Due ${formatDistanceToNow(task.dueAt, { addSuffix: true })}`
                    }
                  </span>
                )}
                {task.category && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {task.category}
                  </Badge>
                )}
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityCfg.text}`}>
                  {priorityCfg.label}
                </Badge>
              </div>
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DotsThreeVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                  <Pencil size={14} className="mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
                  <Trash size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
