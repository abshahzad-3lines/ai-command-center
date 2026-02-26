// API route: GET /api/calendar/[id] - get a single event
// API route: PATCH /api/calendar/[id] - update an event
// API route: DELETE /api/calendar/[id] - delete an event

import { NextRequest, NextResponse } from 'next/server';
import { OutlookCalendarAdapter } from '@/lib/adapters/calendar';
import type { ApiResponse, CalendarEvent } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<CalendarEvent | null>>> {
  try {
    const { id } = await params;

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

    const event = await calendarAdapter.getEvent(id);

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Failed to get calendar event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get calendar event',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<CalendarEvent | null>>> {
  try {
    const { id } = await params;

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

    // Convert date strings to Date objects if present
    const eventData: Record<string, unknown> = { ...body };
    if (body.start) eventData.start = new Date(body.start);
    if (body.end) eventData.end = new Date(body.end);

    const event = await calendarAdapter.updateEvent(id, eventData);

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update calendar event',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { id } = await params;

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

    const deleted = await calendarAdapter.deleteEvent(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete calendar event',
      },
      { status: 500 }
    );
  }
}
