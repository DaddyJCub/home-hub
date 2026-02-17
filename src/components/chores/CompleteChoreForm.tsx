import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Check } from '@phosphor-icons/react'
import type { Chore } from '@/lib/types'
import { getChoreRooms } from '@/hooks/use-chores'

export interface CompleteChoreFormProps {
  chore: Chore
  members: { id: string; displayName: string }[]
  trackingStartTime: number | null
  onComplete: (minutes?: number, completedBy?: string, notes?: string, roomsPicked?: string[]) => void
  onCancel: () => void
}

export default function CompleteChoreForm({ chore, members, trackingStartTime, onComplete, onCancel }: CompleteChoreFormProps) {
  const [minutes, setMinutes] = useState(() => {
    if (trackingStartTime) {
      return Math.round((Date.now() - trackingStartTime) / 60000)
    }
    return chore.estimatedMinutes || 0
  })
  const [completedBy, setCompletedBy] = useState(chore.assignedTo)
  const [notes, setNotes] = useState('')
  const rooms = getChoreRooms(chore)
  const remainingRooms = rooms.filter(r => !(chore.completedRooms || []).includes(r))
  const [roomChoice, setRoomChoice] = useState<string>(remainingRooms[0] || rooms[0] || '')

  return (
    <div className="space-y-4 pt-2">
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="font-medium">{chore.title}</p>
        {rooms.length > 0 && <p className="text-sm text-muted-foreground">Rooms: {rooms.join(', ')}</p>}
      </div>

      {chore.trackTime && (
        <div className="space-y-1.5">
          <Label>Time Spent (minutes)</Label>
          <Input
            type="number"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
          />
          {trackingStartTime && (
            <p className="text-xs text-muted-foreground">
              Tracked: {Math.round((Date.now() - trackingStartTime) / 60000)} minutes
            </p>
          )}
        </div>
      )}

      {chore.rotation === 'anyone' && (
        <div className="space-y-1.5">
          <Label>Completed By</Label>
          <Select value={completedBy} onValueChange={setCompletedBy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {members.map(m => (
                <SelectItem key={m.id} value={m.displayName}>{m.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {rooms.length > 1 && (
        <div className="space-y-1.5">
          <Label>Room completed</Label>
          <Select value={roomChoice} onValueChange={setRoomChoice}>
            <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                  {(chore.completedRooms || []).includes(r) ? ' (done)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {remainingRooms.length > 0 && (
            <p className="text-xs text-muted-foreground">{remainingRooms.length} room(s) remaining</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this completion..."
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => {
          const roomsPicked = rooms.length > 1 ? [roomChoice] : rooms.length === 1 ? [rooms[0]] : undefined
          onComplete(minutes, completedBy, notes, roomsPicked)
        }} className="flex-1">
          <Check size={16} className="mr-1" />
          Complete
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
