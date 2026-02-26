// AI adapter interface - implement this for different AI providers

import type { Email, AIAnalysisResult } from '@/types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIAdapter {
  /**
   * Analyze an email and return summary + suggested action
   */
  analyzeEmail(email: Email): Promise<AIAnalysisResult>;

  /**
   * Generate a reply draft based on the email and suggested action
   */
  generateReply(email: Email, instruction?: string): Promise<string>;

  /**
   * Batch analyze multiple emails
   */
  analyzeEmails(emails: Email[]): Promise<AIAnalysisResult[]>;

  /**
   * Chat with the AI assistant
   */
  chat(messages: ChatMessage[]): Promise<string>;
}

export interface AIAdapterConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
