/**
 * @fileoverview Chat API route with Claude AI and Odoo tool calling
 * GET /api/chat - Fetch chat history
 * POST /api/chat - Send a message and get AI response (with Odoo tool support)
 * DELETE /api/chat - Clear chat history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ChatService } from '@/lib/services/chat.service';
import { createClaudeAdapter, type ClaudeTool, type ToolResultBlock } from '@/lib/adapters/ai';
import { odooTools } from '@/lib/odoo';
import { emailTools } from '@/lib/ai/tools/email-tools';
import { calendarTools } from '@/lib/ai/tools/calendar-tools';
import { taskTools } from '@/lib/ai/tools/task-tools';
import { executeToolsForClaude } from '@/lib/ai/tool-executor';
import type { ApiResponse } from '@/types';
import type { Database } from '@/types/database';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

/**
 * System prompt for the AI assistant with Odoo capabilities
 */
const SYSTEM_PROMPT = `You are an AI assistant for the AI Command Center dashboard. You help users manage their work across email, calendar, tasks, and Odoo ERP.

You have access to tools that let you interact with Odoo ERP:

**Purchase Orders (RFPs):**
- search_purchase_orders: Search for purchase orders
- get_purchase_order: Get details by ID
- approve_purchase_order: Approve a purchase order
- reject_purchase_order: Reject/cancel a purchase order

**Sales Orders:**
- search_sales_orders: Search for sales orders
- get_sales_order: Get details by ID
- find_sales_order_by_name: Find by order name (e.g., "SO-3L-03058")
- confirm_sales_order: Confirm a draft/sent order
- cancel_sales_order: Cancel/delete a sales order (accepts order_id OR order_name)

**Invoices:**
- search_invoices: Search for invoices
- get_invoice: Get details by ID
- register_invoice_payment: Register a payment
- send_payment_reminder: Send a payment reminder

**Generic Odoo Search:**
- search_odoo_records: Search ANY Odoo model with domain filters (contacts, products, employees, deliveries, CRM leads, projects, tasks, payments, etc.)
- get_odoo_record: Get a specific record from any model by ID

Common models: res.partner (contacts), product.product (products), hr.employee (employees), stock.picking (deliveries), crm.lead (CRM), project.project (projects), project.task (tasks), account.payment (payments), res.users (users)

Use generic tools for any model NOT covered by the specific tools above. Prefer specific tools (search_purchase_orders, search_sales_orders, search_invoices) when they exist.

**Creating Records:**
- create_sales_order: Create a new sales order/quotation
- create_purchase_order: Create a new purchase order/RFP
- create_invoice: Create a new customer invoice

**CRITICAL — FOLLOW-UP QUESTIONS FOR CREATING RECORDS:**
When a user asks to create a new sales order, purchase order, or invoice, you MUST gather ALL required information before calling the create tool. Do NOT call the tool with missing fields. Instead, ask the user follow-up questions to collect the missing information.

Required fields for creating a sales order:
- Customer name (partner) — ask: "Which customer is this for?"
- Product(s) and quantities — ask: "What product(s) should I add, and how many of each?"
- Price per unit (if not using default) — ask: "What's the unit price?"

Required fields for creating a purchase order:
- Vendor name (partner) — ask: "Which vendor/supplier is this for?"
- Product(s) and quantities — ask: "What product(s) are you ordering, and how many?"
- Price per unit — ask: "What's the unit price for each product?"

Required fields for creating an invoice:
- Customer name (partner) — ask: "Who should this invoice be for?"
- Line items with descriptions and amounts — ask: "What line items should be on the invoice? I need the description and amount for each."

When the user provides partial info (e.g., "Create a sales order for 10 laptops"), ask for the missing pieces one at a time. For example: "I can create that sales order. A few things I need: 1) Which customer is this for? 2) What's the unit price per laptop?"

Use search_odoo_records with model "res.partner" to look up the customer/vendor by name if the user provides a name. Use search_odoo_records with model "product.product" to look up products by name.

**IMPORTANT WORKFLOW:**
1. When a user mentions an order by name (like "SO-3L-03058"), use find_sales_order_by_name to get its ID first, or use cancel_sales_order with order_name directly.
2. For actions like "delete", "remove", or "cancel" a sales order, use the cancel_sales_order tool.
3. Always confirm the action with the user after executing it.
4. For ANY write action (create, approve, reject, confirm, cancel, pay), tell the user what you're about to do and proceed only after gathering all needed info.

**Examples:**
- User: "Cancel SO-3L-03058" → Use cancel_sales_order with order_name="SO-3L-03058"
- User: "Delete sales order 12345" → Use cancel_sales_order with order_id=12345
- User: "Show me the details of SO-3L-03058" → Use find_sales_order_by_name
- User: "Create a new sales order" → Ask: "Sure! I need a few details: 1) Which customer? 2) What products and quantities? 3) Unit prices?"
- User: "Add a sales order for Acme Corp" → Look up Acme Corp in res.partner, then ask: "Found Acme Corp. What products should I add to the order?"

**Email Tools:**
- search_emails: Search the user's Outlook inbox
- send_email: Compose and send a new email
- reply_to_email: Reply to an existing email

**Calendar Tools:**
- search_calendar_events: Get events in a date range
- create_calendar_event: Create a new calendar event

**Task Tools:**
- search_tasks: List user's tasks with optional filters
- create_task: Create a new task
- complete_task: Mark a task as completed

**Email Examples:**
- User: "What's in my inbox?" → Use search_emails
- User: "Send an email to john@example.com about the meeting" → Use send_email
- User: "Reply to that email saying I'll be there" → Use reply_to_email (need the email_id)

**Calendar Examples:**
- User: "What meetings do I have tomorrow?" → Use search_calendar_events with tomorrow's date
- User: "Schedule a meeting with the team on Friday at 2pm" → Use create_calendar_event

**Task Examples:**
- User: "What tasks do I have?" → Use search_tasks
- User: "Add a task to review the proposal by Friday" → Use create_task with due_date
- User: "Mark the report task as done" → Use search_tasks first to find the ID, then complete_task

Be helpful, concise, and proactive. Format data in a readable way when presenting results. If an action fails, explain what went wrong and suggest alternatives.`;

