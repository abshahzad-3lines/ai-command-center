-- AI Command Center - Initial Schema
-- This migration creates the core tables for the application

-- ============================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- ============================================
-- USER SETTINGS TABLE
-- Stores user preferences and settings
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    notifications_email BOOLEAN DEFAULT true,
    notifications_push BOOLEAN DEFAULT false,
    notifications_desktop BOOLEAN DEFAULT true,
    email_connected BOOLEAN DEFAULT false,
    calendar_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view own settings"
    ON public.user_settings FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
    ON public.user_settings FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
    ON public.user_settings FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- CHAT MESSAGES TABLE
-- Stores AI chat conversation history
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can view own messages"
    ON public.chat_messages FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own messages"
    ON public.chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own messages"
    ON public.chat_messages FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- TASKS TABLE
-- Stores user tasks/todos
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view own tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- EMAIL CACHE TABLE
-- Caches email metadata and AI analysis
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_id TEXT NOT NULL, -- External email ID from provider
    provider TEXT DEFAULT 'outlook',
    subject TEXT,
    sender_name TEXT,
    sender_email TEXT,
    preview TEXT,
    received_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false,
    -- AI analysis fields
    ai_summary TEXT,
    ai_priority TEXT CHECK (ai_priority IN ('low', 'medium', 'high')),
    ai_suggested_action TEXT,
    ai_categories TEXT[] DEFAULT '{}',
    analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, email_id, provider)
);

-- Enable RLS
ALTER TABLE public.email_cache ENABLE ROW LEVEL SECURITY;

-- Email cache policies
CREATE POLICY "Users can view own email cache"
    ON public.email_cache FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own email cache"
    ON public.email_cache FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own email cache"
    ON public.email_cache FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own email cache"
    ON public.email_cache FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- CALENDAR EVENTS CACHE TABLE
-- Caches calendar events
-- ============================================
CREATE TABLE IF NOT EXISTS public.calendar_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL, -- External event ID from provider
    provider TEXT DEFAULT 'outlook',
    subject TEXT,
    body TEXT,
    location TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_all_day BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false,
    online_meeting_url TEXT,
    organizer_name TEXT,
    organizer_email TEXT,
    attendees JSONB DEFAULT '[]',
    importance TEXT DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high')),
    show_as TEXT DEFAULT 'busy',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id, provider)
);

-- Enable RLS
ALTER TABLE public.calendar_cache ENABLE ROW LEVEL SECURITY;

-- Calendar cache policies
CREATE POLICY "Users can view own calendar cache"
    ON public.calendar_cache FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar cache"
    ON public.calendar_cache FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar cache"
    ON public.calendar_cache FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar cache"
    ON public.calendar_cache FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_email_cache_user_id ON public.email_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_email_cache_received_at ON public.email_cache(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_cache_user_id ON public.calendar_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_cache_start_time ON public.calendar_cache(start_time);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );

    -- Create default settings
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_email_cache_updated_at
    BEFORE UPDATE ON public.email_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_calendar_cache_updated_at
    BEFORE UPDATE ON public.calendar_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
