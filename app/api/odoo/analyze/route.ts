/**
 * POST /api/odoo/analyze
 * Sends current Odoo data to Claude and returns AI-generated priorities,
 * summaries, and predicted next actions for each item.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/config';

interface OdooItemInput {
  id: number;
  type: 'rfp' | 'sales' | 'invoice';
  name: string;
  entity: string;
  amount: number;
  currency: string;
  state: string;
  stateLabel: string;
  date: string;
  lineCount: number;
  // Invoice-specific
  amountDue?: number;
  paymentState?: string;
  dueDate?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
  // Sales-specific
  invoiceStatus?: string;
}

interface AIAction {
  id: number;
  type: 'rfp' | 'sales' | 'invoice';
  aiPriority: 'high' | 'medium' | 'low';
  aiSummary: string;
  aiSuggestedAction: {
    type: string;
    label: string;
    description: string;
    urgency: 'immediate' | 'soon' | 'normal';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: OdooItemInput[] = body.items;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const client = new Anthropic({
      apiKey: config.ai.anthropic?.apiKey || '',
    });

    // Build a compact summary of all items for Claude
    const itemsSummary = items.map((item) => {
      let detail = `[${item.type.toUpperCase()}] ${item.name} | ${item.entity} | ${item.currency} ${item.amount.toLocaleString()} | State: ${item.stateLabel} | ${item.lineCount} lines | Date: ${item.date}`;
      if (item.type === 'invoice') {
        detail += ` | Due: ${item.dueDate || 'N/A'} | Amount Due: ${item.currency} ${(item.amountDue ?? 0).toLocaleString()} | Payment: ${item.paymentState || 'N/A'}`;
        if (item.isOverdue) detail += ` | OVERDUE ${item.daysOverdue} days`;
      }
      if (item.type === 'sales' && item.invoiceStatus) {
        detail += ` | Invoice Status: ${item.invoiceStatus}`;
      }
      return `- ID:${item.id} ${detail}`;
    }).join('\n');

    const today = new Date().toISOString().split('T')[0];

    const response = await client.messages.create({
      model: config.ai.anthropic?.model || 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a business operations AI analyst. Today is ${today}. Analyze Odoo ERP records and for EACH item, determine:
1. Priority (high/medium/low) based on urgency, amount, and state
2. A brief summary (max 15 words) explaining WHY this needs attention
3. The predicted NEXT ACTION the user should take

Rules for priority:
- high: Items BLOCKING business operations — purchase orders awaiting approval, sales orders awaiting confirmation, large-amount drafts that need action NOW
- medium: Overdue invoices needing reminders, draft items that should be confirmed, invoices approaching due date
- low: Completed items, small amounts, no action needed, already-sent reminders

Rules for suggested actions:
- "to approve" RFPs → action: "approve" or "reject" (these BLOCK purchasing, always high priority)
- Draft sales orders → action: "confirm" (revenue is waiting, high priority for large amounts)
- Overdue invoices not_paid → action: "remind" (send payment reminder — medium priority, not urgent since it's a follow-up)
- Posted invoices partially paid → action: "pay" (register remaining payment)
- Draft invoices → action: "confirm" (validate and post)
- Completed/paid items → action: "none"

CRITICAL urgency rules — be smart about what actually blocks operations:
- "immediate": Items that BLOCK workflows and need human decision NOW — purchase orders awaiting approval, sales orders pending confirmation with large amounts, orders stuck in a blocked state
- "soon": Draft items needing attention, overdue invoices needing reminders, invoices approaching due date — these need action but aren't blocking anyone
- "normal": Low priority items, completed items, small amounts
- Sending a payment reminder is NEVER "immediate" — it's a follow-up action, not a blocker. Use "soon" at most.

Respond with ONLY a JSON array, no markdown, no explanation:
[{"id":number,"type":"rfp|sales|invoice","aiPriority":"high|medium|low","aiSummary":"string","aiSuggestedAction":{"type":"approve|reject|confirm|pay|remind|follow_up|escalate|none","label":"short label (2-3 words)","description":"why this action (1 sentence)","urgency":"immediate|soon|normal"}}]`,
      messages: [
        {
          role: 'user',
          content: `Analyze these ${items.length} Odoo records and return the JSON array:\n\n${itemsSummary}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ success: false, error: 'Unexpected AI response' }, { status: 500 });
    }

    // Parse Claude's response — handle potential markdown wrapping
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const actions: AIAction[] = JSON.parse(jsonText);

    return NextResponse.json({ success: true, data: actions });
  } catch (error) {
    console.error('Odoo AI analysis failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'AI analysis failed' },
      { status: 500 }
    );
  }
}
