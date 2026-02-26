'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalendarEvent, ApiResponse } from '@/types';

interface UseCalendarOptions {
  accessToken?: string | null;
  startDate?: Date;
  endDate?: Date;
}

async function fetchEvents(
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const response = await fetch(`/api/calendar?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data: ApiResponse<CalendarEvent[]> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch calendar events');
  }

  // Convert date strings back to Date objects
  return data.data.map((event) => ({
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
  }));
}

async function createEvent(
  accessToken: string,
  event: Omit<CalendarEvent, 'id'>
): Promise<CalendarEvent> {
  const response = await fetch('/api/calendar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  const data: ApiResponse<CalendarEvent> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to create event');
  }

  return {
    ...data.data,
    start: new Date(data.data.start),
    end: new Date(data.data.end),
  };
}

async function updateEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const response = await fetch(`/api/calendar/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  const data: ApiResponse<CalendarEvent> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to update event');
  }

  return {
    ...data.data,
    start: new Date(data.data.start),
    end: new Date(data.data.end),
  };
}

async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  const response = await fetch(`/api/calendar/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data: ApiResponse<{ deleted: boolean }> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete event');
  }
}

export function useCalendar({ accessToken, startDate, endDate }: UseCalendarOptions) {
  const queryClient = useQueryClient();

  // Default to current month if not specified
  const defaultStart =
    startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const defaultEnd =
    endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const eventsQuery = useQuery({
    queryKey: ['calendar', accessToken, defaultStart.toISOString(), defaultEnd.toISOString()],
    queryFn: () => fetchEvents(accessToken!, defaultStart, defaultEnd),
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (event: Omit<CalendarEvent, 'id'>) => createEvent(accessToken!, event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, event }: { eventId: string; event: Partial<CalendarEvent> }) =>
      updateEvent(accessToken!, eventId, event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteEvent(accessToken!, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error?.message || null,
    refetch: eventsQuery.refetch,
    createEvent: createMutation.mutateAsync,
    updateEvent: (eventId: string, event: Partial<CalendarEvent>) =>
      updateMutation.mutateAsync({ eventId, event }),
    deleteEvent: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
