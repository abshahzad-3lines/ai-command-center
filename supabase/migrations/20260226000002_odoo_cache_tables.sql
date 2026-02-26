-- Odoo ERP Cache Tables
-- This migration creates cache tables for Odoo RFPs, Sales Orders, and Invoices

-- ============================================
-- ODOO RFP CACHE TABLE
-- Caches Purchase Requests / RFQs from Odoo
-- ============================================
CREATE TABLE IF NOT EXISTS public.odoo_rfp_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    odoo_id INTEGER NOT NULL,
    name VARCHAR(255),
    vendor_name VARCHAR(255),
    vendor_id INTEGER,
    state VARCHAR(50),
    amount_total DECIMAL(15,2),
    currency VARCHAR(10),
    currency_symbol VARCHAR(5),
    date_order TIMESTAMPTZ,
    origin TEXT,
    line_count INTEGER DEFAULT 0,

    -- AI Analysis
    ai_summary TEXT,
    ai_priority VARCHAR(20) CHECK (ai_priority IN ('low', 'medium', 'high')),
    ai_suggested_action VARCHAR(50),
    ai_risk_factors JSONB DEFAULT '[]',
    analyzed_at TIMESTAMPTZ,

    -- Metadata
    raw_data JSONB,
    provider VARCHAR(50) DEFAULT 'odoo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, odoo_id, provider)
);

-- Enable RLS
ALTER TABLE public.odoo_rfp_cache ENABLE ROW LEVEL SECURITY;

-- RFP cache policies
CREATE POLICY "Users can view own RFP cache"
    ON public.odoo_rfp_cache FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own RFP cache"
    ON public.odoo_rfp_cache FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own RFP cache"
    ON public.odoo_rfp_cache FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own RFP cache"
    ON public.odoo_rfp_cache FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- ODOO SALES ORDER CACHE TABLE
-- Caches Sales Orders from Odoo
-- ============================================
CREATE TABLE IF NOT EXISTS public.odoo_sales_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    odoo_id INTEGER NOT NULL,
    name VARCHAR(255),
    customer_name VARCHAR(255),
    customer_id INTEGER,
    state VARCHAR(50),
    invoice_status VARCHAR(50),
    amount_total DECIMAL(15,2),
    currency VARCHAR(10),
    currency_symbol VARCHAR(5),
    date_order TIMESTAMPTZ,
    line_count INTEGER DEFAULT 0,

    -- AI Analysis
    ai_summary TEXT,
    ai_priority VARCHAR(20) CHECK (ai_priority IN ('low', 'medium', 'high')),
    ai_suggested_action VARCHAR(50),
    analyzed_at TIMESTAMPTZ,

    -- Metadata
    raw_data JSONB,
    provider VARCHAR(50) DEFAULT 'odoo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, odoo_id, provider)
);

-- Enable RLS
ALTER TABLE public.odoo_sales_cache ENABLE ROW LEVEL SECURITY;

-- Sales cache policies
CREATE POLICY "Users can view own sales cache"
    ON public.odoo_sales_cache FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sales cache"
    ON public.odoo_sales_cache FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sales cache"
    ON public.odoo_sales_cache FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sales cache"
    ON public.odoo_sales_cache FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- ODOO INVOICE CACHE TABLE
-- Caches Invoices from Odoo
-- ============================================
CREATE TABLE IF NOT EXISTS public.odoo_invoices_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    odoo_id INTEGER NOT NULL,
    name VARCHAR(255),
    partner_name VARCHAR(255),
    partner_id INTEGER,
    move_type VARCHAR(50),
    state VARCHAR(50),
    payment_state VARCHAR(50),
    amount_total DECIMAL(15,2),
    amount_residual DECIMAL(15,2),
    currency VARCHAR(10),
    currency_symbol VARCHAR(5),
    invoice_date DATE,
    invoice_date_due DATE,
    is_overdue BOOLEAN DEFAULT false,
    days_overdue INTEGER DEFAULT 0,
    line_count INTEGER DEFAULT 0,

    -- AI Analysis
    ai_summary TEXT,
    ai_priority VARCHAR(20) CHECK (ai_priority IN ('low', 'medium', 'high')),
    ai_suggested_action VARCHAR(50),
    analyzed_at TIMESTAMPTZ,

    -- Metadata
    raw_data JSONB,
    provider VARCHAR(50) DEFAULT 'odoo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, odoo_id, provider)
);

-- Enable RLS
ALTER TABLE public.odoo_invoices_cache ENABLE ROW LEVEL SECURITY;

-- Invoice cache policies
CREATE POLICY "Users can view own invoices cache"
    ON public.odoo_invoices_cache FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own invoices cache"
    ON public.odoo_invoices_cache FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own invoices cache"
    ON public.odoo_invoices_cache FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own invoices cache"
    ON public.odoo_invoices_cache FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- ODOO MCP ACTIONS LOG TABLE
-- Logs all MCP tool executions for audit
-- ============================================
CREATE TABLE IF NOT EXISTS public.odoo_mcp_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100),
    record_id INTEGER,
    record_name VARCHAR(255),
    input_args JSONB,
    result JSONB,
    success BOOLEAN,
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.odoo_mcp_actions ENABLE ROW LEVEL SECURITY;

-- MCP actions policies
CREATE POLICY "Users can view own MCP actions"
    ON public.odoo_mcp_actions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own MCP actions"
    ON public.odoo_mcp_actions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_odoo_rfp_cache_user ON public.odoo_rfp_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_odoo_rfp_cache_state ON public.odoo_rfp_cache(state);
CREATE INDEX IF NOT EXISTS idx_odoo_rfp_cache_date ON public.odoo_rfp_cache(date_order DESC);

CREATE INDEX IF NOT EXISTS idx_odoo_sales_cache_user ON public.odoo_sales_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_odoo_sales_cache_state ON public.odoo_sales_cache(state);
CREATE INDEX IF NOT EXISTS idx_odoo_sales_cache_date ON public.odoo_sales_cache(date_order DESC);

CREATE INDEX IF NOT EXISTS idx_odoo_invoices_cache_user ON public.odoo_invoices_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_odoo_invoices_cache_state ON public.odoo_invoices_cache(state);
CREATE INDEX IF NOT EXISTS idx_odoo_invoices_cache_due ON public.odoo_invoices_cache(invoice_date_due);
CREATE INDEX IF NOT EXISTS idx_odoo_invoices_cache_overdue ON public.odoo_invoices_cache(is_overdue) WHERE is_overdue = true;

CREATE INDEX IF NOT EXISTS idx_odoo_mcp_actions_user ON public.odoo_mcp_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_odoo_mcp_actions_tool ON public.odoo_mcp_actions(tool_name);
CREATE INDEX IF NOT EXISTS idx_odoo_mcp_actions_date ON public.odoo_mcp_actions(executed_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_odoo_rfp_cache_updated_at
    BEFORE UPDATE ON public.odoo_rfp_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_odoo_sales_cache_updated_at
    BEFORE UPDATE ON public.odoo_sales_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_odoo_invoices_cache_updated_at
    BEFORE UPDATE ON public.odoo_invoices_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
