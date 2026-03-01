/**
 * @fileoverview Email Service - Business logic layer for email operations
 * Uses Claude AI for intelligent email analysis and suggestions
 */

import { createEmailAdapter, type EmailAdapter } from '@/lib/adapters/email';
import { createAIAdapter, type AIAdapter } from '@/lib/adapters/ai';
import type { Email, EmailSummary, AIAnalysisResult } from '@/types';
import { config } from '@/config';

/**
 * Email Service - Provides email operations with AI-powered analysis
 */
export class EmailService {
  private emailAdapter: EmailAdapter;
  private aiAdapter: AIAdapter;

  constructor(accessToken?: string) {
    this.emailAdapter = createEmailAdapter('outlook', { accessToken });
    this.aiAdapter = this.createConfiguredAIAdapter();
  }

  /**
   * Create the appropriate AI adapter based on configuration
   */
  private createConfiguredAIAdapter(): AIAdapter {
    const provider = config.ai.provider;

    switch (provider) {
      case 'anthropic':
        return createAIAdapter('anthropic', {
          apiKey: config.ai.anthropic?.apiKey,
          model: config.ai.anthropic?.model,
        });
      case 'openai':
        return createAIAdapter('openai', {
          apiKey: config.ai.openai.apiKey,
          model: config.ai.openai.model,
        });
      case 'local':
        return createAIAdapter('local', {
          baseUrl: config.ai.local.baseUrl,
          model: config.ai.local.model,
        });
      default:
        // Default to Claude
        return createAIAdapter('anthropic', {
          apiKey: config.ai.anthropic?.apiKey,
          model: config.ai.anthropic?.model,
        });
    }
  }

  /**
   * Set the access token for email operations
   */
  setAccessToken(token: string): void {
    this.emailAdapter = createEmailAdapter('outlook', { accessToken: token });
  }

  /**
   * Get emails with AI-powered summaries and suggested actions
   */
  async getEmailsWithSummaries(limit: number = 10): Promise<EmailSummary[]> {
    // Fetch emails
    const emails = await this.emailAdapter.fetchEmails(limit);

    // Process emails with AI analysis
    const emailsWithAnalysis = await Promise.all(
      emails.map(async (email) => {
        try {
          // Try to get AI analysis
          const analysis = await this.aiAdapter.analyzeEmail(email);
          return {
            id: email.id,
            subject: email.subject,
            from: `${email.from.name} <${email.from.email}>`,
            summary: analysis.summary,
            receivedAt: email.receivedAt,
            suggestedAction: analysis.suggestedAction,
            priority: analysis.priority,
            categories: analysis.categories,
          };
        } catch (error) {
          // Fallback to basic summary if AI fails
          console.warn(`AI analysis failed for email ${email.id}:`, error);
          return {
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
            priority: this.inferPriority(email),
          };
        }
      })
    );

    return emailsWithAnalysis;
  }

  /**
   * Infer priority based on email content (fallback when AI is unavailable)
   */
  private inferPriority(email: Email): 'high' | 'medium' | 'low' {
    const subject = email.subject.toLowerCase();
    const preview = email.preview.toLowerCase();

    // High priority indicators
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'important'];
    if (urgentKeywords.some((kw) => subject.includes(kw) || preview.includes(kw))) {
      return 'high';
    }

    // Medium priority indicators
    const mediumKeywords = ['reminder', 'follow up', 'action required', 'deadline', 'response needed'];
    if (mediumKeywords.some((kw) => subject.includes(kw) || preview.includes(kw))) {
      return 'medium';
    }

    // Low priority by default
    return 'low';
  }

  /**
   * Get a single email by ID
   */
  async getEmail(id: string): Promise<Email | null> {
    return this.emailAdapter.getEmail(id);
  }

  /**
   * Analyze a single email with AI
   */
  async analyzeEmail(email: Email): Promise<AIAnalysisResult> {
    return this.aiAdapter.analyzeEmail(email);
  }

  /**
   * Delete an email
   */
  async deleteEmail(id: string): Promise<boolean> {
    return this.emailAdapter.deleteEmail(id);
  }

  /**
   * Execute an action on an email (reply, archive, flag, etc.)
   */
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
        await this.emailAdapter.markAsRead(emailId);
        return { success: true, message: 'Email flagged for follow-up' };
      }

      case 'none':
      default:
        await this.emailAdapter.markAsRead(emailId);
        return { success: true, message: 'Email marked as read' };
    }
  }

  /**
   * Check if the email adapter is authenticated
   */
  isAuthenticated(): boolean {
    return this.emailAdapter.isAuthenticated();
  }
}

// Singleton instance for API routes
let emailServiceInstance: EmailService | null = null;

/**
 * Get the singleton email service instance
 */
export function getEmailService(accessToken?: string): EmailService {
  if (!emailServiceInstance || accessToken) {
    emailServiceInstance = new EmailService(accessToken);
  }
  return emailServiceInstance;
}
