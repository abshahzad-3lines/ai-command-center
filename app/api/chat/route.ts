/**
 * @fileoverview Chat API route with MCP tool integration
 * GET /api/chat - Fetch chat history
 * POST /api/chat - Send a message and get AI response (with MCP tool support)
 * DELETE /api/chat - Clear chat history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ChatService } from '@/lib/services/chat.service';
import { createAIAdapter } from '@/lib/adapters/ai';
import { config } from '@/config';
import { getMcpClient, getAvailableMcpServers } from '@/lib/mcp';
import type { ApiResponse } from '@/types';
import type { Database } from '@/types/database';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

/**
 * System prompt that describes available MCP capabilities
 */
const MCP_SYSTEM_PROMPT = `You are an AI assistant for the AI Command Center dashboard. You help users manage their work across email, calendar, tasks, and Odoo ERP.

You have access to the following MCP (Model Context Protocol) tools that you can use to help users:

**Odoo ERP Tools:**
- Search and view purchase orders (RFPs)
- Search and view sales orders
- Search and view invoices
- Approve purchase orders
- Confirm sales orders
- Register invoice payments

**Memory Tools:**
- Store and retrieve information in a persistent knowledge graph
- Remember user preferences and context

**Browser Automation (Playwright):**
- Navigate web pages
- Take screenshots
- Interact with web elements

When users ask about their Odoo data (orders, invoices, RFPs), you can fetch real data from the system.
When users ask you to remember something, store it in the memory knowledge graph.

Always be helpful, concise, and proactive in suggesting actions the user can take.`;

/**
 * Get available MCP tools for the AI
 */
async function getAvailableMcpTools(): Promise<string> {
  const client = getMcpClient();
  const servers = getAvailableMcpServers();
  const toolDescriptions: string[] = [];

  for (const serverName of servers) {
    try {
      const connected = await client.connect(serverName);
      if (connected) {
        const tools = await client.listTools(serverName);
        if (Array.isArray(tools) && tools.length > 0) {
          toolDescriptions.push(`\n${serverName} tools:`);
          for (const tool of tools) {
            const t = tool as { name: string; description?: string };
            toolDescriptions.push(`  - ${t.name}: ${t.description || 'No description'}`);
          }
        }
      }
    } catch {
      // Skip servers that fail to connect
    }
  }

  return toolDescriptions.join('\n');
}

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

    // Get available MCP tools and add to system prompt
    let mcpToolsInfo = '';
    try {
      mcpToolsInfo = await getAvailableMcpTools();
    } catch {
      // MCP tools unavailable - continue without them
    }

    const systemPrompt = mcpToolsInfo
      ? `${MCP_SYSTEM_PROMPT}\n\nCurrently available tools:${mcpToolsInfo}`
      : MCP_SYSTEM_PROMPT;

    // Add system message at the start
    const messagesWithSystem = [
      { role: 'system' as const, content: systemPrompt },
      ...formattedMessages,
    ];

    // Get AI response
    const aiAdapter = createAIAdapter(
      config.ai.provider,
      config.ai.provider === 'openai'
        ? { apiKey: config.ai.openai.apiKey, model: config.ai.openai.model }
        : { baseUrl: config.ai.local.baseUrl, model: config.ai.local.model }
    );

    let aiResponse: string;
    try {
      aiResponse = await aiAdapter.chat(messagesWithSystem);
    } catch {
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
