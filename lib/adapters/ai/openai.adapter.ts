// OpenAI adapter for email analysis

import OpenAI from 'openai';
import type { Email, AIAnalysisResult, SuggestedAction } from '@/types';
import type { AIAdapter, AIAdapterConfig, ChatMessage } from './types';
import { config as appConfig } from '@/config';

export class OpenAIAdapter implements AIAdapter {
  private client: OpenAI;
  private model: string;

  constructor(config?: AIAdapterConfig) {
    this.client = new OpenAI({
      apiKey: config?.apiKey || appConfig.ai.openai.apiKey,
      baseURL: config?.baseUrl,
    });
    this.model = config?.model || appConfig.ai.openai.model;
  }

  async analyzeEmail(email: Email): Promise<AIAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(email);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an email assistant. Analyze emails and provide:
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
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(content) as {
        summary: string;
        suggestedAction: SuggestedAction;
        priority: 'high' | 'medium' | 'low';
        categories: string[];
      };
      return parsed;
    } catch (error) {
      // Graceful fallback for any AI error (quota, network, parsing, etc.)
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

  async generateReply(email: Email, instruction?: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an email assistant. Generate professional, concise email replies.
Keep responses friendly but professional. Match the tone of the original email.
Do not include subject line or email headers - just the body content.`,
        },
        {
          role: 'user',
          content: `Original email from ${email.from.name} (${email.from.email}):
Subject: ${email.subject}

${email.preview}

${instruction ? `Additional instruction: ${instruction}` : 'Generate an appropriate reply.'}`,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  async analyzeEmails(emails: Email[]): Promise<AIAnalysisResult[]> {
    // Process in parallel with concurrency limit
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

  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `You are a helpful AI assistant for the AI Command Center dashboard.
You help users manage their emails, calendar, and tasks efficiently.
Be concise, friendly, and helpful. If asked about emails, calendar events, or tasks,
provide actionable suggestions. Keep responses brief but informative.`,
      };

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          systemMessage,
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || "I couldn't generate a response.";
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error('Failed to generate response');
    }
  }

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
