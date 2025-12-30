import { useState, useMemo, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { 
  Plus, Trash, Pencil, CalendarBlank, Clock, MapPin, Users, CaretLeft, CaretRight,
  Repeat, Bell, Eye, EyeSlash, CalendarCheck, ArrowsOutSimple, Calendar as CalendarIcon,
  Airplane, Gift, GraduationCap, Basketball, FirstAid, Star, DotsThree, Check,
  Sun, ListBullets, SquaresFour, Link as LinkIcon
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CalendarEvent, EventCategory, RecurrencePattern, ReminderTime } from '@/lib/types'
import { toast } from 'sonner'
import { showUserFriendlyError, validateRequired } from '@/lib/error-helpers'
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, 
  isSameDay, isToday, isSameMonth, startOfWeek, endOfWeek, addDays, addWeeks,
  addYears, isWithinInterval, parseISO, differenceInDays, startOfDay, isBefore,
  isAfter, addMinutes
} from 'date-fns'
import { useAuth } from '@/lib/AuthContext'

type ViewMode = 'month' | 'week' | 'agenda'

const categoryConfig: Record<EventCategory, { color: string; icon: typeof CalendarBlank; label: string }> = {
  personal: { color: 'bg-blue-500/20 text-blue-700 border-blue-300 dark:text-blue-300', icon: Star, label: 'Personal' },
  work: { color: 'bg-purple-500/20 text-purple-700 border-purple-300 dark:text-purple-300', icon: CalendarBlank, label: 'Work' },
  appointment: { color: 'bg-green-500/20 text-green-700 border-green-300 dark:text-green-300', icon: CalendarCheck, label: 'Appointment' },
  booking: { color: 'bg-orange-500/20 text-orange-700 border-orange-300 dark:text-orange-300', icon: CalendarIcon, label: 'Booking' },
  vacation: { color: 'bg-cyan-500/20 text-cyan-700 border-cyan-300 dark:text-cyan-300', icon: Airplane, label: 'Vacation/Trip' },
  holiday: { color: 'bg-red-500/20 text-red-700 border-red-300 dark:text-red-300', icon: Gift, label: 'Holiday' },
  school: { color: 'bg-yellow-500/20 text-yellow-700 border-yellow-300 dark:text-yellow-300', icon: GraduationCap, label: 'School' },
  sports: { color: 'bg-emerald-500/20 text-emerald-700 border-emerald-300 dark:text-emerald-300', icon: Basketball, label: 'Sports' },
  medical: { color: 'bg-pink-500/20 text-pink-700 border-pink-300 dark:text-pink-300', icon: FirstAid, label: 'Medical' },
  birthday: { color: 'bg-fuchsia-500/20 text-fuchsia-700 border-fuchsia-300 dark:text-fuchsia-300', icon: Gift, label: 'Birthday' },
  other: { color: 'bg-gray-500/20 text-gray-700 border-gray-300 dark:text-gray-300', icon: DotsThree, label: 'Other' }
}

const recurrenceOptions: { value: RecurrencePattern; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
]

const reminderOptions: { value: ReminderTime; label: string }[] = [
  { value: 'none', label: 'No reminder' },
  { value: '5min', label: '5 minutes before' },
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hour', label: '1 hour before' },
  { value: '2hours', label: '2 hours before' },
  { value: '1day', label: '1 day before' },
  { value: '2days', label: '2 days before' },
  { value: '1week', label: '1 week before' }
]

// Member color palette for family member distinction
const memberColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500'
]

interface EventFormState {
  title: string
  startDate: string
  endDate: string
  isMultiDay: boolean
  isAllDay: boolean
  startTime: string
  endTime: string
  description: string
  location: string
  category: EventCategory
  bookedBy: string
  attendees: string[]
  recurrence: RecurrencePattern
  recurrenceEndDate: string
  reminder: ReminderTime
  isPrivate: boolean
  notes: string
  url: string
}

