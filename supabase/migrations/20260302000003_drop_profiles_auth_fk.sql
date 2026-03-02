-- Drop the remaining FK from profiles.id → auth.users(id)
-- The app uses Microsoft MSAL auth, not Supabase Auth,
-- so profiles.id is never an auth.users UUID.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
