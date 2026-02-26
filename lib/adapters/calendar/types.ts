// Calendar adapter types

import type { CalendarEvent } from '@/types';

export interface CalendarAdapterConfig {
  accessToken?: string;
}

export interface CalendarAdapter {
  setAccessToken(token: string): void;
  isAuthenticated(): boolean;
  fetchEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  getEvent(id: string): Promise<CalendarEvent | null>;
  createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent>;
  updateEvent(id: string, event: Partial<CalendarEvent>): Promise<CalendarEvent | null>;
  deleteEvent(id: string): Promise<boolean>;
}
