// API route: DELETE /api/emails/[id] - delete a specific email

import { NextRequest, NextResponse } from 'next/server';
import { getEmailService } from '@/lib/services/email.service';
import type { ApiResponse } from '@/types';

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
    const emailService = getEmailService(accessToken);

    const deleted = await emailService.deleteEmail(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Failed to delete email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete email',
      },
      { status: 500 }
    );
  }
}
