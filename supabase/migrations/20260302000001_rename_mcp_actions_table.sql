-- Rename odoo_mcp_actions → odoo_action_logs
-- The table was misnamed with "mcp" but uses direct JSON-RPC, not MCP

ALTER TABLE public.odoo_mcp_actions RENAME TO odoo_action_logs;

-- Rename indexes
ALTER INDEX IF EXISTS idx_odoo_mcp_actions_user RENAME TO idx_odoo_action_logs_user;
ALTER INDEX IF EXISTS idx_odoo_mcp_actions_tool RENAME TO idx_odoo_action_logs_tool;
ALTER INDEX IF EXISTS idx_odoo_mcp_actions_date RENAME TO idx_odoo_action_logs_date;
ALTER INDEX IF EXISTS idx_odoo_mcp_actions_actor RENAME TO idx_odoo_action_logs_actor;

-- Rename the current RLS policy (set by migration 20260301000002)
ALTER POLICY "Allow all action log operations" ON public.odoo_action_logs
  RENAME TO "Allow all odoo action log operations";

-- Rename FK constraint
ALTER TABLE public.odoo_action_logs
  RENAME CONSTRAINT odoo_mcp_actions_user_id_fkey TO odoo_action_logs_user_id_fkey;
