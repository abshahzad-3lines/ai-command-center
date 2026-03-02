-- Add actor_email field to odoo_mcp_actions for logging without requiring a profile
-- This allows logging actions with just an email/username

-- Make user_id nullable since we may not always have a valid profile
ALTER TABLE public.odoo_mcp_actions
    ALTER COLUMN user_id DROP NOT NULL;

-- Add actor_email field to store the actual username/email performing the action
ALTER TABLE public.odoo_mcp_actions
    ADD COLUMN IF NOT EXISTS actor_email VARCHAR(255);

-- Update RLS policies to allow insert without user_id
DROP POLICY IF EXISTS "Users can insert own MCP actions" ON public.odoo_mcp_actions;

CREATE POLICY "Allow insert MCP actions"
    ON public.odoo_mcp_actions FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Update select policy to also allow viewing by actor_email
DROP POLICY IF EXISTS "Users can view own MCP actions" ON public.odoo_mcp_actions;

CREATE POLICY "View MCP actions"
    ON public.odoo_mcp_actions FOR SELECT
    TO authenticated, anon
    USING (true);

-- Create index on actor_email
CREATE INDEX IF NOT EXISTS idx_odoo_mcp_actions_actor ON public.odoo_mcp_actions(actor_email);
