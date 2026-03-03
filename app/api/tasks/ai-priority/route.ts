/**
 * POST /api/tasks/ai-priority
 * Uses Claude to determine task priority and suggest a due date from the task title.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Task title is required' },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey: config.ai.anthropic?.apiKey || '',
    });

    const today = new Date().toISOString().split('T')[0];

    const response = await client.messages.create({
      model: config.ai.anthropic?.model || 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: `You are a task priority analyzer. Today is ${today}. Given a task title, determine:
1. Priority: "high" (urgent, deadline-sensitive, critical), "medium" (important but not urgent), or "low" (nice-to-have, routine)
2. Suggested due date: ISO date string or null if not determinable from context

Rules:
- Words like "urgent", "ASAP", "critical", "fix", "bug", "broken", "deadline" → high
- Words like "review", "update", "prepare", "schedule", "meeting" → medium
- Words like "consider", "explore", "nice to have", "someday", "idea" → low
- If a date/time is mentioned in the title, extract it as the due date
- If urgency implies today/tomorrow, suggest that date

Respond with ONLY JSON, no markdown: {"priority":"high|medium|low","suggestedDueDate":"YYYY-MM-DD"|null}`,
      messages: [
        { role: 'user', content: title },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ success: true, data: { priority: 'medium', suggestedDueDate: null } });
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      data: {
        priority: result.priority || 'medium',
        suggestedDueDate: result.suggestedDueDate || null,
      },
    });
  } catch (error) {
    console.error('AI priority analysis failed:', error);
    // Fallback to medium on failure — don't block task creation
    return NextResponse.json({
      success: true,
      data: { priority: 'medium', suggestedDueDate: null },
    });
  }
}
