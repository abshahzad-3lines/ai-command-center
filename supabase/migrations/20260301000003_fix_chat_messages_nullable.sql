-- Fix chat_messages table to allow anonymous users
-- Make user_id nullable since we support anonymous chat

-- Remove the foreign key constraint temporarily
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Make user_id nullable
ALTER TABLE public.chat_messages ALTER COLUMN user_id DROP NOT NULL;

-- Re-add foreign key with ON DELETE SET NULL
ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
