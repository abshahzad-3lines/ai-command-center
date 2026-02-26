// API route: GET /api/calendar - fetch calendar events
// API route: POST /api/calendar - create a calendar event

import { NextRequest, NextResponse } from 'next/server';
import { OutlookCalendarAdapter } from '@/lib/adapters/calendar';
import type { ApiResponse, CalendarEvent } from '@/types';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CalendarEvent[]>>> {
  try {
    // Get access token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split(' ')[1];
    const calendarAdapter = new OutlookCalendarAdapter({ accessToken });

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Default to current month if not specified
    const now = new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const events = await calendarAdapter.fetchEvents(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendar events',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CalendarEvent>>> {
  try {
    // Get access token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split(' ')[1];
    const calendarAdapter = new OutlookCalendarAdapter({ accessToken });

    const body = await request.json();

    // Convert date strings to Date objects
    const eventData = {
      ...body,
      start: new Date(body.start),
      end: new Date(body.end),
    };

    const event = await calendarAdapter.createEvent(eventData);

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create calendar event',
      },
      { status: 500 }
    );
  }
}