interface ChatResponse {
  messages: ChatMessage[];
  response?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ChatMessage[]>>> {
  try {
    const supabase = await createClient();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const chatService = new ChatService(supabase, userId);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const messages = await chatService.getMessages(limit);

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chat history',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ChatResponse>>> {
  try {
    const supabase = await createClient();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, accessToken, ephemeral, emailContext, conversationHistory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const isEphemeral = ephemeral === true;
    let chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    // Create chat service with actual userId
    const chatService = new ChatService(supabase, userId);

    if (isEphemeral) {
      // Ephemeral mode: build messages from client-provided history, skip DB
      if (Array.isArray(conversationHistory)) {
        chatMessages = conversationHistory.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }
      chatMessages.push({ role: 'user', content: message });
    } else {
      // Normal mode: persist to DB
      await chatService.addMessage({
        role: 'user',
        content: message,
      });

      const recentMessages = await chatService.getRecentMessages(10);
      const formattedMessages = ChatService.formatForOpenAI(recentMessages);

      chatMessages = formattedMessages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1]?.content !== message) {
        chatMessages.push({
          role: 'user',
          content: message,
        });
      }
    }

    // Build system prompt, augmenting with email context if provided
    let systemPrompt = SYSTEM_PROMPT;
    if (emailContext) {
      const emailBody = typeof emailContext.body === 'string'
        ? emailContext.body.slice(0, 3000)
        : '';
      systemPrompt += `\n\n--- EMAIL CONTEXT ---
Subject: ${emailContext.subject || ''}
From: ${emailContext.from || ''}
Email Body:
${emailBody}
--- END EMAIL CONTEXT ---

The user is viewing this email and asking you about it. Help them with tasks like summarizing, drafting replies, extracting info, or any other request related to this email. When drafting reply text, write only the reply body (no subject line) and keep a professional tone unless asked otherwise.`;
    }

    // Chat with tool calling requires Claude adapter specifically because
    // chatWithTools/continueWithToolResults are Claude-specific APIs.
    // AI_PROVIDER config only affects email/Odoo analysis (which use the generic AIAdapter interface).
    const claudeAdapter = createClaudeAdapter();

    // Merge all tool arrays
    const allTools = [...odooTools, ...emailTools, ...calendarTools, ...taskTools];

    // Get AI response with tool calling
    let aiResponse = '';
    try {
      aiResponse = await processWithTools(
        claudeAdapter,
        chatMessages,
        allTools,
        systemPrompt,
        5,
        userId,
        accessToken
      );
    } catch (error) {
      console.error('AI processing error:', error);
      aiResponse = "I'm sorry, I encountered an error processing your request. Please try again.";
    }

    if (isEphemeral) {
      // Ephemeral mode: return response only, skip DB persistence
      return NextResponse.json({
        success: true,
        data: {
          messages: [],
          response: aiResponse,
        },
      });
    }

    // Normal mode: save assistant response and return updated messages
    await chatService.addMessage({
      role: 'assistant',
      content: aiResponse,
    });

    const updatedMessages = await chatService.getRecentMessages(20);

    return NextResponse.json({
      success: true,
      data: {
        messages: updatedMessages,
        response: aiResponse,
      },
    });
  } catch (error) {
    console.error('Failed to process chat message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process message',
      },
      { status: 500 }
    );
  }
}

/**
 * Process a message with tool calling support
 * Uses the adapter's processToolLoop for proper multi-round tool calling.
 * Each round: Claude calls tools → execute → send results → Claude sees full history → repeat
 */
async function processWithTools(
  claudeAdapter: ReturnType<typeof createClaudeAdapter>,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  tools: ClaudeTool[],
  systemPrompt: string,
  maxIterations: number = 5,
  userId?: string,
  accessToken?: string
): Promise<string> {
  return claudeAdapter.processToolLoop(
    messages,
    tools,
    systemPrompt,
    async (toolCalls) => {
      return executeToolsForClaude(
        toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          input: tc.input,
        })),
        userId,
        accessToken
      );
    },
    maxIterations
  );
}

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ cleared: boolean }>>> {
  try {
    const supabase = await createClient();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const chatService = new ChatService(supabase, userId);
    const cleared = await chatService.clearHistory();

    return NextResponse.json({
      success: true,
      data: { cleared },
    });
  } catch (error) {
    console.error('Failed to clear chat history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear history',
      },
      { status: 500 }
    );
  }
}
