// Outlook calendar adapter using Microsoft Graph API

import { Client } from '@microsoft/microsoft-graph-client';
import type { CalendarEvent } from '@/types';
import type { CalendarAdapter, CalendarAdapterConfig } from './types';

export class OutlookCalendarAdapter implements CalendarAdapter {
  private client: Client | null = null;
  private accessToken: string | null = null;

  constructor(config?: CalendarAdapterConfig) {
    if (config?.accessToken) {
      this.setAccessToken(config.accessToken);
    }
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    this.client = Client.init({
      authProvider: (done) => {
        done(null, token);
      },
    });
  }

  isAuthenticated(): boolean {
    return this.client !== null && this.accessToken !== null;
  }

  async fetchEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client
        .api('/me/calendarView')
        .query({
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
        })
        .select(
          'id,subject,body,start,end,location,isAllDay,organizer,attendees,webLink,isOnlineMeeting,onlineMeetingUrl,categories,importance,showAs'
        )
        .orderby('start/dateTime')
        .top(100)
        .get();

      return response.value.map(this.mapGraphEventToCalendarEvent);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      throw error;
    }
  }

  async getEvent(id: string): Promise<CalendarEvent | null> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      const event = await this.client
        .api(`/me/events/${id}`)
        .select(
          'id,subject,body,start,end,location,isAllDay,organizer,attendees,webLink,isOnlineMeeting,onlineMeetingUrl,categories,importance,showAs'
        )
        .get();

      return this.mapGraphEventToCalendarEvent(event);
    } catch (error) {
      console.error('Failed to get calendar event:', error);
      return null;
    }
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      const graphEvent = {
        subject: event.subject,
        body: event.body
          ? {
              contentType: 'Text',
              content: event.body,
            }
          : undefined,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location: event.location
          ? {
              displayName: event.location,
            }
          : undefined,
        isAllDay: event.isAllDay,
        attendees: event.attendees?.map((a) => ({
          emailAddress: {
            address: a.email,
            name: a.name,
          },
          type: 'required',
        })),
        isOnlineMeeting: event.isOnline,
        importance: event.importance,
      };

      const response = await this.client.api('/me/events').post(graphEvent);
      return this.mapGraphEventToCalendarEvent(response);
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  async updateEvent(
    id: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent | null> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      const graphEvent: Record<string, unknown> = {};

      if (event.subject) graphEvent.subject = event.subject;
      if (event.body) {
        graphEvent.body = {
          contentType: 'Text',
          content: event.body,
        };
      }
      if (event.start) {
        graphEvent.start = {
          dateTime: event.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      if (event.end) {
        graphEvent.end = {
          dateTime: event.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      if (event.location !== undefined) {
        graphEvent.location = event.location
          ? { displayName: event.location }
          : null;
      }
      if (event.isAllDay !== undefined) graphEvent.isAllDay = event.isAllDay;
      if (event.importance) graphEvent.importance = event.importance;

      const response = await this.client.api(`/me/events/${id}`).patch(graphEvent);
      return this.mapGraphEventToCalendarEvent(response);
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      return null;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.api(`/me/events/${id}`).delete();
      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      return false;
    }
  }

  private mapGraphEventToCalendarEvent(
    graphEvent: Record<string, unknown>
  ): CalendarEvent {
    const start = graphEvent.start as { dateTime?: string } | undefined;
    const end = graphEvent.end as { dateTime?: string } | undefined;
    const location = graphEvent.location as { displayName?: string } | undefined;
    const organizer = graphEvent.organizer as {
      emailAddress?: { name?: string; address?: string };
    } | undefined;
    const attendees = graphEvent.attendees as Array<{
      emailAddress?: { name?: string; address?: string };
      status?: { response?: string };
    }> | undefined;
    const body = graphEvent.body as { content?: string } | undefined;

    return {
      id: graphEvent.id as string,
      subject: (graphEvent.subject as string) || '(No Subject)',
      body: body?.content || undefined,
      start: new Date(start?.dateTime || new Date()),
      end: new Date(end?.dateTime || new Date()),
      location: location?.displayName || undefined,
      isAllDay: (graphEvent.isAllDay as boolean) || false,
      organizer: organizer?.emailAddress
        ? {
            name: organizer.emailAddress.name || 'Unknown',
            email: organizer.emailAddress.address || '',
          }
        : undefined,
      attendees: attendees?.map((a) => ({
        name: a.emailAddress?.name || 'Unknown',
        email: a.emailAddress?.address || '',
        status: this.mapResponseStatus(a.status?.response),
      })),
      webLink: graphEvent.webLink as string | undefined,
      isOnline: (graphEvent.isOnlineMeeting as boolean) || false,
      onlineMeetingUrl: graphEvent.onlineMeetingUrl as string | undefined,
      categories: graphEvent.categories as string[] | undefined,
      importance: this.mapImportance(graphEvent.importance as string),
      showAs: this.mapShowAs(graphEvent.showAs as string),
    };
  }

  private mapResponseStatus(
    status?: string
  ): 'accepted' | 'declined' | 'tentative' | 'none' {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'accepted';
      case 'declined':
        return 'declined';
      case 'tentativelyaccepted':
      case 'tentative':
        return 'tentative';
      default:
        return 'none';
    }
  }

  private mapImportance(importance?: string): 'low' | 'normal' | 'high' {
    switch (importance?.toLowerCase()) {
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  private mapShowAs(
    showAs?: string
  ): 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown' {
    switch (showAs?.toLowerCase()) {
      case 'free':
        return 'free';
      case 'tentative':
        return 'tentative';
      case 'busy':
        return 'busy';
      case 'oof':
        return 'oof';
      case 'workingelsewhere':
        return 'workingElsewhere';
      default:
        return 'unknown';
    }
  }
}
