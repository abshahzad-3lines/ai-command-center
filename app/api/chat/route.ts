// API route: GET /api/chat - fetch chat history
// API route: POST /api/chat - send a message and get AI response

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ChatService } from '@/lib/services/chat.service';
import { createAIAdapter } from '@/lib/adapters/ai';
import { config } from '@/config';
import type { ApiResponse } from '@/types';
import type { Database } from '@/types/database';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

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

    // Get AI response
    const aiAdapter = createAIAdapter(
      config.ai.provider,
      config.ai.provider === 'openai'
        ? { apiKey: config.ai.openai.apiKey, model: config.ai.openai.model }
        : { baseUrl: config.ai.local.baseUrl, model: config.ai.local.model }
    );

    let aiResponse: string;
    try {
      aiResponse = await aiAdapter.chat(formattedMessages);
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
