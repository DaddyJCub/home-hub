import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Clock, User } from '@phosphor-icons/react'
import type { Chore } from '@/lib/types'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { useAuth } from '@/lib/AuthContext'

export default function WeeklyChoreSchedule() {
  const { currentHousehold } = useAuth()
  const [choresRaw, setChores] = useKV<Chore[]>('chores', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  const allChores = choresRaw ?? []
  const chores = currentHousehold ? allChores.filter(c => c.householdId === currentHousehold.id) : []

  const filteredChores = selectedMember === 'all' 
    ? chores 
    : chores.filter(c => c.assignedTo === selectedMember)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getChoresForDay = (dayIndex: number) => {
    return filteredChores.filter((chore) => {
      if (chore.completed) return false
      
      if (chore.frequency === 'daily') return true
      
      if (chore.frequency === 'weekly' || chore.frequency === 'biweekly') {
        if (chore.daysOfWeek && chore.daysOfWeek.length > 0) {
          return chore.daysOfWeek.includes(dayIndex)
        }
      }
      
      return false
    })
  }

  const toggleChoreCompletion = (choreId: string) => {
    setChores((currentChores) => {
      if (!currentChores) return []
      return currentChores.map((chore) =>
        chore.id === choreId
          ? { ...chore, completed: !chore.completed, lastCompleted: !chore.completed ? Date.now() : undefined }
          : chore
      )
    })
  }

  const priorityColors = {
    high: 'bg-destructive/20 text-destructive border-destructive/50',
    medium: 'bg-accent/20 text-accent-foreground border-accent/50',
    low: 'bg-secondary text-secondary-foreground border-border'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle size={24} />
          Weekly Chore Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((day, dayIndex) => {
            const dayChores = getChoresForDay(dayIndex)
            const isDayToday = isToday(day)
            const totalTime = dayChores.reduce((acc, c) => acc + (c.estimatedMinutes || 0), 0)

            return (
              <div
                key={day.toString()}
                className={`rounded-lg border-2 p-2 ${
                  isDayToday ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="text-center mb-2 pb-2 border-b">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-bold ${isDayToday ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                  {totalTime > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock size={12} />
                      {totalTime}m
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  {dayChores.length > 0 ? (
                    dayChores.map((chore) => (
                      <button
                        key={chore.id}
                        onClick={() => toggleChoreCompletion(chore.id)}
                        className={`w-full text-left p-2 rounded border transition-all hover:scale-105 ${
                          priorityColors[chore.priority || 'low']
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          {chore.completed ? (
                            <CheckCircle size={14} className="flex-shrink-0 mt-0.5" weight="fill" />
                          ) : (
                            <Circle size={14} className="flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium leading-tight truncate ${
                              chore.completed ? 'line-through opacity-60' : ''
                            }`}>
                              {chore.title}
                            </div>
                            {chore.assignedTo && selectedMember === 'all' && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <User size={10} />
                                <span className="truncate">{chore.assignedTo}</span>
                              </div>
                            )}
                            {chore.estimatedMinutes && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <Clock size={10} />
                                {chore.estimatedMinutes}m
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-muted-foreground italic">
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
  )
}
