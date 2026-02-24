import { useState } from 'react'
import {
  Broom, Plus, Funnel, ChartBar, Warning, CheckCircle, Circle,
  CalendarCheck, Sparkle, CaretDown, Check, Repeat, CaretUp,
  Trophy, Fire, Clock, ArrowsClockwise
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

import { useChores, getChoreRooms } from '@/hooks/use-chores'
import ChoreCard from '@/components/chores/ChoreCard'
import ChoreDetailView from '@/components/chores/ChoreDetailView'
import CompleteChoreForm from '@/components/chores/CompleteChoreForm'
import ChoreFormDialog from '@/components/chores/ChoreFormDialog'
import RoomOverview from '@/components/chores/RoomOverview'
import AIChoreSuggestions from '@/components/chores/AIChoreSuggestions'
import EmptyState from '@/components/EmptyState'

export default function ChoresSection({ highlightChoreId }: { highlightChoreId?: string | null }) {
  const {
    chores, completions, members, rooms, allChores, currentHousehold,
    processedChores, pendingChores, completedChores, completedTodayChores,
    overdueChores, dueTodayChores, dueSoonChores, upcomingChores, stats, roomSections,
    hasActiveFilters, selectedMember,
    dialogOpen, setDialogOpen, editingChore, setEditingChore,
    showStats, setShowStats,
    trackingChoreId, trackingStartTime,
    completeDialogChore, setCompleteDialogChore,
    roomCompleteChore, setRoomCompleteChore,
    roomSelection, setRoomSelection,
    detailChore, setDetailChore,
    manageRoomsOpen, setManageRoomsOpen,
    newRoomName, setNewRoomName,
    roomEditIndex, setRoomEditIndex,
    roomQuickAdd, setRoomQuickAdd,
    filterRoom, setFilterRoom, filterPriority, setFilterPriority,
    sortBy, setSortBy,
    quickChoreTitle, setQuickChoreTitle,
    quickChoreRoom, setQuickChoreRoom,
    choreForm, setChoreForm, resetForm, toggleDayOfWeek,
    handleSaveChore, handleCompleteChore, handleSkipChore, handleDeleteChore,
    openEditDialog, startTracking, stopTracking, beginCompleteChore,
    handleQuickChore, quickAddForRoom,
    handleSaveRoom, handleDeleteRoom, handleDuplicateChore, setRooms,
    addChoresBatch, updateChoreAssignments, updateChoreFrequencies,
    resetOverdueDueDates,
    describeDue,
  } = useChores()

  const [subTab, setSubTab] = useState<'chores' | 'rooms'>('chores')
  const [showCompleted, setShowCompleted] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [roomCompleteMinutes, setRoomCompleteMinutes] = useState('')
  const [roomCompleteNotes, setRoomCompleteNotes] = useState('')

  // -------------------------------------------------------------------------
  // Shared chore card renderer
  // -------------------------------------------------------------------------
  const renderChoreCard = ({ chore, status }: (typeof processedChores)[number], completed = false) => (
    <ChoreCard
      key={chore.id}
      chore={chore}
      status={status}
      isTracking={!completed && trackingChoreId === chore.id}
      onComplete={completed ? () => {} : () => beginCompleteChore(chore)}
      onSkip={completed ? () => {} : () => handleSkipChore(chore)}
      onEdit={() => openEditDialog(chore)}
      onDelete={() => handleDeleteChore(chore.id)}
      onStartTracking={completed ? () => {} : () => startTracking(chore.id)}
      onStopTracking={completed ? () => {} : () => stopTracking(chore)}
      onClick={() => setDetailChore(chore)}
      highlight={highlightChoreId === chore.id}
    />
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4 pb-20">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2">
            <Broom className="text-primary" />
            Chores
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {pendingChores.length} pending
            {overdueChores.length > 0 && (
              <> &bull; <span className="text-red-600">{overdueChores.length} overdue</span></>
            )}
          </p>
          {selectedMember !== 'all' && (
            <p className="text-xs text-primary mt-1">Filtering for {selectedMember}</p>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {/* Stats toggle */}
          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowStats(!showStats)}>
            <ChartBar size={16} />
          </Button>

          {/* Filter toggle */}
          <Button
            variant={filtersOpen ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Funnel size={16} />
            {hasActiveFilters && !filtersOpen && (
              <Badge variant="secondary" className="px-1 py-0 text-[10px]">On</Badge>
            )}
          </Button>

          {/* AI Suggestions button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setAiDialogOpen(true)}
          >
            <Sparkle size={16} />
            <span className="hidden sm:inline">AI</span>
          </Button>

          {/* Add Chore button */}
          <Button size="sm" className="h-8 gap-1" onClick={() => setDialogOpen(true)}>
            <Plus size={16} />
            <span className="hidden sm:inline">Add Chore</span>
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent className="space-y-3 rounded-lg border bg-card p-3">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Sort</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="room">Room</SelectItem>
                <SelectItem value="created">Created</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Room pills */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Room</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterRoom === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setFilterRoom('all')}
              >
                All
              </button>
              {rooms.map((room) => (
                <button
                  key={room}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterRoom === room
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setFilterRoom(room)}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>

          {/* Priority pills */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Priority</span>
            <div className="flex flex-wrap gap-1.5">
              {([
                { value: 'all', label: 'All', activeClass: 'bg-primary text-primary-foreground' },
                { value: 'high', label: 'High', activeClass: 'bg-red-500 text-white' },
                { value: 'medium', label: 'Med', activeClass: 'bg-yellow-500 text-white' },
                { value: 'low', label: 'Low', activeClass: 'bg-green-500 text-white' },
              ] as const).map(({ value, label, activeClass }) => (
                <button
                  key={value}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterPriority === value ? activeClass : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setFilterPriority(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Sub-tabs ───────────────────────────────────────────────────────── */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'chores' | 'rooms')}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="chores" className="gap-1">
            <Circle size={14} />
            My Chores
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-1">
            <CalendarCheck size={14} />
            By Room
          </TabsTrigger>
        </TabsList>

        {/* ── My Chores tab ─────────────────────────────────────────────── */}
        <TabsContent value="chores" className="space-y-4 mt-4">
          {/* Quick-add bar */}
          <Card className="p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Quick add chore"
                value={quickChoreTitle}
                onChange={(e) => setQuickChoreTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickChore() }}
              />
              <Select value={quickChoreRoom} onValueChange={setQuickChoreRoom}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="Room (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No room</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room} value={room}>{room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setManageRoomsOpen(true)}>
                Manage rooms
              </Button>
              <Button onClick={handleQuickChore} className="whitespace-nowrap">
                <Plus size={16} className="mr-1" /> Add
              </Button>
            </div>
          </Card>

          {/* Stats panel (collapsible) */}
          {showStats && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <Trophy className="mx-auto mb-1 text-yellow-500" size={20} />
                    <p className="text-2xl font-bold">{stats.thisWeek}</p>
                    <p className="text-xs text-muted-foreground">This Week</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <CheckCircle className="mx-auto mb-1 text-green-500" size={20} />
                    <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                    <p className="text-xs text-muted-foreground">Total Done</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <Fire className="mx-auto mb-1 text-orange-500" size={20} />
                    <p className="text-2xl font-bold">{stats.avgStreak}</p>
                    <p className="text-xs text-muted-foreground">Avg Streak</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50">
                    <Warning className="mx-auto mb-1 text-red-500" size={20} />
                    <p className="text-2xl font-bold">{overdueChores.length}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                </div>
                {Object.keys(stats.byMember).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Completions by member</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(stats.byMember).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                        <Badge key={name} variant="secondary" className="gap-1">{name}: {count}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Overdue alert */}
          {overdueChores.length > 0 && (
            <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Warning size={18} className="text-red-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      {overdueChores.length} overdue {overdueChores.length === 1 ? 'chore' : 'chores'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs border-red-300 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40"
                    onClick={resetOverdueDueDates}
                  >
                    <ArrowsClockwise size={14} />
                    Reset Dates
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overdue section */}
          {overdueChores.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-1">
                <Warning size={16} />
                Overdue ({overdueChores.length})
              </h3>
              {overdueChores.map((item) => renderChoreCard(item))}
            </div>
          )}

          {/* Due Today section */}
          {dueTodayChores.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1">
                <CalendarCheck size={16} />
                Due Today ({dueTodayChores.length})
              </h3>
              {dueTodayChores.map((item) => renderChoreCard(item))}
            </div>
          )}

          {/* Due Soon section */}
          {dueSoonChores.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <Clock size={16} />
                Due Soon ({dueSoonChores.length})
              </h3>
              {dueSoonChores.map((item) => renderChoreCard(item))}
            </div>
          )}

          {/* Upcoming section */}
          {upcomingChores.length > 0 && (
            <div className="space-y-2">
              {(overdueChores.length > 0 || dueTodayChores.length > 0 || dueSoonChores.length > 0) && (
                <h3 className="text-sm font-semibold text-muted-foreground">Upcoming</h3>
              )}
              {upcomingChores.map((item) => renderChoreCard(item))}
            </div>
          )}

          {/* Done Today (collapsible) */}
          {completedTodayChores.length > 0 && (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 w-full">
                <CaretDown size={14} className="transition-transform group-data-[state=open]:rotate-180" />
                <CheckCircle size={14} className="text-green-500" />
                <span>Done Today ({completedTodayChores.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {completedTodayChores.map(({ chore }) => (
                  <Card
                    key={chore.id}
                    className="cursor-pointer transition-all hover:shadow-md border-green-200 bg-green-50/50 dark:bg-green-950/10"
                    onClick={() => setDetailChore(chore)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                          <Check size={14} weight="bold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-green-700 dark:text-green-400">{chore.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {chore.lastCompletedAt && (
                              <span>Done {formatDistanceToNow(chore.lastCompletedAt, { addSuffix: true })}</span>
                            )}
                            {chore.lastCompletedBy && <span>by {chore.lastCompletedBy}</span>}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Repeat size={10} className="mr-0.5" />
                              Next: {chore.frequency}
                            </Badge>
                          </div>
                        </div>
                        <Sparkle size={16} className="text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Show completed toggle */}
          {completedChores.length > 0 && (
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              {showCompleted ? <CaretUp size={14} /> : <CaretDown size={14} />}
              <CheckCircle size={14} />
              <span>Completed ({completedChores.length})</span>
            </button>
          )}
          {showCompleted && completedChores.length > 0 && (
            <div className="space-y-2">
              {completedChores.map((item) => renderChoreCard(item, true))}
            </div>
          )}

          {/* Empty state */}
          {pendingChores.length === 0 && completedTodayChores.length === 0 && (
            <EmptyState
              icon={Sparkle}
              title="All caught up!"
              description="No pending chores. Add a quick win to keep momentum."
              action={{ label: "Add a chore", onClick: () => setDialogOpen(true) }}
            />
          )}
        </TabsContent>

        {/* ── By Room tab ───────────────────────────────────────────────── */}
        <TabsContent value="rooms" className="mt-4">
          <RoomOverview
            roomSections={roomSections}
            roomQuickAdd={roomQuickAdd}
            setRoomQuickAdd={setRoomQuickAdd}
            onQuickAddForRoom={quickAddForRoom}
            onCompleteChore={(chore, room) => handleCompleteChore(chore, undefined, undefined, undefined, room)}
            onViewDetail={(chore) => setDetailChore(chore)}
            describeDue={describeDue}
          />
        </TabsContent>
      </Tabs>

      {/* Global empty state */}
      {chores.length === 0 && (
        <EmptyState
          icon={Broom}
          title="No chores yet"
          description="Add your first chore to get started"
          action={{ label: "Add First Chore", onClick: () => setDialogOpen(true) }}
        />
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      {/* Add / Edit chore dialog */}
      <ChoreFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (open && !editingChore) {
            const defaultDue = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
            setChoreForm(prev => ({
              ...prev,
              dueDateTime: prev.dueDateTime || defaultDue,
              dueDate: prev.dueDate || defaultDue.slice(0, 10),
            }))
          }
          if (!open) { setEditingChore(null); resetForm() }
        }}
        choreForm={choreForm}
        setChoreForm={setChoreForm}
        editingChore={editingChore}
        members={members}
        rooms={rooms}
        onSave={handleSaveChore}
        onManageRooms={() => setManageRoomsOpen(true)}
        toggleDayOfWeek={toggleDayOfWeek}
      />

      {/* Complete chore dialog (with time tracking) */}
      <Dialog open={!!completeDialogChore} onOpenChange={() => setCompleteDialogChore(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Chore</DialogTitle>
          </DialogHeader>
          {completeDialogChore && (
            <CompleteChoreForm
              chore={completeDialogChore}
              members={members}
              trackingStartTime={trackingStartTime}
              onComplete={(minutes, completedBy, notes, roomsPicked) =>
                handleCompleteChore(completeDialogChore, minutes, completedBy, notes, roomsPicked)
              }
              onCancel={() => setCompleteDialogChore(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Multi-room completion dialog */}
      <Dialog open={!!roomCompleteChore} onOpenChange={() => { setRoomCompleteChore(null); setRoomSelection([]); setRoomCompleteMinutes(''); setRoomCompleteNotes('') }}>
        <DialogContent className="max-w-md">
          {roomCompleteChore && (
            <>
              <DialogHeader>
                <DialogTitle>Select rooms to mark complete</DialogTitle>
                <DialogDescription>{roomCompleteChore.title}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  {getChoreRooms(roomCompleteChore).map((room) => {
                    const checked = roomSelection.includes(room)
                    return (
                      <label key={room} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(val) => {
                            setRoomSelection((prev) =>
                              val ? Array.from(new Set([...prev, room])) : prev.filter((r) => r !== room)
                            )
                          }}
                        />
                        <span>{room}</span>
                        {(roomCompleteChore.completedRooms || []).includes(room) && (
                          <Badge variant="secondary" className="text-[10px]">Already done</Badge>
                        )}
                      </label>
                    )
                  })}
                </div>
                {roomCompleteChore.trackTime && (
                  <div className="space-y-1">
                    <Label htmlFor="room-complete-minutes" className="text-sm">Time spent (minutes)</Label>
                    <Input
                      id="room-complete-minutes"
                      type="number"
                      min={0}
                      placeholder="Optional"
                      value={roomCompleteMinutes}
                      onChange={(e) => setRoomCompleteMinutes(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="room-complete-notes" className="text-sm">Notes</Label>
                  <Textarea
                    id="room-complete-notes"
                    placeholder="Optional notes..."
                    rows={2}
                    value={roomCompleteNotes}
                    onChange={(e) => setRoomCompleteNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const selection = roomSelection.length > 0 ? roomSelection : getChoreRooms(roomCompleteChore)
                      const parsedMinutes = roomCompleteMinutes ? parseInt(roomCompleteMinutes, 10) : undefined
                      handleCompleteChore(roomCompleteChore, parsedMinutes, undefined, roomCompleteNotes || undefined, selection)
                      setRoomCompleteChore(null)
                      setRoomSelection([])
                      setRoomCompleteMinutes('')
                      setRoomCompleteNotes('')
                    }}
                  >
                    Mark complete
                  </Button>
                  <Button variant="outline" onClick={() => { setRoomCompleteChore(null); setRoomSelection([]); setRoomCompleteMinutes(''); setRoomCompleteNotes('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Chore detail dialog */}
      <Dialog open={!!detailChore} onOpenChange={() => setDetailChore(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailChore && (
            <ChoreDetailView
              chore={detailChore}
              completions={completions.filter(c => c.choreId === detailChore.id)}
              members={members}
              onComplete={() => { beginCompleteChore(detailChore); setDetailChore(null) }}
              onSkip={() => { handleSkipChore(detailChore); setDetailChore(null) }}
              onEdit={() => { openEditDialog(detailChore); setDetailChore(null) }}
              onDelete={() => { handleDeleteChore(detailChore.id); setDetailChore(null) }}
              onClose={() => setDetailChore(null)}
              rooms={rooms}
              onDuplicate={(room) => { handleDuplicateChore(detailChore, room) }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Manage rooms dialog */}
      <Dialog open={manageRoomsOpen} onOpenChange={setManageRoomsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Rooms</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder={roomEditIndex !== null ? 'Rename room' : 'Add room'}
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRoom() }}
              />
              <Button onClick={handleSaveRoom}>
                {roomEditIndex !== null ? 'Save' : 'Add'}
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {rooms.map((room, idx) => (
                <div key={room} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                  <span>{room}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { setRoomEditIndex(idx); setNewRoomName(room) }}>
                      Rename
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => handleDeleteRoom(room)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {rooms.length === 0 && (
                <p className="text-xs text-muted-foreground">No rooms yet. Add one to get started.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setManageRoomsOpen(false); setRoomEditIndex(null); setNewRoomName('') }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Chore Suggestions dialog */}
      <AIChoreSuggestions
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        rooms={rooms}
        members={members}
        chores={chores}
        completions={completions}
        householdId={currentHousehold?.id ?? ''}
        onAddChores={addChoresBatch}
        onUpdateAssignments={updateChoreAssignments}
        onUpdateFrequencies={updateChoreFrequencies}
      />
    </div>
  )
}
