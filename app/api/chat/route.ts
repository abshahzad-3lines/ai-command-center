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

**IMPORTANT WORKFLOW:**
1. When a user mentions an order by name (like "SO-3L-03058"), use find_sales_order_by_name to get its ID first, or use cancel_sales_order with order_name directly.
2. For actions like "delete", "remove", or "cancel" a sales order, use the cancel_sales_order tool.
3. Always confirm the action with the user after executing it.

**Examples:**
- User: "Cancel SO-3L-03058" → Use cancel_sales_order with order_name="SO-3L-03058"
- User: "Delete sales order 12345" → Use cancel_sales_order with order_id=12345
- User: "Show me the details of SO-3L-03058" → Use find_sales_order_by_name

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
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // For now, always use null user_id since we don't have Supabase auth linked to Microsoft auth
    // The Microsoft localAccountId is not a Supabase profile ID
    // TODO: Link Microsoft accounts to Supabase profiles for proper user tracking

    let chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    // Create chat service with null user_id (anonymous mode)
    const chatService = new ChatService(supabase, null);

    if (true) { // Always try to save messages now that user_id is nullable

      // Save user message
      await chatService.addMessage({
        role: 'user',
        content: message,
      });

      // Get recent context
      const recentMessages = await chatService.getRecentMessages(10);
      const formattedMessages = ChatService.formatForOpenAI(recentMessages);

      // Convert messages to Claude format
      chatMessages = formattedMessages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));
    }

    // Always ensure the current message is included
    if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1]?.content !== message) {
      chatMessages.push({
        role: 'user',
        content: message,
      });
    }

    // Create Claude adapter with tool support
    const claudeAdapter = createClaudeAdapter();

    // Get AI response with tool calling
    let aiResponse = '';
    try {
      aiResponse = await processWithTools(
        claudeAdapter,
        chatMessages,
        odooTools,
        SYSTEM_PROMPT,
        5,
        userId // Pass userId for action logging
      );
    } catch (error) {
      console.error('AI processing error:', error);
      aiResponse = "I'm sorry, I encountered an error processing your request. Please try again.";
    }

    // Save assistant response
    await chatService.addMessage({
      role: 'assistant',
      content: aiResponse,
    });

    // Return updated messages
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
 * Handles the tool calling loop: Claude calls tools -> execute -> send results -> get final response
 */
async function processWithTools(
  claudeAdapter: ReturnType<typeof createClaudeAdapter>,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  tools: ClaudeTool[],
  systemPrompt: string,
  maxIterations: number = 5,
  userId?: string
): Promise<string> {
  let currentMessages = [...messages];
  let iterations = 0;
  let finalResponse = '';

  while (iterations < maxIterations) {
    iterations++;

    // Call Claude with tools
    const response = await claudeAdapter.chatWithTools(
      currentMessages,
      tools,
      systemPrompt
    );

    // If there are tool calls, execute them
    if (response.toolCalls && response.toolCalls.length > 0) {
      // Execute tools (with userId for action logging)
      const toolResults: ToolResultBlock[] = await executeToolsForClaude(
        response.toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          input: tc.input,
        })),
        userId
      );

      // Build assistant message with tool use blocks
      const toolUseBlocks = response.toolCalls.map((tc) => ({
        type: 'tool_use' as const,
        id: tc.id,
        name: tc.name,
        input: tc.input,
      }));

      // Add placeholder for assistant message (will be replaced by continueWithToolResults)
      currentMessages.push({
        role: 'assistant',
        content: '[tool_use]', // Placeholder - actual content is in toolUseBlocks
      });

      // Continue with tool results - pass the actual tool use blocks
      const continuedResponse = await claudeAdapter.continueWithToolResults(
        currentMessages,
        tools,
        toolResults,
        systemPrompt,
        toolUseBlocks
      );

      // If no more tool calls, we have the final response
      if (!continuedResponse.toolCalls || continuedResponse.toolCalls.length === 0) {
        finalResponse = continuedResponse.response;
        break;
      }

      // More tool calls - continue the loop
      // Add the response text if any
      if (continuedResponse.response) {
        currentMessages.push({
          role: 'assistant',
          content: continuedResponse.response,
        });
      }
    } else {
      // No tool calls - this is the final response
      finalResponse = response.response;
      break;
    }
  }

  if (!finalResponse) {
    finalResponse = "I processed your request but couldn't generate a proper response. Please try again.";
  }

  return finalResponse;
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
