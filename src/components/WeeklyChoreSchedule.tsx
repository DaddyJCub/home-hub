import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Clock, User, Check, X } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Chore, ChoreCompletion } from '@/lib/types'
import { format, startOfWeek, addDays, isToday, isSameDay, startOfDay } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'
import { normalizeChore, computeNextDueAt } from '@/lib/chore-utils'
import { toast } from 'sonner'

export default function WeeklyChoreSchedule() {
  const { currentHousehold, currentUser } = useAuth()
  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [completionsRaw, setCompletions] = useKV<ChoreCompletion[]>('chore-completions', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  const allChores = choresRaw ?? []
  const allCompletions = completionsRaw ?? []
  const chores = currentHousehold ? allChores.filter(c => c.householdId === currentHousehold.id).map(normalizeChore) : []
  const completions = currentHousehold ? allCompletions.filter(c => c.householdId === currentHousehold.id) : []

  const filteredChores = selectedMember === 'all' 
    ? chores 
    : chores.filter(c => c.assignedTo === selectedMember)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Confirmation dialog state
  const [confirmChore, setConfirmChore] = useState<{ chore: Chore; day: Date; dayIndex: number } | null>(null)

  // Check if a chore has a completion record for a specific day
  const isCompletedForDay = (choreId: string, day: Date): boolean => {
    const dayStart = startOfDay(day)
    return completions.some(c => 
      c.choreId === choreId && 
      !c.skipped &&
      isSameDay(new Date(c.completedAt), dayStart)
    )
  }

  const getChoresForDay = (dayIndex: number) => {
    return filteredChores.filter((chore) => {
      // Once-off chores that are done shouldn't show
      if (chore.frequency === 'once' && chore.completed) return false
      
      if (chore.frequency === 'daily') return true
      
      if (chore.frequency === 'weekly' || chore.frequency === 'biweekly') {
        if (chore.daysOfWeek && chore.daysOfWeek.length > 0) {
          return chore.daysOfWeek.includes(dayIndex)
        }
      }
      
      return false
    })
  }

  const handleCompleteChore = () => {
    if (!confirmChore || !currentHousehold) return
    const { chore, day } = confirmChore
    const now = Date.now()
    const dayDate = format(day, 'yyyy-MM-dd')

    // Add a completion record for this specific day
    const newCompletion: ChoreCompletion = {
      id: `${chore.id}-${dayDate}-${now}`,
      choreId: chore.id,
      completedBy: currentUser?.displayName || 'Unknown',
      householdId: currentHousehold.id,
      completedAt: day.getTime(),
      scheduledFor: dayDate,
    }
    setCompletions([...allCompletions, newCompletion])

    // Only update the chore's lastCompletedAt / dueAt if completing for today
    if (isToday(day)) {
      setChores(allChores.map(c => {
        if (c.id !== chore.id) return c
        const updated = { ...normalizeChore(c) }
        updated.lastCompletedAt = now
        updated.lastCompletedBy = currentUser?.displayName || 'Unknown'
        updated.totalCompletions = (updated.totalCompletions || 0) + 1
        updated.streak = (updated.streak || 0) + 1
        if ((updated.streak || 0) > (updated.bestStreak || 0)) {
          updated.bestStreak = updated.streak
        }
        if (chore.frequency === 'once') {
          updated.completed = true
        } else {
          updated.completed = false
          updated.dueAt = computeNextDueAt(updated as Chore, now)
        }
        return updated
      }))
    }

    toast.success(`Completed "${chore.title}"`, {
      description: isToday(day) ? 'Nice work!' : `Marked done for ${format(day, 'EEE, MMM d')}`,
    })
    setConfirmChore(null)
  }

  const priorityColors = {
    high: 'bg-destructive/20 text-destructive border-destructive/50',
    medium: 'bg-accent/20 text-accent-foreground border-accent/50',
    low: 'bg-secondary text-secondary-foreground border-border'
  }

  // Auto-scroll to today on mount
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current
      const todayEl = todayRef.current
      const scrollLeft = todayEl.offsetLeft - container.offsetWidth / 2 + todayEl.offsetWidth / 2
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' })
    }
  }, [])

  return (
    <>
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle size={18} className="text-primary" />
            Weekly Chore Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-3 pb-3">
          {/* Mobile: horizontal scroll strip. Desktop: 7-col grid */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto px-3 pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-7 sm:gap-1.5 sm:px-0 sm:pb-0 sm:overflow-visible"
          >
            {daysOfWeek.map((day, dayIndex) => {
              const dayChores = getChoresForDay(dayIndex)
              const isDayToday = isToday(day)
              const totalTime = dayChores.reduce((acc, c) => acc + (c.estimatedMinutes || 0), 0)
              const completedCount = dayChores.filter(c => isCompletedForDay(c.id, day)).length

              return (
                <div
                  key={day.toString()}
                  ref={isDayToday ? todayRef : undefined}
                  className={`rounded-lg border-2 p-2 sm:p-1.5 flex flex-col snap-center
                    min-w-[160px] sm:min-w-0 min-h-[140px] sm:min-h-[120px]
                    ${isDayToday ? 'border-primary bg-primary/5' : 'border-border bg-card'}
                  `}
                >
                  {/* Day header */}
                  <div className="text-center mb-1.5 pb-1 border-b border-border/50">
                    <div className="text-xs sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-lg sm:text-base font-bold leading-tight ${isDayToday ? 'text-primary' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    {dayChores.length > 0 && (
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className={`text-xs sm:text-[10px] font-medium ${completedCount === dayChores.length && dayChores.length > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {completedCount}/{dayChores.length}
                        </span>
                        {totalTime > 0 && (
                          <span className="text-xs sm:text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock size={10} className="sm:w-2 sm:h-2" />{totalTime}m
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Chore list */}
                  <div className="space-y-1 flex-1">
                    {dayChores.length > 0 ? (
                      dayChores.map((chore) => {
                        const doneForDay = isCompletedForDay(chore.id, day)
                        return (
                          <button
                            key={chore.id}
                            onClick={() => {
                              if (!doneForDay) {
                                setConfirmChore({ chore, day, dayIndex })
                              }
                            }}
                            disabled={doneForDay}
                            className={`w-full text-left p-1.5 rounded border transition-all ${
                              doneForDay
                                ? 'bg-green-500/10 border-green-500/30 opacity-70'
                                : `hover:scale-[1.02] active:scale-95 ${priorityColors[chore.priority || 'low']}`
                            }`}
                          >
                            <div className="flex items-start gap-1.5">
                              {doneForDay ? (
                                <CheckCircle size={14} className="flex-shrink-0 mt-0.5 text-green-500" weight="fill" />
                              ) : (
                                <Circle size={14} className="flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs sm:text-[10px] font-medium leading-tight truncate ${
                                  doneForDay ? 'line-through opacity-60' : ''
                                }`}>
                                  {chore.title}
                                </div>
                                {chore.assignedTo && selectedMember === 'all' && (
                                  <div className="flex items-center gap-0.5 text-[10px] sm:text-[9px] text-muted-foreground mt-0.5">
                                    <User size={9} />
                                    <span className="truncate">{chore.assignedTo}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="text-center py-3 text-xs sm:text-[10px] text-muted-foreground italic">
                        No chores
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Completion Confirmation Dialog */}
      <Dialog open={!!confirmChore} onOpenChange={() => setConfirmChore(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle size={20} className="text-primary" />
              Complete Chore?
            </DialogTitle>
            <DialogDescription>
              Mark this chore as done{confirmChore && !isToday(confirmChore.day) ? ` for ${format(confirmChore.day, 'EEEE, MMM d')}` : ' for today'}?
            </DialogDescription>
          </DialogHeader>
          {confirmChore && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${priorityColors[confirmChore.chore.priority || 'low']}`}>
                <p className="font-medium text-sm">{confirmChore.chore.title}</p>
                {confirmChore.chore.description && (
                  <p className="text-xs text-muted-foreground mt-1">{confirmChore.chore.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {confirmChore.chore.assignedTo && (
                    <span className="flex items-center gap-1"><User size={12} /> {confirmChore.chore.assignedTo}</span>
                  )}
                  {confirmChore.chore.estimatedMinutes && (
                    <span className="flex items-center gap-1"><Clock size={12} /> {confirmChore.chore.estimatedMinutes}m</span>
                  )}
                  <Badge variant="outline" className="text-[10px]">{confirmChore.chore.priority || 'low'}</Badge>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" size="sm" onClick={() => setConfirmChore(null)}>
                  <X size={14} className="mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleCompleteChore}>
                  <Check size={14} className="mr-1" /> Complete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
