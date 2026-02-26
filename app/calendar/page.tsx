'use client';

import { useState, useMemo } from 'react';
import { DashboardShell } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCalendar } from '@/hooks/useCalendar';
import { ChatWidget } from '@/components/modules/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Video,
  Users,
  ExternalLink,
  RefreshCw,
  LogIn,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types';

export default function CalendarPage() {
  const { isAuthenticated, user, login, logout, accessToken } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    subject: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    isAllDay: false,
  });

  // Calculate start and end of current month for fetching events
  const startOfMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    [currentDate]
  );
  const endOfMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59),
    [currentDate]
  );

  const {
    events,
    isLoading,
    error,
    refetch,
    createEvent,
    deleteEvent,
    isCreating,
    isDeleting,
  } = useCalendar({
    accessToken,
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  const currentMonth = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Generate calendar days for current month
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {};
    events.forEach((event) => {
      const eventDate = new Date(event.start);
      if (
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      ) {
        const day = eventDate.getDate();
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(event);
      }
    });
    return grouped;
  }, [events, currentDate]);

  // Get events for selected date
  const selectedDateEvents = selectedDate ? eventsByDay[selectedDate] || [] : [];

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(today.getDate());
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success('Calendar refreshed');
  };

  const handleCreateEvent = async () => {
    if (!newEvent.subject || !newEvent.startDate || !newEvent.endDate) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const startDateTime = newEvent.isAllDay
        ? new Date(newEvent.startDate)
        : new Date(`${newEvent.startDate}T${newEvent.startTime || '09:00'}`);
      const endDateTime = newEvent.isAllDay
        ? new Date(newEvent.endDate)
        : new Date(`${newEvent.endDate}T${newEvent.endTime || '10:00'}`);

      await createEvent({
        subject: newEvent.subject,
        start: startDateTime,
        end: endDateTime,
        location: newEvent.location || undefined,
        isAllDay: newEvent.isAllDay,
        isOnline: false,
        importance: 'normal',
        showAs: 'busy',
      });

      toast.success('Event created');
      setIsCreateDialogOpen(false);
      setNewEvent({
        subject: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        location: '',
        isAllDay: false,
      });
    } catch {
      toast.error('Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      toast.success('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.isAllDay) return 'All day';
    const start = new Date(event.start);
    const end = new Date(event.end);
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.importance === 'high') return 'bg-red-500';
    if (event.isOnline) return 'bg-blue-500';
    return 'bg-primary';
  };

  return (
    <DashboardShell
      user={
        user
          ? { name: user.name || user.username || 'User', email: user.username || '' }
          : undefined
      }
      onSignOut={logout}
    >
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">Manage your schedule</p>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Event</DialogTitle>
                      <DialogDescription>
                        Add a new event to your Outlook calendar.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="subject">Title *</Label>
                        <Input
                          id="subject"
                          value={newEvent.subject}
                          onChange={(e) =>
                            setNewEvent({ ...newEvent, subject: e.target.value })
                          }
                          placeholder="Event title"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allDay"
                          checked={newEvent.isAllDay}
                          onChange={(e) =>
                            setNewEvent({ ...newEvent, isAllDay: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <Label htmlFor="allDay">All day event</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="startDate">Start Date *</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={newEvent.startDate}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, startDate: e.target.value })
                            }
                          />
                        </div>
                        {!newEvent.isAllDay && (
                          <div className="grid gap-2">
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input
                              id="startTime"
                              type="time"
                              value={newEvent.startTime}
                              onChange={(e) =>
                                setNewEvent({ ...newEvent, startTime: e.target.value })
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="endDate">End Date *</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={newEvent.endDate}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, endDate: e.target.value })
                            }
                          />
                        </div>
                        {!newEvent.isAllDay && (
                          <div className="grid gap-2">
                            <Label htmlFor="endTime">End Time</Label>
                            <Input
                              id="endTime"
                              type="time"
                              value={newEvent.endTime}
                              onChange={(e) =>
                                setNewEvent({ ...newEvent, endTime: e.target.value })
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={newEvent.location}
                          onChange={(e) =>
                            setNewEvent({ ...newEvent, location: e.target.value })
                          }
                          placeholder="Add location"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreateEvent} disabled={isCreating}>
                        {isCreating ? 'Creating...' : 'Create Event'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-2xl border bg-card overflow-hidden">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connect your calendar</h2>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Connect your Outlook account to view and manage your calendar events.
              </p>
              <Button onClick={login}>
                <LogIn className="h-4 w-4 mr-2" />
                Connect Outlook
              </Button>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error loading calendar</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh}>Try Again</Button>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Calendar Grid */}
              <div className="flex-1 border-r">
                {/* Calendar Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold min-w-[200px] text-center">
                      {currentMonth}
                    </h2>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="p-4">
                  {/* Week days header */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Days grid */}
                  {isLoading ? (
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {days.map((day, index) => {
                        const hasEvents = day && eventsByDay[day]?.length > 0;
                        const isToday = isCurrentMonth && day === today.getDate();
                        const isSelected = day === selectedDate;

                        return (
                          <div
                            key={index}
                            onClick={() => day && setSelectedDate(day)}
                            className={cn(
                              'aspect-square p-2 rounded-lg text-sm relative transition-colors',
                              day ? 'hover:bg-muted cursor-pointer' : '',
                              isToday && !isSelected
                                ? 'bg-primary/10 text-primary font-bold'
                                : '',
                              isSelected
                                ? 'bg-primary text-primary-foreground font-bold'
                                : ''
                            )}
                          >
                            {day}
                            {hasEvents && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                {eventsByDay[day].slice(0, 3).map((event, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'h-1.5 w-1.5 rounded-full',
                                      isSelected ? 'bg-primary-foreground' : getEventColor(event)
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Events Panel */}
              <div className="w-80 flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">
                    {selectedDate
                      ? new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth(),
                          selectedDate
                        ).toLocaleDateString('default', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Select a date'}
                  </h3>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {selectedDate ? (
                    selectedDateEvents.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDateEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'h-2 w-2 rounded-full shrink-0',
                                    getEventColor(event)
                                  )}
                                />
                                <h4 className="font-medium text-sm">{event.subject}</h4>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                onClick={() => handleDeleteEvent(event.id)}
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatEventTime(event)}
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </div>
                              )}
                              {event.isOnline && event.onlineMeetingUrl && (
                                <a
                                  href={event.onlineMeetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Video className="h-3 w-3" />
                                  Join meeting
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {event.attendees.length} attendee
                                  {event.attendees.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                            {event.importance === 'high' && (
                              <Badge variant="destructive" className="mt-2 text-xs">
                                High Priority
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 text-center">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No events on this day
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
                            setNewEvent({
                              ...newEvent,
                              startDate: dateStr,
                              endDate: dateStr,
                            });
                            setIsCreateDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add event
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <CalendarIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click on a date to see events
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>

      <ChatWidget />
    </DashboardShell>
  );
}
