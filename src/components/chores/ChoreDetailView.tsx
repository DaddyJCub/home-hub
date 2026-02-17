import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Check, Repeat, Clock, Warning, User, House, Fire, Trophy,
  CheckCircle, SkipForward, ArrowsClockwise, Calendar, CaretDown, Pencil, Trash
} from '@phosphor-icons/react'
import type { Chore, ChoreCompletion } from '@/lib/types'
import { format, formatDistanceToNow } from 'date-fns'
import { normalizeChore, getChoreStatus } from '@/lib/chore-utils'
import { priorityConfig, getChoreRooms } from '@/hooks/use-chores'

export interface ChoreDetailViewProps {
  chore: Chore
  completions: ChoreCompletion[]
  members: { id: string; displayName: string }[]
  onComplete: () => void
  onSkip: () => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  rooms?: string[]
  onDuplicate?: (room: string) => void
}

export default function ChoreDetailView({
  chore,
  completions,
  members,
  onComplete,
  onSkip,
  onEdit,
  onDelete,
  onClose,
  rooms: availableRooms = [],
  onDuplicate
}: ChoreDetailViewProps) {
  const priorityCfg = priorityConfig[chore.priority || 'medium']
  const normalized = normalizeChore(chore)
  const status = getChoreStatus(normalized)
  const recentCompletions = completions.sort((a, b) => b.completedAt - a.completedAt).slice(0, 10)
  const choreRooms = getChoreRooms(chore)

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
                  <Calendar size={12} />
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
            {chore.assignedTo || 'Anyone'}
          </p>
          {chore.rotation === 'rotate' && (
            <p className="text-xs text-muted-foreground mt-1">
              <ArrowsClockwise size={10} className="inline mr-0.5" />
              Rotates: {chore.rotationOrder?.join(' -> ')}
            </p>
          )}
        </div>
        {choreRooms.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Rooms</p>
            <div className="flex flex-wrap gap-1">
              {choreRooms.map((room) => (
                <Badge key={room} variant="secondary" className="gap-1">
                  <House size={12} />
                  {room}
                  {(chore.completedRooms || []).includes(room) && <span className="text-[10px]">done</span>}
                </Badge>
              ))}
            </div>
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

      {/* Duplicate to another room */}
      {availableRooms.length > 0 && onDuplicate && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Duplicate to another room</p>
          <Select onValueChange={(room) => onDuplicate(room)}>
            <SelectTrigger>
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.filter(r => !choreRooms.includes(r)).map(room => (
                <SelectItem key={room} value={room}>{room}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
