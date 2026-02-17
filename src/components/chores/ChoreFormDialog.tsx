import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CaretDown, CaretUp, Timer, Gear } from '@phosphor-icons/react'
import type { Chore, ChoreFrequency, ChoreRotation } from '@/lib/types'
import type { ChoreFormState } from '@/hooks/use-chores'
import { DAYS_OF_WEEK, FREQUENCY_OPTIONS } from '@/hooks/use-chores'

export interface ChoreFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  choreForm: ChoreFormState
  setChoreForm: React.Dispatch<React.SetStateAction<ChoreFormState>>
  editingChore: Chore | null
  members: { id: string; displayName: string }[]
  rooms: string[]
  onSave: () => void
  onManageRooms: () => void
  toggleDayOfWeek: (day: number) => void
}

export default function ChoreFormDialog({
  open,
  onOpenChange,
  choreForm,
  setChoreForm,
  editingChore,
  members,
  rooms,
  onSave,
  onManageRooms,
  toggleDayOfWeek,
}: ChoreFormDialogProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [showAllRooms, setShowAllRooms] = useState(false)

  const VISIBLE_ROOMS = 6
  const visibleRooms = showAllRooms ? rooms : rooms.slice(0, VISIBLE_ROOMS)
  const hiddenRoomsCount = rooms.length - VISIBLE_ROOMS

  const showScheduleType = choreForm.frequency !== 'once'
  const showCustomInterval = choreForm.frequency === 'custom'
  const showDaysOfWeek = choreForm.frequency === 'weekly' || choreForm.frequency === 'biweekly'
  const showRotation = choreForm.frequency !== 'once' && members.length > 1
  const showRotationOrder = choreForm.rotation === 'rotate'

  const hasAdvancedValues =
    choreForm.scheduleType !== 'fixed' ||
    choreForm.daysOfWeek.length > 0 ||
    (choreForm.frequency === 'custom' && choreForm.customIntervalDays !== 7) ||
    !!choreForm.estimatedMinutes ||
    choreForm.rotation !== 'none' ||
    choreForm.rotationOrder.length > 0 ||
    choreForm.trackTime ||
    !!choreForm.notes

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingChore ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Title - always visible */}
          <div className="space-y-1.5">
            <Label htmlFor="chore-title">Title *</Label>
            <Input
              id="chore-title"
              value={choreForm.title}
              onChange={(e) => setChoreForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Vacuum living room"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="chore-description">Description</Label>
            <Textarea
              id="chore-description"
              value={choreForm.description}
              onChange={(e) => setChoreForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What needs to be done?"
              rows={2}
            />
          </div>

          {/* Assigned To + Priority - essential, grid-cols-2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select value={choreForm.assignedTo} onValueChange={(v) => setChoreForm(prev => ({ ...prev, assignedTo: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anyone">Anyone / Unassigned</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.displayName}>{m.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={choreForm.priority} onValueChange={(v) => setChoreForm(prev => ({ ...prev, priority: v as 'low' | 'medium' | 'high' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frequency + Due Date - essential, grid-cols-2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={choreForm.frequency} onValueChange={(v) => setChoreForm(prev => ({ ...prev, frequency: v as ChoreFrequency }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{choreForm.frequency === 'once' ? 'Due Date' : 'Next Due'}</Label>
              {choreForm.frequency === 'once' ? (
                <Input
                  type="date"
                  value={choreForm.dueDate}
                  onChange={(e) => setChoreForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              ) : (
                <Input
                  type="datetime-local"
                  value={choreForm.dueDateTime}
                  onChange={(e) => setChoreForm(prev => ({ ...prev, dueDateTime: e.target.value }))}
                />
              )}
            </div>
          </div>

          {/* Room selection - toggleable pill buttons */}
          {rooms.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Rooms</Label>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onManageRooms}>
                  <Gear size={12} className="mr-1" /> Manage
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visibleRooms.map((room) => {
                  const checked = choreForm.rooms?.includes(room)
                  return (
                    <button
                      key={room}
                      type="button"
                      className={`
                        inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
                        border transition-colors cursor-pointer
                        ${checked
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                        }
                      `}
                      onClick={() => {
                        setChoreForm(prev => {
                          const next = new Set(prev.rooms || [])
                          if (checked) next.delete(room)
                          else next.add(room)
                          const arr = Array.from(next)
                          return { ...prev, rooms: arr, room: arr[0] || '' }
                        })
                      }}
                    >
                      {room}
                    </button>
                  )
                })}
                {!showAllRooms && hiddenRoomsCount > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/50 cursor-pointer"
                    onClick={() => setShowAllRooms(true)}
                  >
                    +{hiddenRoomsCount} more
                  </button>
                )}
                {showAllRooms && rooms.length > VISIBLE_ROOMS && (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/50 cursor-pointer"
                    onClick={() => setShowAllRooms(false)}
                  >
                    Show less
                  </button>
                )}
              </div>
              {choreForm.rooms?.length === 0 && (
                <p className="text-xs text-muted-foreground">Select one or more rooms.</p>
              )}
            </div>
          )}

          {/* Advanced Options - Collapsible */}
          <Collapsible open={advancedOpen || hasAdvancedValues} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" type="button" className="w-full justify-between h-9 px-3 text-sm text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  Advanced options
                  {hasAdvancedValues && !advancedOpen && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">configured</Badge>
                  )}
                </span>
                {advancedOpen ? <CaretUp size={14} /> : <CaretDown size={14} />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* Schedule type */}
              {showScheduleType && (
                <div className="space-y-1.5">
                  <Label>Schedule Type</Label>
                  <Select value={choreForm.scheduleType} onValueChange={(v) => setChoreForm(prev => ({ ...prev, scheduleType: v as 'fixed' | 'after_completion' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (next occurrence is fixed cadence)</SelectItem>
                      <SelectItem value="after_completion">After Completion (next due shifts from completion time)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Days of week for weekly/biweekly */}
              {showDaysOfWeek && (
                <div className="space-y-1.5">
                  <Label>Days</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS_OF_WEEK.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={choreForm.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className="w-10 h-8"
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom interval */}
              {showCustomInterval && (
                <div className="space-y-1.5">
                  <Label>Repeat every (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={choreForm.customIntervalDays}
                    onChange={(e) => setChoreForm(prev => ({ ...prev, customIntervalDays: parseInt(e.target.value) || 7 }))}
                  />
                </div>
              )}

              {/* Estimated time */}
              <div className="space-y-1.5">
                <Label>Estimated Time (minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  value={choreForm.estimatedMinutes}
                  onChange={(e) => setChoreForm(prev => ({ ...prev, estimatedMinutes: e.target.value }))}
                  placeholder="e.g., 30"
                />
              </div>

              {/* Rotation */}
              {showRotation && (
                <div className="space-y-1.5">
                  <Label>Assignment</Label>
                  <Select value={choreForm.rotation} onValueChange={(v) => setChoreForm(prev => ({ ...prev, rotation: v as ChoreRotation }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Fixed person</SelectItem>
                      <SelectItem value="rotate">Rotate between members</SelectItem>
                      <SelectItem value="anyone">Whoever does it</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Rotation order */}
              {showRotationOrder && (
                <div className="space-y-1.5">
                  <Label>Rotation Order</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {members.map(m => (
                      <Badge
                        key={m.id}
                        variant={choreForm.rotationOrder.includes(m.displayName) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const order = choreForm.rotationOrder.includes(m.displayName)
                            ? choreForm.rotationOrder.filter(n => n !== m.displayName)
                            : [...choreForm.rotationOrder, m.displayName]
                          setChoreForm(prev => ({ ...prev, rotationOrder: order }))
                        }}
                      >
                        {m.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Track time toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Timer size={18} />
                  <Label htmlFor="track-time-toggle" className="cursor-pointer">Track actual time</Label>
                </div>
                <Switch
                  id="track-time-toggle"
                  checked={choreForm.trackTime}
                  onCheckedChange={(c) => setChoreForm(prev => ({ ...prev, trackTime: c }))}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={choreForm.notes}
                  onChange={(e) => setChoreForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Save button */}
          <Button onClick={onSave} className="w-full" disabled={members.length === 0}>
            {editingChore ? 'Update Chore' : 'Add Chore'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
