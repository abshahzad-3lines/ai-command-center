/**
 * POST /api/calendar/ai-insights
 * Analyzes a day's calendar events and returns AI-generated insights
 * about schedule density, conflicts, and suggestions.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/config';

interface EventInput {
  subject: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location?: string;
  isOnline?: boolean;
  attendees?: number;
  importance?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events, date } = body as { events: EventInput[]; date: string };

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        data: { insight: 'Free day — no events scheduled.', type: 'free' },
      });
    }

    const client = new Anthropic({
      apiKey: config.ai.anthropic?.apiKey || '',
    });

    const eventsSummary = events.map((e) => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      const time = e.isAllDay
        ? 'All day'
        : `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      let detail = `- ${e.subject} (${time})`;
      if (e.location) detail += ` @ ${e.location}`;
      if (e.isOnline) detail += ' [Online]';
      if (e.attendees && e.attendees > 0) detail += ` [${e.attendees} attendees]`;
      if (e.importance === 'high') detail += ' [HIGH PRIORITY]';
      return detail;
    }).join('\n');

    const response = await client.messages.create({
      model: config.ai.anthropic?.model || 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: `You are a calendar assistant. Analyze a day's events and provide a brief, helpful insight (max 2 sentences). Focus on:
- Schedule density (light/moderate/busy/packed)
- Back-to-back meetings or gaps
- Potential conflicts or overlaps
- Best focus time windows

Respond with ONLY JSON: {"insight":"your 1-2 sentence insight","type":"free|light|moderate|busy|packed"}`,
      messages: [
        { role: 'user', content: `Events for ${date}:\n${eventsSummary}` },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({
        success: true,
        data: { insight: `${events.length} event${events.length > 1 ? 's' : ''} scheduled.`, type: 'moderate' },
      });
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      data: {
        insight: result.insight || `${events.length} events scheduled.`,
        type: result.type || 'moderate',
      },
    });
  } catch (error) {
    console.error('Calendar AI insights failed:', error);
    return NextResponse.json({
      success: true,
      data: { insight: 'Unable to analyze schedule.', type: 'moderate' },
    });
  }
}
