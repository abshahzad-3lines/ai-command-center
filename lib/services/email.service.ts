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
        // Reply requires human review — mark as read and prompt user to use the reply UI
        await this.emailAdapter.markAsRead(emailId);
        return {
          success: true,
          message: 'Open the email to compose and review your reply before sending.',
        };
      }

      case 'archive': {
        const archived = await this.emailAdapter.archiveEmail(emailId);
        return {
          success: archived,
          message: archived ? 'Email archived' : 'Failed to archive',
        };
      }

      case 'forward': {
        // AI generates a forward summary as the comment
        const analysis = await this.aiAdapter.analyzeEmail(email);
        // Flag the email and provide AI context — actual forwarding requires recipient input from the user
        await this.emailAdapter.flagEmail(emailId);
        return {
          success: true,
          message: `Email flagged for forwarding. AI summary: "${analysis.summary}". Please specify recipients to complete the forward.`,
        };
      }

      case 'schedule': {
        // Extract scheduling info from the email using AI
        const scheduleAnalysis = await this.aiAdapter.chat([
          {
            role: 'user',
            content: `Extract meeting/event details from this email and respond with ONLY JSON:\n{"subject":"event title","date":"YYYY-MM-DD","time":"HH:MM","duration":60}\n\nEmail subject: ${email.subject}\nEmail body: ${email.preview}`,
          },
        ]);

        let eventDetails;
        try {
          let jsonText = scheduleAnalysis.trim();
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          eventDetails = JSON.parse(jsonText);
        } catch {
          return {
            success: false,
            message: 'Could not extract event details from email. Please create the event manually.',
          };
        }

        // Flag the email and return event details for the frontend to create
        await this.emailAdapter.flagEmail(emailId);
        return {
          success: true,
          message: `Event suggested: "${eventDetails.subject}" on ${eventDetails.date} at ${eventDetails.time}. Check your calendar to confirm.`,
        };
      }

      case 'flag': {
        const flagged = await this.emailAdapter.flagEmail(emailId);
        return {
          success: flagged,
          message: flagged ? 'Email flagged for follow-up' : 'Failed to flag email',
        };
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
