-- Fix RLS policies for chat_messages and odoo_mcp_actions tables
-- Allow anonymous/service role access for the AI chat functionality

-- ============================================
-- CHAT MESSAGES - Allow insert/select without auth
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;

-- Create permissive policies for chat
CREATE POLICY "Allow all chat operations"
    ON public.chat_messages FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- ============================================
-- ODOO MCP ACTIONS - Allow insert/select for logging
-- ============================================

-- Drop existing policies (already done in previous migration, but be safe)
DROP POLICY IF EXISTS "Users can view own MCP actions" ON public.odoo_mcp_actions;
DROP POLICY IF EXISTS "Users can insert own MCP actions" ON public.odoo_mcp_actions;
DROP POLICY IF EXISTS "Allow insert MCP actions" ON public.odoo_mcp_actions;
DROP POLICY IF EXISTS "View MCP actions" ON public.odoo_mcp_actions;

-- Create permissive policies for action logging
CREATE POLICY "Allow all action log operations"
    ON public.odoo_mcp_actions FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
