/**
 * POST /api/emails/send - Send a new email via Outlook
 */

import { NextRequest, NextResponse } from 'next/server';
import { OutlookAdapter } from '@/lib/adapters/email/outlook.adapter';
import type { ApiResponse } from '@/types';

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ sent: boolean }>>> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split(' ')[1];
    const body = await request.json();
    const { to, subject, body: emailBody, cc, bcc } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient (to) is required' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!emailBody || typeof emailBody !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Body is required' },
        { status: 400 }
      );
    }

    const adapter = new OutlookAdapter({ accessToken });
    const sent = await adapter.sendEmail(to, subject, emailBody, cc, bcc);

    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { sent: true },
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      },
      { status: 500 }
    );
  }
}
