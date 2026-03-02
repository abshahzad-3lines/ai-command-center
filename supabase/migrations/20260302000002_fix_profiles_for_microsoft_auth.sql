-- Fix profiles table for Microsoft MSAL authentication
-- The app uses Microsoft Azure AD (MSAL), not Supabase Auth.
-- profiles.id had a FK to auth.users which is never populated.

-- 1. Drop the trigger that auto-creates profiles from auth.users (unused)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Drop the FK from profiles → auth.users
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;

-- Re-add primary key without the FK
ALTER TABLE public.profiles
    ADD PRIMARY KEY (id);

-- 3. Add microsoft_id column for mapping Microsoft accounts to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS microsoft_id TEXT UNIQUE;

-- 4. Relax RLS on profiles to allow anonymous access (MSAL auth, not Supabase auth)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Allow all profile operations"
    ON public.profiles FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 5. Relax RLS on tasks table (same pattern as chat_messages)
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Allow all task operations"
    ON public.tasks FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 6. Relax RLS on user_settings table
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;

CREATE POLICY "Allow all user_settings operations"
    ON public.user_settings FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 7. Create index on microsoft_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_microsoft_id ON public.profiles(microsoft_id);
