/**
 * @fileoverview Anthropic Claude adapter for AI operations
 * Supports chat, email analysis, and tool calling for Odoo integration
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Email, AIAnalysisResult, SuggestedAction } from '@/types';
import type { AIAdapter, AIAdapterConfig, ChatMessage } from './types';
import { config as appConfig } from '@/config';

/**
 * Tool definition for Claude's tool calling
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tool use result from Claude
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result to send back to Claude
 */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Chat response with potential tool calls
 */
export interface ChatWithToolsResponse {
  response: string;
  toolCalls?: ToolUseBlock[];
  stopReason: string;
}

/**
 * Claude AI Adapter implementing the AIAdapter interface
 * Provides email analysis, chat, and tool calling capabilities
 */
export class ClaudeAdapter implements AIAdapter {
  private client: Anthropic;
  private model: string;

  constructor(config?: AIAdapterConfig) {
    this.client = new Anthropic({
      apiKey: config?.apiKey || appConfig.ai.anthropic?.apiKey || '',
    });
    this.model = config?.model || appConfig.ai.anthropic?.model || 'claude-sonnet-4-20250514';
  }

  /**
   * Analyze an email and return summary + suggested action
   */
  async analyzeEmail(email: Email): Promise<AIAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(email);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: `You are an email assistant. Analyze emails and provide:
1. A brief summary (1-2 sentences)
2. A suggested action (reply, archive, forward, schedule, flag, or none)
3. Priority level (high, medium, low)
4. Categories (e.g., work, personal, newsletter, promotion, urgent)

Respond in JSON format only:
{
  "summary": "string",
  "suggestedAction": {
    "type": "reply|archive|forward|schedule|flag|none",
    "label": "short action label",
    "description": "why this action is suggested"
  },
  "priority": "high|medium|low",
  "categories": ["string"]
}`,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const parsed = JSON.parse(content.text) as {
        summary: string;
        suggestedAction: SuggestedAction;
        priority: 'high' | 'medium' | 'low';
        categories: string[];
      };
      return parsed;
    } catch (error) {
      console.warn('AI analysis failed, using fallback:', error instanceof Error ? error.message : 'Unknown error');
      return {
        summary: email.preview.slice(0, 150) + (email.preview.length > 150 ? '...' : ''),
        suggestedAction: {
          type: 'none',
          label: 'Review',
          description: 'AI analysis unavailable',
        },
        priority: 'medium',
        categories: [],
      };
    }
  }

  /**
   * Generate a reply draft based on the email
   */
  async generateReply(email: Email, instruction?: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Original email from ${email.from.name} (${email.from.email}):
Subject: ${email.subject}

${email.preview}

${instruction ? `Additional instruction: ${instruction}` : 'Generate an appropriate reply.'}`,
        },
      ],
      system: `You are an email assistant. Generate professional, concise email replies.
Keep responses friendly but professional. Match the tone of the original email.
Do not include subject line or email headers - just the body content.`,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return '';
    }
    return content.text;
  }

  /**
   * Batch analyze multiple emails
   */
  async analyzeEmails(emails: Email[]): Promise<AIAnalysisResult[]> {
    const results: AIAnalysisResult[] = [];
    const batchSize = 3;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((email) => this.analyzeEmail(email))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Basic chat without tools
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const anthropicMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const systemMessage = messages.find((m) => m.role === 'system')?.content ||
        `You are a helpful AI assistant for the AI Command Center dashboard.
You help users manage their emails, calendar, and tasks efficiently.
Be concise, friendly, and helpful. If asked about emails, calendar events, or tasks,
provide actionable suggestions. Keep responses brief but informative.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemMessage,
        messages: anthropicMessages,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return "I couldn't generate a response.";
      }
      return content.text;
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Chat with tool calling support
   * Returns the response along with any tool calls that need to be executed
   */
  async chatWithTools(
    messages: ChatMessage[],
    tools: ClaudeTool[],
    systemPrompt?: string
  ): Promise<ChatWithToolsResponse> {
    const anthropicMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage = systemPrompt || messages.find((m) => m.role === 'system')?.content ||
      `You are a helpful AI assistant for the AI Command Center dashboard.
You have access to tools to interact with Odoo ERP system.
Use these tools when users ask about purchase orders, sales orders, invoices, or when they want to perform actions like approvals.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemMessage,
      messages: anthropicMessages,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
    });

    // Extract text content and tool use blocks
    let textContent = '';
    const toolCalls: ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      response: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason: response.stop_reason || 'end_turn',
    };
  }

  /**
   * Continue conversation after tool execution
   * Sends tool results back to Claude and gets final response
   */
  async continueWithToolResults(
    messages: ChatMessage[],
    tools: ClaudeTool[],
    toolResults: ToolResultBlock[],
    systemPrompt?: string
  ): Promise<ChatWithToolsResponse> {
    // Build the conversation with tool results
    const anthropicMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Add tool results as the last user message
    anthropicMessages.push({
      role: 'user',
      content: toolResults.map((tr) => ({
        type: 'tool_result' as const,
        tool_use_id: tr.tool_use_id,
        content: tr.content,
        is_error: tr.is_error,
      })),
    });

    const systemMessage = systemPrompt ||
      `You are a helpful AI assistant for the AI Command Center dashboard.
You have access to tools to interact with Odoo ERP system.
Respond naturally to the user based on the tool results.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemMessage,
      messages: anthropicMessages,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
    });

    let textContent = '';
    const toolCalls: ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      response: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason: response.stop_reason || 'end_turn',
    };
  }

  /**
   * Build the analysis prompt for an email
   */
  private buildAnalysisPrompt(email: Email): string {
    return `Analyze this email:

From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Received: ${email.receivedAt.toISOString()}
Has Attachments: ${email.hasAttachments}

Content:
${email.preview}`;
  }
}
