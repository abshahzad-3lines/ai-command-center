// User service - handles user profile and settings with Supabase

import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];

export interface MicrosoftUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export class UserService {
  private supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>;

  constructor(supabaseClient: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>) {
    this.supabase = supabaseClient;
  }

  /**
   * Sync Microsoft user with Supabase profile
   * Creates or updates the profile based on Microsoft account info
   */
  async syncMicrosoftUser(msUser: MicrosoftUser): Promise<Profile | null> {
    // First, check if profile exists
    const { data: existingProfile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', msUser.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          email: msUser.email,
          full_name: msUser.name,
          avatar_url: msUser.avatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', msUser.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update profile:', error);
        return existingProfile;
      }
      return data;
    }

    // Create new profile
    const newProfile: ProfileInsert = {
      id: msUser.id,
      email: msUser.email,
      full_name: msUser.name,
      avatar_url: msUser.avatar,
    };

    const { data, error } = await this.supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      console.error('Failed to create profile:', error);
      return null;
    }

    // Create default settings for new user
    await this.createDefaultSettings(msUser.id);

    return data;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
    return data;
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update profile:', error);
      return null;
    }
    return data;
  }

  async getSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to get settings:', error);
      return null;
    }

    // Create default settings if not found
    if (!data) {
      return this.createDefaultSettings(userId);
    }

    return data;
  }

  async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings | null> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update settings:', error);
      return null;
    }
    return data;
  }

  private async createDefaultSettings(userId: string): Promise<UserSettings | null> {
    const defaultSettings: UserSettingsInsert = {
      user_id: userId,
      theme: 'system',
      notifications_email: true,
      notifications_push: false,
      notifications_desktop: true,
      email_connected: false,
      calendar_connected: false,
    };

    const { data, error } = await this.supabase
      .from('user_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      console.error('Failed to create default settings:', error);
      return null;
    }
    return data;
  }

  async markEmailConnected(userId: string, connected: boolean = true): Promise<void> {
    await this.supabase
      .from('user_settings')
      .update({ email_connected: connected, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  async markCalendarConnected(userId: string, connected: boolean = true): Promise<void> {
    await this.supabase
      .from('user_settings')
      .update({ calendar_connected: connected, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }
}
