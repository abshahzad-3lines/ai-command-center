// Outlook email adapter using Microsoft Graph API

import { Client } from '@microsoft/microsoft-graph-client';
import type { Email } from '@/types';
import type { EmailAdapter, EmailAdapterConfig } from './types';

export class OutlookAdapter implements EmailAdapter {
  private client: Client | null = null;
  private accessToken: string | null = null;

  constructor(config?: EmailAdapterConfig) {
    if (config?.accessToken) {
      this.setAccessToken(config.accessToken);
    }
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    this.client = Client.init({
      authProvider: (done) => {
        done(null, token);
      },
    });
  }

  isAuthenticated(): boolean {
    return this.client !== null && this.accessToken !== null;
  }

  getAuthUrl(): string {
    // This is handled client-side with MSAL
    return '/auth/login';
  }

  async fetchEmails(limit: number): Promise<Email[]> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.client
        .api('/me/messages')
        .top(limit)
        .select('id,subject,from,bodyPreview,body,receivedDateTime,isRead,hasAttachments')
        .orderby('receivedDateTime DESC')
        .get();

      return response.value.map(this.mapGraphEmailToEmail);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      throw error;
    }
  }

  async getEmail(id: string): Promise<Email | null> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      const email = await this.client
        .api(`/me/messages/${id}`)
        .select('id,subject,from,bodyPreview,body,receivedDateTime,isRead,hasAttachments')
        .get();

      return this.mapGraphEmailToEmail(email);
    } catch (error) {
      console.error('Failed to get email:', error);
      return null;
    }
  }

  async deleteEmail(id: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.api(`/me/messages/${id}`).delete();
      return true;
    } catch (error) {
      console.error('Failed to delete email:', error);
      return false;
    }
  }

  async sendReply(emailId: string, content: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.api(`/me/messages/${emailId}/reply`).post({
        message: {
          body: {
            contentType: 'Text',
            content,
          },
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send reply:', error);
      return false;
    }
  }

  async archiveEmail(id: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      // Move to Archive folder
      const archiveFolder = await this.getOrCreateArchiveFolder();
      await this.client.api(`/me/messages/${id}/move`).post({
        destinationId: archiveFolder.id,
      });
      return true;
    } catch (error) {
      console.error('Failed to archive email:', error);
      return false;
    }
  }

  async markAsRead(id: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      await this.client.api(`/me/messages/${id}`).patch({
        isRead: true,
      });
      return true;
    } catch (error) {
      console.error('Failed to mark as read:', error);
      return false;
    }
  }

  private async getOrCreateArchiveFolder(): Promise<{ id: string }> {
    if (!this.client) {
      throw new Error('Not authenticated');
    }

    try {
      // Try to find existing Archive folder
      const folders = await this.client
        .api('/me/mailFolders')
        .filter("displayName eq 'Archive'")
        .get();

      if (folders.value.length > 0) {
        return folders.value[0];
      }

      // Create Archive folder if it doesn't exist
      const newFolder = await this.client.api('/me/mailFolders').post({
        displayName: 'Archive',
      });

      return newFolder;
    } catch (error) {
      console.error('Failed to get/create archive folder:', error);
      throw error;
    }
  }

  private mapGraphEmailToEmail(graphEmail: Record<string, unknown>): Email {
    const from = graphEmail.from as { emailAddress?: { name?: string; address?: string } } | undefined;
    const body = graphEmail.body as { content?: string } | undefined;

    return {
      id: graphEmail.id as string,
      subject: (graphEmail.subject as string) || '(No Subject)',
      from: {
        name: from?.emailAddress?.name || 'Unknown',
        email: from?.emailAddress?.address || '',
      },
      preview: (graphEmail.bodyPreview as string) || '',
      body: body?.content || '',
      receivedAt: new Date(graphEmail.receivedDateTime as string),
      isRead: graphEmail.isRead as boolean,
      hasAttachments: graphEmail.hasAttachments as boolean,
    };
  }
}
