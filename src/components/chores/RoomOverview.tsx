import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Plus } from '@phosphor-icons/react'
import type { Chore } from '@/lib/types'
import type { ChoreWithStatus } from '@/hooks/use-chores'
import { getChoreStatus } from '@/lib/chore-utils'

export interface RoomSection {
  room: string
  pending: ChoreWithStatus[]
  total: ChoreWithStatus[]
}

export interface RoomOverviewProps {
  roomSections: RoomSection[]
  roomQuickAdd: Record<string, string>
  setRoomQuickAdd: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onQuickAddForRoom: (roomName: string) => void
  onCompleteChore: (chore: Chore, room: string) => void
  onViewDetail: (chore: Chore) => void
  describeDue: (status: ReturnType<typeof getChoreStatus>, dueAt?: number) => string
}

export default function RoomOverview({
  roomSections,
  roomQuickAdd,
  setRoomQuickAdd,
  onQuickAddForRoom,
  onCompleteChore,
  onViewDetail,
  describeDue,
}: RoomOverviewProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          Rooms overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roomSections.map(({ room, pending, total }) => (
            <div key={room} className="rounded-lg border border-border/60 p-3 bg-muted/40 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{room}</p>
                  <p className="text-xs text-muted-foreground">
                    {pending.length} pending · {total.length} total
                  </p>
                </div>
                <Badge variant={pending.length > 0 ? 'secondary' : 'outline'} className="text-[11px]">
                  {pending.length > 0 ? 'Active' : 'Clear'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Quick add"
                  value={roomQuickAdd[room] || ''}
                  onChange={(e) => setRoomQuickAdd(prev => ({ ...prev, [room]: e.target.value }))}
                  className="h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onQuickAddForRoom(room)
                    }
                  }}
                />
                <Button size="sm" onClick={() => onQuickAddForRoom(room)}>
                  <Plus size={14} />
                </Button>
                {pending.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px]"
                    onClick={() => {
                      if (pending.length === 1) {
                        onCompleteChore(pending[0].chore, room)
                      } else {
                        onViewDetail(pending[0].chore)
                      }
                    }}
                  >
                    Complete room
                  </Button>
                )}
              </div>
              {pending.length > 0 ? (
                <div className="space-y-1">
                  {pending.slice(0, 3).map(({ chore, status }) => (
                    <div
                      key={chore.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-background/70 px-2 py-1 text-xs border border-border/40 cursor-pointer hover:border-primary/40"
                      onClick={() => onViewDetail(chore)}
                    >
                      <span className="truncate">{chore.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {describeDue(status, chore.dueAt)}
                      </span>
                    </div>
                  ))}
                  {pending.length > 3 && (
                    <p className="text-[11px] text-muted-foreground">+{pending.length - 3} more</p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">No pending chores</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
