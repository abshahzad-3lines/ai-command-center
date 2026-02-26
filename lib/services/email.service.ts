// Email service - business logic layer

import { createEmailAdapter, type EmailAdapter } from '@/lib/adapters/email';
import { createAIAdapter, type AIAdapter } from '@/lib/adapters/ai';
import type { Email, EmailSummary, AIAnalysisResult } from '@/types';
import { config } from '@/config';

export class EmailService {
  private emailAdapter: EmailAdapter;
  private aiAdapter: AIAdapter;

  constructor(accessToken?: string) {
    this.emailAdapter = createEmailAdapter('outlook', { accessToken });
    this.aiAdapter = createAIAdapter(
      config.ai.provider,
      config.ai.provider === 'openai'
        ? { apiKey: config.ai.openai.apiKey, model: config.ai.openai.model }
        : { baseUrl: config.ai.local.baseUrl, model: config.ai.local.model }
    );
  }

  setAccessToken(token: string): void {
    this.emailAdapter = createEmailAdapter('outlook', { accessToken: token });
  }

  async getEmailsWithSummaries(limit: number = 10): Promise<EmailSummary[]> {
    // Fetch emails
    const emails = await this.emailAdapter.fetchEmails(limit);

    // Random priorities for now (will be AI-powered later)
    const priorities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
    const getRandomPriority = () => priorities[Math.floor(Math.random() * priorities.length)];

    // Skip AI analysis - just show emails with preview text
    return emails.map((email) => ({
      id: email.id,
      subject: email.subject,
      from: `${email.from.name} <${email.from.email}>`,
      summary: email.preview.slice(0, 150) + (email.preview.length > 150 ? '...' : ''),
      receivedAt: email.receivedAt,
      suggestedAction: {
        type: 'none' as const,
        label: 'Review',
        description: '',
      },
      priority: getRandomPriority(),
    }));
  }

  async getEmail(id: string): Promise<Email | null> {
    return this.emailAdapter.getEmail(id);
  }

  async analyzeEmail(email: Email): Promise<AIAnalysisResult> {
    return this.aiAdapter.analyzeEmail(email);
  }

  async deleteEmail(id: string): Promise<boolean> {
    return this.emailAdapter.deleteEmail(id);
  }

  async executeAction(
    emailId: string,
    actionType: string
  ): Promise<{ success: boolean; message: string }> {
    const email = await this.emailAdapter.getEmail(emailId);
    if (!email) {
      return { success: false, message: 'Email not found' };
    }

    switch (actionType) {
      case 'reply': {
        const replyContent = await this.aiAdapter.generateReply(email);
        const sent = await this.emailAdapter.sendReply(emailId, replyContent);
        return {
          success: sent,
          message: sent ? 'Reply sent successfully' : 'Failed to send reply',
        };
      }

      case 'archive': {
        const archived = await this.emailAdapter.archiveEmail(emailId);
        return {
          success: archived,
          message: archived ? 'Email archived' : 'Failed to archive',
        };
      }

      case 'flag': {
        // Mark as read and keep for follow-up
        await this.emailAdapter.markAsRead(emailId);
        return { success: true, message: 'Email flagged for follow-up' };
      }

      case 'none':
      default:
        await this.emailAdapter.markAsRead(emailId);
        return { success: true, message: 'Email marked as read' };
    }
  }

  isAuthenticated(): boolean {
    return this.emailAdapter.isAuthenticated();
  }
}

// Singleton instance for API routes
let emailServiceInstance: EmailService | null = null;

export function getEmailService(accessToken?: string): EmailService {
  if (!emailServiceInstance || accessToken) {
    emailServiceInstance = new EmailService(accessToken);
  }
  return emailServiceInstance;
}
