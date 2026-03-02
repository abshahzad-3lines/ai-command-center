// Chat service - manages AI chat messages in Supabase

import type { Database } from '@/types/database';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessageInput {
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export class ChatService {
  private supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>;
  private userId: string | null;

  constructor(
    supabaseClient: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>,
    userId: string | null
  ) {
    this.supabase = supabaseClient;
    this.userId = userId;
  }

  /**
   * Get chat history
   */
  async getMessages(limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    let query = this.supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (this.userId) {
      query = query.eq('user_id', this.userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get chat messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get recent messages for context
   */
  async getRecentMessages(limit: number = 10): Promise<ChatMessage[]> {
    let query = this.supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (this.userId) {
      query = query.eq('user_id', this.userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get recent messages:', error);
      return [];
    }

    // Reverse to get chronological order
    return (data || []).reverse();
  }

  /**
   * Add a new message
   */
  async addMessage(input: ChatMessageInput): Promise<ChatMessage | null> {
    const message: ChatMessageInsert = {
      user_id: this.userId,
      role: input.role,
      content: input.content,
      metadata: input.metadata as Database['public']['Tables']['chat_messages']['Insert']['metadata'],
    };

    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error('Failed to add message:', error);
      return null;
    }

    return data;
  }

  /**
   * Add a user message and assistant response pair
   */
  async addConversation(
    userMessage: string,
    assistantMessage: string,
    metadata?: Record<string, unknown>
  ): Promise<{ user: ChatMessage | null; assistant: ChatMessage | null }> {
    const user = await this.addMessage({
      role: 'user',
      content: userMessage,
    });

    const assistant = await this.addMessage({
      role: 'assistant',
      content: assistantMessage,
      metadata,
    });

    return { user, assistant };
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    let query = this.supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (this.userId) {
      query = query.eq('user_id', this.userId);
    } else {
      query = query.is('user_id', null);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to delete message:', error);
      return false;
    }

    return true;
  }

  /**
   * Clear all chat history
   */
  async clearHistory(): Promise<boolean> {
    let query = this.supabase
      .from('chat_messages')
      .delete();

    if (this.userId) {
      query = query.eq('user_id', this.userId);
    } else {
      query = query.is('user_id', null);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to clear chat history:', error);
      return false;
    }

    return true;
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    let query = this.supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true });

    if (this.userId) {
      query = query.eq('user_id', this.userId);
    } else {
      query = query.is('user_id', null);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Failed to get message count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Search messages
   */
  async searchMessages(queryStr: string, limit: number = 20): Promise<ChatMessage[]> {
    let query = this.supabase
      .from('chat_messages')
      .select('*')
      .ilike('content', `%${queryStr}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (this.userId) {
      query = query.eq('user_id', this.userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to search messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Format messages for OpenAI API
   */
  static formatForOpenAI(
    messages: ChatMessage[]
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    return messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
  }
}
