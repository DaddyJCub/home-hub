import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Trash, Pencil, CalendarBlank, Clock, MapPin, Users, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { CalendarEvent, HouseholdMember } from '@/lib/types'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday, isSameMonth, startOfWeek, endOfWeek } from 'date-fns'

export default function CalendarSection() {
  const [events = [], setEvents] = useKV<CalendarEvent[]>('calendar-events', [])
  const [members = []] = useKV<HouseholdMember[]>('household-members', [])
  const [selectedMember = 'all'] = useKV<string>('selected-member-filter', 'all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    location: '',
    category: 'other' as 'personal' | 'work' | 'appointment' | 'booking' | 'other',
    bookedBy: '',
    attendees: [] as string[]
  })

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const categoryColors: Record<string, string> = {
    personal: 'bg-blue-500/20 text-blue-700 border-blue-300',
    work: 'bg-purple-500/20 text-purple-700 border-purple-300',
    appointment: 'bg-green-500/20 text-green-700 border-green-300',
    booking: 'bg-orange-500/20 text-orange-700 border-orange-300',
    other: 'bg-gray-500/20 text-gray-700 border-gray-300'
  }

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const openAddEventDialog = (date?: Date) => {
    setEditingEvent(null)
    setSelectedDate(date || null)
    setEventForm({
      title: '',
      date: date ? format(date, 'yyyy-MM-dd') : '',
      startTime: '',
      endTime: '',
      description: '',
      location: '',
      category: 'other',
      bookedBy: '',
      attendees: []
    })
    setDialogOpen(true)
  }

  const openEditEventDialog = (event: CalendarEvent) => {
    setEditingEvent(event)
    setEventForm({
      title: event.title,
      date: event.date,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      description: event.description || '',
      location: event.location || '',
      category: event.category,
      bookedBy: event.bookedBy || '',
      attendees: event.attendees || []
    })
    setDialogOpen(true)
  }

  const handleSaveEvent = () => {
    if (!eventForm.title.trim()) {
      toast.error('Please enter an event title')
      return
    }

    if (!eventForm.date) {
      toast.error('Please select a date')
      return
    }

    if (editingEvent) {
      setEvents((current = []) =>
        current.map((evt) =>
          evt.id === editingEvent.id
            ? {
                ...evt,
                title: eventForm.title.trim(),
                date: eventForm.date,
                startTime: eventForm.startTime || undefined,
                endTime: eventForm.endTime || undefined,
                description: eventForm.description || undefined,
                location: eventForm.location || undefined,
                category: eventForm.category,
                bookedBy: eventForm.bookedBy || undefined,
                attendees: eventForm.attendees.length > 0 ? eventForm.attendees : undefined
              }
            : evt
        )
      )
      toast.success('Event updated')
    } else {
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventForm.title.trim(),
        date: eventForm.date,
        startTime: eventForm.startTime || undefined,
        endTime: eventForm.endTime || undefined,
        description: eventForm.description || undefined,
        location: eventForm.location || undefined,
        category: eventForm.category,
        bookedBy: eventForm.bookedBy || undefined,
        attendees: eventForm.attendees.length > 0 ? eventForm.attendees : undefined,
        createdAt: Date.now()
      }

      setEvents((current = []) => [...current, newEvent])
      toast.success('Event added')
    }

    setDialogOpen(false)
  }

  const handleDeleteEvent = (id: string) => {
    setEvents((current = []) => current.filter((evt) => evt.id !== id))
    toast.success('Event deleted')
  }

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    let dayEvents = events.filter((evt) => evt.date === dateStr)
    
    if (selectedMember !== 'all') {
      dayEvents = dayEvents.filter((evt) => {
        return evt.bookedBy === selectedMember || evt.attendees?.includes(selectedMember)
      })
    }
    
    return dayEvents.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime)
      }
      return 0
    })
  }

  const toggleAttendee = (memberId: string) => {
    setEventForm((prev) => ({
      ...prev,
      attendees: prev.attendees.includes(memberId)
        ? prev.attendees.filter((id) => id !== memberId)
        : [...prev.attendees, memberId]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Calendar</h2>
          <p className="text-sm text-muted-foreground">
            {selectedMember === 'all'
              ? 'Shared household events and bookings'
              : `${selectedMember}'s events and bookings`}
          </p>
        </div>
        <Button onClick={() => openAddEventDialog()} className="gap-2">
          <Plus />
          Add Event
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
              <CaretLeft />
            </Button>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Today
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <CaretRight />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isDayToday = isToday(day)
              const isCurrentMonth = isSameMonth(day, currentDate)

              return (
                <div
                  key={day.toString()}
                  className={`min-h-24 border rounded-lg p-2 ${
                    isDayToday
                      ? 'border-primary bg-primary/5'
                      : isCurrentMonth
                      ? 'border-border'
                      : 'border-border bg-muted/30'
                  } ${isCurrentMonth ? 'cursor-pointer hover:bg-accent/10' : ''}`}
                  onClick={() => isCurrentMonth && openAddEventDialog(day)}
                >
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      isDayToday
                        ? 'text-primary'
                        : isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded border ${categoryColors[event.category]} cursor-pointer truncate`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditEventDialog(event)
                        }}
                      >
                        {event.startTime && (
                          <span className="font-semibold">{event.startTime} </span>
                        )}
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {events
                  .filter((evt) => new Date(evt.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
                  .sort((a, b) => {
                    const dateCompare = a.date.localeCompare(b.date)
                    if (dateCompare !== 0) return dateCompare
                    if (a.startTime && b.startTime) {
                      return a.startTime.localeCompare(b.startTime)
                    }
                    return 0
                  })
                  .slice(0, 10)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{event.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(event.date), 'MMM d, yyyy')}
                            {event.startTime && ` • ${event.startTime}`}
                            {event.endTime && ` - ${event.endTime}`}
                          </div>
                        </div>
                        <Badge className={categoryColors[event.category]}>
                          {event.category}
                        </Badge>
                      </div>
                      {event.location && (
                        <div className="text-sm flex items-center gap-2 text-muted-foreground">
                          <MapPin size={14} />
                          {event.location}
                        </div>
                      )}
                      {event.bookedBy && (
                        <div className="text-sm flex items-center gap-2 text-muted-foreground">
                          <Users size={14} />
                          Booked by: {event.bookedBy}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditEventDialog(event)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarBlank size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No upcoming events</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryColors).map(([category, colorClass]) => {
                const count = events.filter((e) => e.category === category).length
                return (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${colorClass}`} />
                      <span className="font-medium capitalize">{category}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title *</Label>
              <Input
                id="event-title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="e.g., Doctor's appointment"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-category">Category</Label>
                <Select
                  value={eventForm.category}
                  onValueChange={(value) =>
                    setEventForm({ ...eventForm, category: value as any })
                  }
                >
                  <SelectTrigger id="event-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="e.g., Main Street Clinic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="booked-by">Booked By</Label>
              <Input
                id="booked-by"
                value={eventForm.bookedBy}
                onChange={(e) => setEventForm({ ...eventForm, bookedBy: e.target.value })}
                placeholder="Who made this booking or reservation?"
              />
            </div>

            {members.length > 0 && (
              <div className="space-y-2">
                <Label>Attendees</Label>
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <Badge
                      key={member.id}
                      variant={eventForm.attendees.includes(member.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleAttendee(member.id)}
                    >
                      {member.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Additional details about this event..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEvent} className="flex-1">
                {editingEvent ? 'Update Event' : 'Add Event'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {events.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarBlank size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No events yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click on any day in the calendar to add your first event
          </p>
        </Card>
      )}
    </div>
  )
}
