// Calendar cache service - caches calendar events in Supabase

import type { Database } from '@/types/database';
import type { CalendarEvent } from '@/types';

type CalendarCache = Database['public']['Tables']['calendar_cache']['Row'];
type CalendarCacheInsert = Database['public']['Tables']['calendar_cache']['Insert'];

export class CalendarCacheService {
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
   * Get cached calendar events for a date range
   */
  async getCachedEvents(startDate: Date, endDate: Date): Promise<CalendarCache[]> {
    const { data, error } = await this.supabase
      .from('calendar_cache')
      .select('*')
      .eq('user_id', this.userId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Failed to get cached events:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Cache calendar events from Microsoft Graph
   */
  async cacheEvents(events: CalendarEvent[]): Promise<void> {
    const cacheEntries: CalendarCacheInsert[] = events.map((event) => ({
      user_id: this.userId,
      event_id: event.id,
      provider: 'outlook',
      subject: event.subject,
      body: event.body,
      location: event.location,
      start_time: event.start.toISOString(),
      end_time: event.end.toISOString(),
      is_all_day: event.isAllDay,
      is_online: event.isOnline,
      online_meeting_url: event.onlineMeetingUrl,
      organizer_name: event.organizer?.name,
      organizer_email: event.organizer?.email,
      attendees: event.attendees as unknown as Database['public']['Tables']['calendar_cache']['Insert']['attendees'],
      importance: event.importance,
      show_as: event.showAs,
    }));

    // Upsert to handle duplicates
    for (const entry of cacheEntries) {
      const { error } = await this.supabase
        .from('calendar_cache')
        .upsert(entry, {
          onConflict: 'user_id,event_id,provider',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Failed to cache event:', error);
      }
    }
  }

  /**
   * Get a single cached event
   */
  async getCachedEvent(eventId: string): Promise<CalendarCache | null> {
    const { data, error } = await this.supabase
      .from('calendar_cache')
      .select('*')
      .eq('user_id', this.userId)
      .eq('event_id', eventId)
      .single();

    if (error) {
      console.error('Failed to get cached event:', error);
      return null;
    }

    return data;
  }

  /**
   * Delete cached event
   */
  async deleteCachedEvent(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_cache')
      .delete()
      .eq('user_id', this.userId)
      .eq('event_id', eventId);

    if (error) {
      console.error('Failed to delete cached event:', error);
    }
  }

  /**
   * Clear all cached events for user
   */
  async clearCache(): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_cache')
      .delete()
      .eq('user_id', this.userId);

    if (error) {
      console.error('Failed to clear calendar cache:', error);
    }
  }

  /**
   * Convert cached event to CalendarEvent format
   */
  static toCalendarEvent(cached: CalendarCache): CalendarEvent {
    return {
      id: cached.event_id,
      subject: cached.subject || '',
      body: cached.body || undefined,
      location: cached.location || undefined,
      start: new Date(cached.start_time!),
      end: new Date(cached.end_time!),
      isAllDay: cached.is_all_day || false,
      isOnline: cached.is_online || false,
      onlineMeetingUrl: cached.online_meeting_url || undefined,
      organizer: cached.organizer_name
        ? { name: cached.organizer_name, email: cached.organizer_email || '' }
        : undefined,
      attendees: (cached.attendees as Array<{ name: string; email: string; status: 'accepted' | 'declined' | 'tentative' | 'none' }>) || [],
      importance: (cached.importance as 'low' | 'normal' | 'high') || 'normal',
      showAs: (cached.show_as as 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown') || 'busy',
    };
  }
}
