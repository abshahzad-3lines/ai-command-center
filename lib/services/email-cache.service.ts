// Email cache service - caches emails in Supabase for faster loading and offline access

import type { Database } from '@/types/database';
import type { EmailSummary } from '@/types';

type EmailCache = Database['public']['Tables']['email_cache']['Row'];
type EmailCacheInsert = Database['public']['Tables']['email_cache']['Insert'];

export class EmailCacheService {
  private supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>;
  private userId: string;

  constructor(
    supabaseClient: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>,
    userId: string
  ) {
    this.supabase = supabaseClient;
    this.userId = userId;
  }

  /**
   * Get cached emails for the user
   */
  async getCachedEmails(limit: number = 10): Promise<EmailCache[]> {
    const { data, error } = await this.supabase
      .from('email_cache')
      .select('*')
      .eq('user_id', this.userId)
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get cached emails:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Cache emails from Microsoft Graph
   */
  async cacheEmails(emails: EmailSummary[]): Promise<void> {
    const cacheEntries: EmailCacheInsert[] = emails.map((email) => ({
      user_id: this.userId,
      email_id: email.id,
      provider: 'outlook',
      subject: email.subject,
      sender_name: email.from.split('<')[0].trim(),
      sender_email: email.from.match(/<(.+)>/)?.[1] || email.from,
      preview: email.summary,
      received_at: email.receivedAt instanceof Date
        ? email.receivedAt.toISOString()
        : email.receivedAt,
      is_read: false,
      ai_summary: email.summary,
      ai_priority: email.priority,
      ai_suggested_action: email.suggestedAction?.type,
    }));

    // Upsert to handle duplicates
    for (const entry of cacheEntries) {
      const { error } = await this.supabase
        .from('email_cache')
        .upsert(entry, {
          onConflict: 'user_id,email_id,provider',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Failed to cache email:', error);
      }
    }
  }

  /**
   * Get a single cached email
   */
  async getCachedEmail(emailId: string): Promise<EmailCache | null> {
    const { data, error } = await this.supabase
      .from('email_cache')
      .select('*')
      .eq('user_id', this.userId)
      .eq('email_id', emailId)
      .single();

    if (error) {
      console.error('Failed to get cached email:', error);
      return null;
    }

    return data;
  }

  /**
   * Update AI analysis for an email
   */
  async updateAIAnalysis(
    emailId: string,
    analysis: {
      summary?: string;
      priority?: 'low' | 'medium' | 'high';
      suggestedAction?: string;
      categories?: string[];
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('email_cache')
      .update({
        ai_summary: analysis.summary,
        ai_priority: analysis.priority,
        ai_suggested_action: analysis.suggestedAction,
        ai_categories: analysis.categories,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId)
      .eq('email_id', emailId);

    if (error) {
      console.error('Failed to update AI analysis:', error);
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from('email_cache')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('email_id', emailId);

    if (error) {
      console.error('Failed to mark email as read:', error);
    }
  }

  /**
   * Delete cached email
   */
  async deleteCachedEmail(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from('email_cache')
      .delete()
      .eq('user_id', this.userId)
      .eq('email_id', emailId);

    if (error) {
      console.error('Failed to delete cached email:', error);
    }
  }

  /**
   * Check if cache is stale (older than specified minutes)
   */
  async isCacheStale(maxAgeMinutes: number = 5): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('email_cache')
      .select('updated_at')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return true; // No cache, consider stale
    }

    const lastUpdate = new Date(data.updated_at!);
    const now = new Date();
    const ageMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    return ageMinutes > maxAgeMinutes;
  }

  /**
   * Convert cached email to EmailSummary format
   */
  static toEmailSummary(cached: EmailCache): EmailSummary {
    return {
      id: cached.email_id,
      subject: cached.subject || '',
      from: cached.sender_name
        ? `${cached.sender_name} <${cached.sender_email}>`
        : cached.sender_email || '',
      summary: cached.ai_summary || cached.preview || '',
      receivedAt: cached.received_at ? new Date(cached.received_at) : new Date(),
      priority: (cached.ai_priority as 'low' | 'medium' | 'high') || 'medium',
      suggestedAction: {
        type: (cached.ai_suggested_action as 'reply' | 'archive' | 'flag' | 'none') || 'none',
        label: cached.ai_suggested_action || 'Review',
        description: '',
      },
    };
  }
}
