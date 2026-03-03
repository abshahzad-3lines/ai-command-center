/**
 * POST /api/emails/generate-reply
 * Uses Claude to generate an AI email reply draft with a specified tone.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/config';

type Tone = 'formal' | 'casual' | 'professional';

interface GenerateReplyRequest {
  subject: string;
  senderName: string;
  senderEmail: string;
  emailBody: string;
  tone: Tone;
}

const toneInstructions: Record<Tone, string> = {
  formal:
    'Write in a formal, polite, and business-appropriate tone. Use proper salutations and sign-offs.',
  casual:
    'Write in a friendly, relaxed, and conversational tone. Keep it warm but still respectful.',
  professional:
    'Write in a balanced, concise, and professional tone. Be direct but courteous.',
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: GenerateReplyRequest = await request.json();
    const { subject, senderName, senderEmail, emailBody, tone } = body;

    if (!subject || !emailBody || !tone) {
      return NextResponse.json(
        { success: false, error: 'subject, emailBody, and tone are required' },
        { status: 400 }
      );
    }

    if (!['formal', 'casual', 'professional'].includes(tone)) {
      return NextResponse.json(
        { success: false, error: 'tone must be formal, casual, or professional' },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey: config.ai.anthropic?.apiKey || '',
    });

    const response = await client.messages.create({
      model: config.ai.anthropic?.model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are an email reply assistant. Generate a reply to the email below.

${toneInstructions[tone]}

Rules:
- Write ONLY the reply body text. Do not include subject line, headers, or quoted original message.
- Address the sender by their first name if available.
- Keep the reply focused and relevant to the original email content.
- Do not use placeholder brackets like [Your Name] — just end naturally.
- Keep it concise: aim for 3-8 sentences unless the email clearly requires a longer response.`,
      messages: [
        {
          role: 'user',
          content: `Generate a ${tone} reply to this email.

From: ${senderName} <${senderEmail}>
Subject: ${subject}

${emailBody}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json(
        { success: false, error: 'Unexpected AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { reply: content.text.trim() },
    });
  } catch (error) {
    console.error('Generate reply failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate reply',
      },
      { status: 500 }
    );
  }
}
