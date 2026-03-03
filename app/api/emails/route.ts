// API route: GET /api/emails - fetch emails with summaries
// API route: DELETE /api/emails - delete an email

import { NextRequest, NextResponse } from 'next/server';
import { getEmailService } from '@/lib/services/email.service';
import type { ApiResponse, EmailSummary } from '@/types';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<EmailSummary[]>>> {
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
    const emailService = getEmailService(accessToken);

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const emails = await emailService.getEmailsWithSummaries(limit);

    return NextResponse.json({
      success: true,
      data: emails,
    });
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch emails';
    // Check for token-related errors and return a user-friendly message
    const isTokenError = message.includes('IDX14100') || message.includes('JWT') || message.includes('token') || message.includes('401');
    return NextResponse.json(
      {
        success: false,
        error: isTokenError
          ? 'Your session has expired. Please sign out and sign in again.'
          : message,
      },
      { status: isTokenError ? 401 : 500 }
    );
  }
}
