import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Check, Repeat, Clock, Warning, User, House, Fire,
  SkipForward, Play, Stop, Pencil, Trash, DotsThreeVertical
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Chore } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { getChoreStatus } from '@/lib/chore-utils'
import { priorityConfig, getChoreRooms } from '@/hooks/use-chores'

export interface ChoreCardProps {
  chore: Chore
  status: ReturnType<typeof getChoreStatus>
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

export default function ChoreCard({
  chore,
  status,
  isTracking,
  onComplete,
  onSkip,
  onEdit,
  onDelete,
  onStartTracking,
  onStopTracking,
  onClick,
  highlight
}: ChoreCardProps) {
  const priority = chore.priority || 'medium'
  const priorityCfg = priorityConfig[priority]
  const rooms = getChoreRooms(chore)
  const firstRoom = rooms[0]
  const extraRooms = rooms.length > 1 ? rooms.length - 1 : 0

  const frequencyLabel = chore.frequency !== 'once' ? chore.frequency : null

  return (
    <Card
      variant="flat"
      className={`
        cursor-pointer transition-all hover:shadow-md overflow-hidden
        ${status.isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' : ''}
        ${status.isDueToday && !status.isOverdue ? 'border-primary/50 bg-primary/5' : ''}
        ${chore.completed ? 'opacity-60' : ''}
        ${highlight ? 'ring-2 ring-primary' : ''}
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
                ${chore.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-muted-foreground/40 hover:border-primary hover:bg-primary/10'
                }
              `}
              onClick={(e) => { e.stopPropagation(); onComplete() }}
            >
              <AnimatePresence>
                {chore.completed && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Check size={14} weight="bold" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-sm leading-tight ${chore.completed ? 'line-through text-muted-foreground' : ''}`}>
                {chore.title}
              </h3>

              {/* Inline metadata row */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs text-muted-foreground">
                {chore.assignedTo && (
                  <span className="flex items-center gap-0.5">
                    <User size={11} />
                    {chore.assignedTo}
                  </span>
                )}
                {firstRoom && (
                  <span className="flex items-center gap-0.5">
                    <House size={11} />
                    {firstRoom}
                    {extraRooms > 0 && ` +${extraRooms}`}
                  </span>
                )}
                {frequencyLabel && (
                  <span className="flex items-center gap-0.5">
                    <Repeat size={11} />
                    {frequencyLabel}
                  </span>
                )}
                {chore.estimatedMinutes && (
                  <span className="flex items-center gap-0.5">
                    <Clock size={11} />
                    ~{chore.estimatedMinutes}m
                  </span>
                )}
              </div>

              {/* Due info line */}
              {!chore.completed && (
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {status.isOverdue && (
                    <span className="text-red-600 font-medium flex items-center gap-0.5">
                      <Warning size={12} />
                      {status.daysOverdue}d overdue
                    </span>
                  )}
                  {status.isDueToday && !status.isOverdue && (
                    <span className="text-primary font-medium">Due today</span>
                  )}
                  {chore.lastCompletedAt && (
                    <span className="text-muted-foreground">
                      Last {formatDistanceToNow(chore.lastCompletedAt, { addSuffix: true })}
                      {chore.lastCompletedBy && ` by ${chore.lastCompletedBy}`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right side: badges + actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Status badge */}
              {status.isOverdue && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                  Overdue
                </Badge>
              )}
              {status.isDueToday && !status.isOverdue && (
                <Badge className="text-[10px] px-1.5 py-0 bg-primary hidden sm:inline-flex">
                  Today
                </Badge>
              )}

              {/* Streak badge */}
              {chore.streak && chore.streak >= 2 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-orange-500 gap-0.5">
                  <Fire size={10} />
                  {chore.streak}
                </Badge>
              )}

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

              {/* Overflow menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <DotsThreeVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!chore.completed && (
                    <DropdownMenuItem onClick={onComplete}>
                      <Check size={14} className="mr-2" />
                      Complete
                    </DropdownMenuItem>
                  )}
                  {chore.frequency !== 'once' && !chore.completed && (
                    <DropdownMenuItem onClick={onSkip}>
                      <SkipForward size={14} className="mr-2" />
                      Skip
                    </DropdownMenuItem>
                  )}
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
        </CardContent>
      </div>
    </Card>
  )
}
