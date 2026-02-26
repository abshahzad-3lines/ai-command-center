// Email adapter interface - implement this for different providers

import type { Email } from '@/types';

export interface EmailAdapter {
  /**
   * Fetch emails from the provider
   */
  fetchEmails(limit: number): Promise<Email[]>;

  /**
   * Get a single email by ID
   */
  getEmail(id: string): Promise<Email | null>;

  /**
   * Delete an email
   */
  deleteEmail(id: string): Promise<boolean>;

  /**
   * Send a reply to an email
   */
  sendReply(emailId: string, content: string): Promise<boolean>;

  /**
   * Archive an email
   */
  archiveEmail(id: string): Promise<boolean>;

  /**
   * Mark email as read
   */
  markAsRead(id: string): Promise<boolean>;

  /**
   * Check if the adapter is authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Get the authentication URL
   */
  getAuthUrl(): string;
}

export interface EmailAdapterConfig {
  accessToken?: string;
}
