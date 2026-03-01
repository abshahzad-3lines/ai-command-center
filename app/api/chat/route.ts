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
- Search and view purchase orders
- Approve purchase orders waiting for approval
- Reject/cancel purchase orders

**Sales Orders:**
- Search and view sales orders
- Confirm draft sales orders
- Cancel sales orders

**Invoices:**
- Search and view invoices
- Register payments for invoices
- Send payment reminders

When users ask about Odoo data, use the appropriate tools to fetch real data. When they ask you to perform actions (approve, confirm, cancel, etc.), use the corresponding action tools.

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

    const chatService = new ChatService(supabase, userId);

    // Save user message
    await chatService.addMessage({
      role: 'user',
      content: message,
    });

    // Get recent context
    const recentMessages = await chatService.getRecentMessages(10);
    const formattedMessages = ChatService.formatForOpenAI(recentMessages);

    // Create Claude adapter with tool support
    const claudeAdapter = createClaudeAdapter();

    // Convert messages to Claude format
    const chatMessages = formattedMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

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
      const assistantContent = response.toolCalls.map((tc) => ({
        type: 'tool_use' as const,
        id: tc.id,
        name: tc.name,
        input: tc.input,
      }));

      // Add assistant response with tool calls
      currentMessages.push({
        role: 'assistant',
        content: JSON.stringify(assistantContent),
      });

      // Continue with tool results
      const continuedResponse = await claudeAdapter.continueWithToolResults(
        currentMessages,
        tools,
        toolResults,
        systemPrompt
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
