/**
 * AI tool definitions for calendar operations via Outlook/Microsoft Graph
 */

import type { ClaudeTool } from '@/lib/adapters/ai/claude.adapter';

export const calendarTools: ClaudeTool[] = [
  {
    name: 'search_calendar_events',
    description:
      'Search the user\'s Outlook calendar for events in a date range. ' +
      'Returns events with subject, start/end times, location, and attendees. ' +
      'Use this when the user asks about their schedule, meetings, or calendar.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD). Default: today. Example: "2026-03-02"',
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD). Default: 7 days from start. Example: "2026-03-09"',
        },
      },
    },
  },
  {
    name: 'create_calendar_event',
    description:
      'Create a new event on the user\'s Outlook calendar. This is a WRITE action. ' +
      'Use this when the user asks to schedule a meeting, create an event, or add something to their calendar.',
    input_schema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'The event title. Example: "Team Standup"',
        },
        start: {
          type: 'string',
          description: 'Start datetime in ISO format. Example: "2026-03-03T09:00:00"',
        },
        end: {
          type: 'string',
          description: 'End datetime in ISO format. Example: "2026-03-03T10:00:00"',
        },
        location: {
          type: 'string',
          description: 'Optional event location. Example: "Conference Room A"',
        },
        is_all_day: {
          type: 'boolean',
          description: 'Whether this is an all-day event. Default: false.',
        },
      },
      required: ['subject', 'start', 'end'],
    },
  },
];
