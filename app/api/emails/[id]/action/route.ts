// API route: POST /api/emails/[id]/action - execute an action on an email

import { NextRequest, NextResponse } from 'next/server';
import { getEmailService } from '@/lib/services/email.service';
import type { ApiResponse } from '@/types';

interface ActionRequest {
  actionType: 'reply' | 'archive' | 'forward' | 'schedule' | 'flag' | 'none';
}

interface ActionResult {
  success: boolean;
  message: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ActionResult>>> {
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

    // Parse request body
    const body = (await request.json()) as ActionRequest;
    const { actionType } = body;

    if (!actionType) {
      return NextResponse.json(
        { success: false, error: 'Action type is required' },
        { status: 400 }
      );
    }

    const result = await emailService.executeAction(id, actionType);

    return NextResponse.json({
      success: result.success,
      data: result,
      error: result.success ? undefined : result.message,
    });
  } catch (error) {
    console.error('Failed to execute action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute action',
      },
      { status: 500 }
    );
  }
}