const defaultFormState: EventFormState = {
  title: '',
  startDate: '',
  endDate: '',
  isMultiDay: false,
  isAllDay: false,
  startTime: '',
  endTime: '',
  description: '',
  location: '',
  category: 'other',
  bookedBy: '',
  attendees: [],
  recurrence: 'none',
  recurrenceEndDate: '',
  reminder: 'none',
  isPrivate: false,
  notes: '',
  url: ''
}

export default function CalendarSection() {
  const { currentHousehold, householdMembers } = useAuth()
  const [eventsRaw, setEvents] = useKV<CalendarEvent[]>('calendar-events', [])
  const [selectedMember] = useKV<string>('selected-member-filter', 'all')
  
  // Filter events by current household
  const allEvents = eventsRaw ?? []
  const events = currentHousehold ? allEvents.filter(e => e.householdId === currentHousehold.id) : []
  const members = householdMembers ?? []
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [eventForm, setEventForm] = useState<EventFormState>(defaultFormState)
  const [showEventDetails, setShowEventDetails] = useState<CalendarEvent | null>(null)
  const [quickEventTitle, setQuickEventTitle] = useState('')
  const [quickEventCategory, setQuickEventCategory] = useState<EventCategory>('personal')
  const [quickEventTitle, setQuickEventTitle] = useState('')
  const [quickEventCategory, setQuickEventCategory] = useState<EventCategory>('personal')

  // Multi-day selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null)

  // Calculate calendar days based on view
  const calendarData = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
      return eachDayOfInterval({ start: weekStart, end: weekEnd })
    }
    return []
  }, [currentDate, viewMode])

  // Generate recurring event instances
  const expandedEvents = useMemo(() => {
    const expanded: CalendarEvent[] = []
    const viewStart = calendarData[0] || startOfMonth(currentDate)
    const viewEnd = calendarData[calendarData.length - 1] || endOfMonth(currentDate)
    
    events.forEach(event => {
      // Add base event
      expanded.push(event)
      
      // Generate recurring instances
      if (event.recurrence && event.recurrence !== 'none') {
        const eventDate = parseISO(event.date)
        const recurrenceEnd = event.recurrenceEndDate 
          ? parseISO(event.recurrenceEndDate)
          : addYears(viewEnd, 1)
        
        let nextDate = eventDate
        let instanceCount = 0
        const maxInstances = 100 // Safety limit
        
        while (instanceCount < maxInstances) {
          // Calculate next occurrence
          switch (event.recurrence) {
            case 'daily':
              nextDate = addDays(nextDate, 1)
              break
            case 'weekly':
              nextDate = addWeeks(nextDate, 1)
              break
            case 'biweekly':
              nextDate = addWeeks(nextDate, 2)
              break
            case 'monthly':
              nextDate = addMonths(nextDate, 1)
              break
            case 'yearly':
              nextDate = addYears(nextDate, 1)
              break
          }
          
          // Check if within bounds
          if (isAfter(nextDate, recurrenceEnd) || isAfter(nextDate, viewEnd)) {
            break
          }
          
          // Only add if within view range
          if (!isBefore(nextDate, viewStart)) {
            expanded.push({
              ...event,
              id: `${event.id}-recurring-${format(nextDate, 'yyyy-MM-dd')}`,
              date: format(nextDate, 'yyyy-MM-dd'),
              recurrenceParentId: event.id
            })
          }
          
          instanceCount++
        }
      }
    })
    
    return expanded
  }, [events, calendarData, currentDate])

  const categoryLegend = useMemo(() => Object.entries(categoryConfig), [])

  // Navigation handlers
  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(addDays(currentDate, -7))
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addDays(currentDate, 7))
    }
  }

  const handleToday = () => setCurrentDate(new Date())

  // Multi-day selection handlers
  const handleDayMouseDown = (day: Date) => {
    if (!isSameMonth(day, currentDate) && viewMode === 'month') return
    setIsSelecting(true)
    setSelectionStart(day)
    setSelectionEnd(day)
  }

  const handleDayMouseEnter = (day: Date) => {
    if (isSelecting && selectionStart) {
      setSelectionEnd(day)
    }
  }

  const handleDayMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd) {
      const start = isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd
      const end = isBefore(selectionStart, selectionEnd) ? selectionEnd : selectionStart
      const daysDiff = differenceInDays(end, start)
      
      openAddEventDialog(start, daysDiff > 0 ? end : undefined)
    }
    setIsSelecting(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const isDateInSelection = (day: Date) => {
    if (!isSelecting || !selectionStart || !selectionEnd) return false
    const start = isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd
    const end = isBefore(selectionStart, selectionEnd) ? selectionEnd : selectionStart
    return isWithinInterval(day, { start, end })
  }

  // Event dialog handlers
  const openAddEventDialog = (startDate?: Date, endDate?: Date) => {
    setEditingEvent(null)
    const isMulti = !!endDate && startDate ? !isSameDay(startDate, endDate) : false
    const now = new Date()
    const rounded = new Date(Math.ceil(now.getTime() / (30 * 60 * 1000)) * 30 * 60 * 1000)
    const defaultStart = addMinutes(rounded, 30)
    const defaultEnd = addMinutes(defaultStart, 60)
    setEventForm({
      ...defaultFormState,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : format(defaultStart, 'yyyy-MM-dd'),
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : (startDate ? format(startDate, 'yyyy-MM-dd') : format(defaultStart, 'yyyy-MM-dd')),
      isMultiDay: isMulti,
      isAllDay: isMulti,
      startTime: isMulti ? '' : format(defaultStart, 'HH:mm'),
      endTime: isMulti ? '' : format(defaultEnd, 'HH:mm'),
      category: 'personal'
    })
    setDialogOpen(true)
  }

  const openEditEventDialog = (event: CalendarEvent) => {
    // If it's a recurring instance, edit the parent
    const parentEvent = event.recurrenceParentId 
      ? events.find(e => e.id === event.recurrenceParentId) || event
      : event
      
    setEditingEvent(parentEvent)
    setEventForm({
      title: parentEvent.title,
      startDate: parentEvent.date,
      endDate: parentEvent.endDate || parentEvent.date,
      isMultiDay: !!parentEvent.endDate && parentEvent.endDate !== parentEvent.date,
      isAllDay: parentEvent.isAllDay || false,
      startTime: parentEvent.startTime || '',
      endTime: parentEvent.endTime || '',
      description: parentEvent.description || '',
      location: parentEvent.location || '',
      category: parentEvent.category,
      bookedBy: parentEvent.bookedBy || '',
      attendees: parentEvent.attendees || [],
      recurrence: parentEvent.recurrence || 'none',
      recurrenceEndDate: parentEvent.recurrenceEndDate || '',
      reminder: parentEvent.reminder || 'none',
      isPrivate: parentEvent.isPrivate || false,
      notes: parentEvent.notes || '',
      url: parentEvent.url || ''
    })
    setDialogOpen(true)
  }

  const handleSaveEvent = () => {
    const titleError = validateRequired(eventForm.title, 'Event title')
    if (titleError) {
      toast.error(titleError)
      return
    }
    if (!eventForm.startDate) {
      toast.error('Please select a start date')
      return
    }

    const eventData: Partial<CalendarEvent> = {
      title: eventForm.title.trim(),
      date: eventForm.startDate,
      endDate: eventForm.isMultiDay ? eventForm.endDate : undefined,
      isAllDay: eventForm.isAllDay,
      startTime: eventForm.isAllDay ? undefined : (eventForm.startTime || undefined),
      endTime: eventForm.isAllDay ? undefined : (eventForm.endTime || undefined),
      description: eventForm.description || undefined,
      location: eventForm.location || undefined,
      category: eventForm.category,
      bookedBy: eventForm.bookedBy || undefined,
      attendees: eventForm.attendees.length > 0 ? eventForm.attendees : undefined,
      recurrence: eventForm.recurrence !== 'none' ? eventForm.recurrence : undefined,
      recurrenceEndDate: eventForm.recurrence !== 'none' && eventForm.recurrenceEndDate 
        ? eventForm.recurrenceEndDate : undefined,
      reminder: eventForm.reminder !== 'none' ? eventForm.reminder : undefined,
      isPrivate: eventForm.isPrivate || undefined,
      notes: eventForm.notes || undefined,
      url: eventForm.url || undefined
    }

    if (editingEvent) {
      setEvents((current) =>
        (current ?? []).map((evt) =>
          evt.id === editingEvent.id ? { ...evt, ...eventData } : evt
        )
      )
      toast.success('Event updated')
    } else {
      if (!currentHousehold) {
        toast.error('No household selected')
        return
      }
      
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        householdId: currentHousehold.id,
        createdAt: Date.now(),
        ...eventData
      } as CalendarEvent

      setEvents((current) => [...(current ?? []), newEvent])
      toast.success('Event added')
    }

    setDialogOpen(false)
  }

  const handleQuickEvent = () => {
    if (!currentHousehold) {
      toast.error('No household selected')
      return
    }
    const titleError = validateRequired(quickEventTitle, 'Event title')
    if (titleError) {
      toast.error(titleError)
      return
    }
    const now = new Date()
    const rounded = new Date(Math.ceil(now.getTime() / (30 * 60 * 1000)) * 30 * 60 * 1000)
    const start = addMinutes(rounded, 30)
    const end = addMinutes(start, 60)
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      householdId: currentHousehold.id,
      title: quickEventTitle.trim(),
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      category: quickEventCategory,
      isAllDay: false,
      createdAt: Date.now()
    } as CalendarEvent
    setEvents((current) => [...(current ?? []), newEvent])
    setQuickEventTitle('')
    toast.success('Event added')
  }

  const handleDeleteEvent = (id: string) => {
    // Also delete any events that have this as parent (recurring instances are virtual, but clean up real ones)
    setEvents((current) => (current ?? []).filter((evt) => 
      evt.id !== id && evt.recurrenceParentId !== id
    ))
    toast.success('Event deleted')
    setShowEventDetails(null)
  }

  const getEventsForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    let dayEvents = expandedEvents.filter((evt) => {
      // Check if single day event
      if (evt.date === dateStr) return true
      
      // Check if within multi-day range
      if (evt.endDate) {
        const eventStart = parseISO(evt.date)
        const eventEnd = parseISO(evt.endDate)
        return isWithinInterval(date, { start: eventStart, end: eventEnd })
      }
      
      return false
    })
    
    // Apply member filter
    if (selectedMember !== 'all') {
      dayEvents = dayEvents.filter((evt) => 
        evt.bookedBy === selectedMember || evt.attendees?.includes(selectedMember)
      )
    }
    
    return dayEvents.sort((a, b) => {
      // All-day events first
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      // Then by start time
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime)
      }
      return 0
    })
  }, [expandedEvents, selectedMember])

  const toggleAttendee = (memberId: string) => {
    setEventForm((prev) => ({
      ...prev,
      attendees: prev.attendees.includes(memberId)
        ? prev.attendees.filter((id) => id !== memberId)
        : [...prev.attendees, memberId]
    }))
  }

  // Get today's events for overview
  const todayEvents = useMemo(() => {
    return getEventsForDay(new Date())
  }, [getEventsForDay])

  // Get upcoming events (next 14 days)
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date())
    const twoWeeksLater = addDays(today, 14)
    
    return expandedEvents
      .filter((evt) => {
        const evtDate = parseISO(evt.date)
        return !isBefore(evtDate, today) && !isAfter(evtDate, twoWeeksLater)
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
        return 0
      })
      .slice(0, 10)
  }, [expandedEvents])

  // Render event badge on calendar
  const renderEventBadge = (event: CalendarEvent, compact = false) => {
    const config = categoryConfig[event.category]
    const isMultiDay = event.endDate && event.endDate !== event.date
    const isAllDay = event.isAllDay || (!event.startTime && !event.endTime)

    return (
      <div
        key={event.id}
        className={`
          ${compact ? 'text-[10px] p-0.5' : 'text-xs p-1'} 
          rounded border ${config.color} 
          cursor-pointer truncate flex items-center gap-1
          ${isMultiDay ? 'rounded-none first:rounded-l last:rounded-r' : ''}
          ${isAllDay ? 'border-dashed' : ''}
        `}
        onClick={(e) => {
          e.stopPropagation()
          setShowEventDetails(event)
        }}
      >
        {event.recurrence && event.recurrence !== 'none' && (
          <Repeat size={compact ? 8 : 10} className="flex-shrink-0" />
        )}
        {!compact && event.startTime && !event.isAllDay && (
          <span className="font-semibold">{event.startTime}</span>
        )}
        {isAllDay && !compact && <span className="text-[10px] uppercase">All day</span>}
        <span className="truncate">{event.title}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6" onMouseUp={handleDayMouseUp} onMouseLeave={handleDayMouseUp}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Calendar</h2>
          <p className="text-sm text-muted-foreground">
            {selectedMember === 'all'
              ? 'Shared household events and bookings'
              : `${selectedMember}'s events and bookings`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month" className="gap-1">
                <SquaresFour size={14} />
                <span className="hidden sm:inline">Month</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-1">
                <ListBullets size={14} />
                <span className="hidden sm:inline">Week</span>
              </TabsTrigger>
              <TabsTrigger value="agenda" className="gap-1">
                <CalendarCheck size={14} />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => openAddEventDialog()} className="gap-2">
            <Plus />
            <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
      </div>

      {/* Quick Add Event */}
      <Card className="p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Quick add event"
            value={quickEventTitle}
            onChange={(e) => setQuickEventTitle(e.target.value)}
          />
          <Select value={quickEventCategory} onValueChange={(v) => setQuickEventCategory(v as EventCategory)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(categoryConfig).map((key) => (
                <SelectItem key={key} value={key}>
                  {categoryConfig[key as EventCategory].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleQuickEvent} className="whitespace-nowrap">
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </Card>

      {/* Today's Overview Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sun className="text-primary" size={20} />
              <h3 className="font-semibold">Today - {format(new Date(), 'EEEE, MMMM d')}</h3>
            </div>
            <Badge variant="secondary">{todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}</Badge>
          </div>
          {todayEvents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {todayEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 cursor-pointer ${categoryConfig[event.category].color}`}
                  onClick={() => setShowEventDetails(event)}
                >
                  {event.startTime && !event.isAllDay && (
                    <span className="font-semibold">{event.startTime}</span>
                  )}
                  {event.isAllDay && <span className="font-semibold">All day</span>}
                  <span>{event.title}</span>
                </div>
              ))}
              {todayEvents.length > 5 && (
                <Badge variant="outline">+{todayEvents.length - 5} more</Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No events scheduled for today</p>
          )}
        </CardContent>
      </Card>

      {/* Main Calendar */}
      {viewMode !== 'agenda' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <CaretLeft />
              </Button>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <h3 className="text-xl sm:text-2xl font-bold">
                  {viewMode === 'month' 
                    ? format(currentDate, 'MMMM yyyy')
                    : `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`
                  }
                </h3>
                <Button variant="ghost" size="sm" onClick={handleToday}>
                  Today
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <CaretRight />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              💡 Click and drag across multiple days to create multi-day events. Use the Today button to jump back.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {categoryLegend.map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <Badge key={key} variant="outline" className="gap-1 text-[11px]">
                    <Icon size={12} />
                    {cfg.label}
                  </Badge>
                )
              })}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-7 gap-1 sm:gap-2 ${viewMode === 'week' ? 'min-h-[400px]' : ''}`}>
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs sm:text-sm font-semibold text-muted-foreground py-2">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}

              {/* Calendar days */}
              {calendarData.map((day) => {
                const dayEvents = getEventsForDay(day)
                const isDayToday = isToday(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = isDateInSelection(day)
                const allDayEvents = dayEvents.filter((e) => e.isAllDay)
                const timedEvents = dayEvents.filter((e) => !e.isAllDay)

                return (
                  <div
                    key={day.toString()}
                    className={`
                      ${viewMode === 'week' ? 'min-h-[350px]' : 'min-h-16 sm:min-h-24'} 
                      border rounded-lg p-1 sm:p-2 transition-colors select-none
                      ${isDayToday ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : ''}
                      ${isSelected ? 'bg-primary/20 border-primary' : ''}
                      ${!isDayToday && !isSelected && (isCurrentMonth ? 'border-border hover:bg-accent/10' : 'border-border bg-muted/30')}
                      ${isCurrentMonth ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    onMouseDown={() => handleDayMouseDown(day)}
                    onMouseEnter={() => handleDayMouseEnter(day)}
                  >
                    <div
                      className={`
                        text-xs sm:text-sm font-semibold mb-1 
                        ${isDayToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''}
                        ${!isDayToday && (isCurrentMonth ? 'text-foreground' : 'text-muted-foreground')}
                      `}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 overflow-hidden">
                      {allDayEvents.slice(0, viewMode === 'week' ? 6 : 2).map((event) =>
                        renderEventBadge({ ...event, isAllDay: true }, viewMode === 'month')
                      )}
                      {timedEvents.slice(0, viewMode === 'week' ? 6 : 2).map((event) =>
                        renderEventBadge(event, viewMode === 'month')
                      )}
                      {dayEvents.length > (viewMode === 'week' ? 12 : 4) && (
                        <div className="text-[10px] sm:text-xs text-muted-foreground text-center">
                          +{dayEvents.length - (viewMode === 'week' ? 12 : 4)} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agenda View */}
      {viewMode === 'agenda' && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event, idx) => {
                  const config = categoryConfig[event.category]
                  const showDateHeader = idx === 0 || 
                    upcomingEvents[idx - 1].date !== event.date
                  
                  return (
                    <div key={event.id}>
                      {showDateHeader && (
                        <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                          <div className={`h-px flex-1 ${isToday(parseISO(event.date)) ? 'bg-primary' : 'bg-border'}`} />
                          <span className={`text-sm font-medium ${isToday(parseISO(event.date)) ? 'text-primary' : 'text-muted-foreground'}`}>
                            {isToday(parseISO(event.date)) ? 'Today' : format(parseISO(event.date), 'EEEE, MMM d')}
                          </span>
                          <div className={`h-px flex-1 ${isToday(parseISO(event.date)) ? 'bg-primary' : 'bg-border'}`} />
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-lg border ${config.color} cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => setShowEventDetails(event)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold flex items-center gap-2">
                              {event.title}
                              {event.recurrence && event.recurrence !== 'none' && (
                                <Repeat size={14} />
                              )}
                            </div>
                            {!event.isAllDay && event.startTime && (
                              <div className="text-sm flex items-center gap-1 mt-1">
                                <Clock size={12} />
                                {event.startTime}
                                {event.endTime && ` - ${event.endTime}`}
                              </div>
                            )}
                            {event.isAllDay && (
                              <div className="text-sm mt-1">All day</div>
                            )}
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            {config.label}
                          </Badge>
                        </div>
                        {event.location && (
                          <div className="text-sm flex items-center gap-1 mt-2">
                            <MapPin size={12} />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarBlank size={48} className="mx-auto mb-3 opacity-50" />
                <p>No upcoming events in the next 2 weeks</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(categoryConfig).map(([category, config]) => {
                const count = events.filter((e) => e.category === category).length
                if (count === 0) return null
                const Icon = config.icon
                return (
                  <div
                    key={category}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${config.color}`}
                  >
                    <Icon size={16} />
                    <span className="text-sm font-medium flex-1">{config.label}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm">Total Events</span>
                <Badge>{events.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm">Recurring Events</span>
                <Badge>{events.filter(e => e.recurrence && e.recurrence !== 'none').length}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm">Multi-day Events</span>
                <Badge>{events.filter(e => e.endDate && e.endDate !== e.date).length}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm">This Month</span>
                <Badge>
                  {events.filter(e => {
                    const eventDate = parseISO(e.date)
                    return isSameMonth(eventDate, currentDate)
                  }).length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Modal */}
      <Dialog open={!!showEventDetails} onOpenChange={() => setShowEventDetails(null)}>
        <DialogContent className="max-w-md">
          {showEventDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = categoryConfig[showEventDetails.category].icon
                    return <Icon size={20} />
                  })()}
                  {showEventDetails.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${categoryConfig[showEventDetails.category].color}`}>
                  <Badge variant="outline">{categoryConfig[showEventDetails.category].label}</Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-muted-foreground" />
                    <span>
                      {format(parseISO(showEventDetails.date), 'EEEE, MMMM d, yyyy')}
                      {showEventDetails.endDate && showEventDetails.endDate !== showEventDetails.date && (
                        <> - {format(parseISO(showEventDetails.endDate), 'MMMM d, yyyy')}</>
                      )}
                    </span>
                  </div>
                  
                  {!showEventDetails.isAllDay && showEventDetails.startTime && (
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-muted-foreground" />
                      <span>
                        {showEventDetails.startTime}
                        {showEventDetails.endTime && ` - ${showEventDetails.endTime}`}
                      </span>
                    </div>
                  )}
                  
                  {showEventDetails.isAllDay && (
                    <div className="flex items-center gap-2">
                      <Sun size={16} className="text-muted-foreground" />
                      <span>All day event</span>
                    </div>
                  )}
                  
                  {showEventDetails.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-muted-foreground" />
                      <span>{showEventDetails.location}</span>
                    </div>
                  )}
                  
                  {showEventDetails.recurrence && showEventDetails.recurrence !== 'none' && (
                    <div className="flex items-center gap-2">
                      <Repeat size={16} className="text-muted-foreground" />
                      <span className="capitalize">{showEventDetails.recurrence}</span>
                    </div>
                  )}
                  
                  {showEventDetails.reminder && showEventDetails.reminder !== 'none' && (
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-muted-foreground" />
                      <span>
                        {reminderOptions.find(r => r.value === showEventDetails.reminder)?.label}
                      </span>
                    </div>
                  )}
                  
                  {showEventDetails.bookedBy && (
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-muted-foreground" />
                      <span>Booked by: {showEventDetails.bookedBy}</span>
                    </div>
                  )}
                  
                  {showEventDetails.url && (
                    <div className="flex items-center gap-2">
                      <LinkIcon size={16} className="text-muted-foreground" />
                      <a 
                        href={showEventDetails.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {showEventDetails.url}
                      </a>
                    </div>
                  )}
                </div>
                
                {showEventDetails.description && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm">{showEventDetails.description}</p>
                  </div>
                )}
                
                {showEventDetails.attendees && showEventDetails.attendees.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Attendees</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {showEventDetails.attendees.map(id => {
                        const member = members.find(m => m.id === id)
                        return (
                          <Badge key={id} variant="secondary">
                            {member?.displayName || id}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowEventDetails(null)
                      openEditEventDialog(showEventDetails)
                    }}
                  >
                    <Pencil size={14} className="mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => handleDeleteEvent(showEventDetails.recurrenceParentId || showEventDetails.id)}
                  >
                    <Trash size={14} className="mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title *</Label>
              <Input
                id="event-title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="e.g., Family vacation, Doctor's appointment"
              />
            </div>

            {/* Multi-day toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <ArrowsOutSimple size={18} />
                <Label htmlFor="multi-day" className="cursor-pointer">Multi-day event</Label>
              </div>
              <Switch
                id="multi-day"
                checked={eventForm.isMultiDay}
                onCheckedChange={(checked) => setEventForm({ 
                  ...eventForm, 
                  isMultiDay: checked,
                  endDate: checked ? eventForm.endDate : eventForm.startDate
                })}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">{eventForm.isMultiDay ? 'Start Date *' : 'Date *'}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm({ 
                    ...eventForm, 
                    startDate: e.target.value,
                    endDate: !eventForm.isMultiDay ? e.target.value : eventForm.endDate
                  })}
                />
              </div>
              {eventForm.isMultiDay && (
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={eventForm.endDate}
                    min={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* All day toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Sun size={18} />
                <Label htmlFor="all-day" className="cursor-pointer">All-day event</Label>
              </div>
              <Switch
                id="all-day"
                checked={eventForm.isAllDay}
                onCheckedChange={(checked) => setEventForm({ ...eventForm, isAllDay: checked })}
              />
            </div>

            {/* Time (only if not all-day) */}
            {!eventForm.isAllDay && (
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
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEventForm({ ...eventForm, category: key as EventCategory })}
                      className={`
                        p-2 rounded-lg border text-xs flex flex-col items-center gap-1 transition-all
                        ${eventForm.category === key 
                          ? `${config.color} ring-2 ring-offset-2 ring-primary` 
                          : 'hover:bg-muted'
                        }
                      `}
                    >
                      <Icon size={16} />
                      <span className="truncate w-full text-center">{config.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="event-location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="e.g., Beach house, Main Street Clinic"
                  className="pl-9"
                />
              </div>
            </div>

            {/* Recurrence */}
            <div className="space-y-2">
              <Label htmlFor="recurrence">Repeat</Label>
              <Select
                value={eventForm.recurrence}
                onValueChange={(value) => setEventForm({ ...eventForm, recurrence: value as RecurrencePattern })}
              >
                <SelectTrigger id="recurrence">
                  <Repeat size={14} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurrence End Date */}
            {eventForm.recurrence !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="recurrence-end">Repeat Until (optional)</Label>
                <Input
                  id="recurrence-end"
                  type="date"
                  value={eventForm.recurrenceEndDate}
                  min={eventForm.startDate}
                  onChange={(e) => setEventForm({ ...eventForm, recurrenceEndDate: e.target.value })}
                />
              </div>
            )}

            {/* Reminder */}
            <div className="space-y-2">
              <Label htmlFor="reminder">Reminder</Label>
              <Select
                value={eventForm.reminder}
                onValueChange={(value) => setEventForm({ ...eventForm, reminder: value as ReminderTime })}
              >
                <SelectTrigger id="reminder">
                  <Bell size={14} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Booked By */}
            <div className="space-y-2">
              <Label htmlFor="booked-by">Organized By</Label>
              <Input
                id="booked-by"
                value={eventForm.bookedBy}
                onChange={(e) => setEventForm({ ...eventForm, bookedBy: e.target.value })}
                placeholder="Who organized or booked this event?"
              />
            </div>

            {/* Attendees */}
            {members.length > 0 && (
              <div className="space-y-2">
                <Label>Family Members Attending</Label>
                <div className="flex flex-wrap gap-2">
                  {members.map((member, idx) => (
                    <Badge
                      key={member.id}
                      variant={eventForm.attendees.includes(member.id) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-all ${
                        eventForm.attendees.includes(member.id) 
                          ? memberColors[idx % memberColors.length] + ' text-white'
                          : ''
                      }`}
                      onClick={() => toggleAttendee(member.id)}
                    >
                      {eventForm.attendees.includes(member.id) && <Check size={12} className="mr-1" />}
                      {member.displayName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="event-url">Link/URL (optional)</Label>
              <div className="relative">
                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="event-url"
                  value={eventForm.url}
                  onChange={(e) => setEventForm({ ...eventForm, url: e.target.value })}
                  placeholder="https://..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Description */}
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

            {/* Private toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {eventForm.isPrivate ? <EyeSlash size={18} /> : <Eye size={18} />}
                <Label htmlFor="private" className="cursor-pointer">Private event</Label>
              </div>
              <Switch
                id="private"
                checked={eventForm.isPrivate}
                onCheckedChange={(checked) => setEventForm({ ...eventForm, isPrivate: checked })}
              />
            </div>

            {/* Actions */}
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

      {/* Empty State */}
      {events.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarBlank size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No events yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click on any day or drag across multiple days to create your first event
          </p>
          <Button onClick={() => openAddEventDialog(new Date())}>
            <Plus className="mr-2" />
            Add Your First Event
          </Button>
        </Card>
      )}
    </div>
  )
}
