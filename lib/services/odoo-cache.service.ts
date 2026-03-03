// Odoo cache service - caches Odoo records in Supabase for stale-while-revalidate pattern

import type { Database } from '@/types/database';
import type {
  OdooRfpSummary,
  OdooSalesOrderSummary,
  OdooInvoiceSummary,
  OdooSuggestedAction,
  OdooRfpState,
  OdooSalesState,
  OdooInvoiceState,
  OdooPaymentState,
} from '@/types/odoo';
import {
  RFP_STATE_LABELS,
  SALES_STATE_LABELS,
  INVOICE_STATE_LABELS,
  PAYMENT_STATE_LABELS,
  INVOICE_STATUS_LABELS,
} from '@/types/odoo';

type RfpCache = Database['public']['Tables']['odoo_rfp_cache']['Row'];
type RfpCacheInsert = Database['public']['Tables']['odoo_rfp_cache']['Insert'];
type SalesCache = Database['public']['Tables']['odoo_sales_cache']['Row'];
type SalesCacheInsert = Database['public']['Tables']['odoo_sales_cache']['Insert'];
type InvoiceCache = Database['public']['Tables']['odoo_invoices_cache']['Row'];
type InvoiceCacheInsert = Database['public']['Tables']['odoo_invoices_cache']['Insert'];

type CacheTable = 'odoo_rfp_cache' | 'odoo_sales_cache' | 'odoo_invoices_cache';

export class OdooCacheService {
  private supabase: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>;
  private userId: string;

  constructor(
    supabaseClient: ReturnType<typeof import('@supabase/supabase-js').createClient<Database>>,
    userId: string
  ) {
    this.supabase = supabaseClient;
    this.userId = userId;
  }

  // ============ Shared ============

  async isCacheStale(table: CacheTable, maxAgeMinutes: number = 5): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(table)
      .select('updated_at')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return true;
    }

    const lastUpdate = new Date(data.updated_at!);
    const now = new Date();
    const ageMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    return ageMinutes > maxAgeMinutes;
  }

  // ============ RFPs ============

  async getCachedRfps(limit: number = 10): Promise<RfpCache[]> {
    const { data, error } = await this.supabase
      .from('odoo_rfp_cache')
      .select('*')
      .eq('user_id', this.userId)
      .order('date_order', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get cached RFPs:', error);
      return [];
    }

    return data || [];
  }

  async cacheRfps(summaries: OdooRfpSummary[]): Promise<void> {
    const entries: RfpCacheInsert[] = summaries.map((rfp) => ({
      user_id: this.userId,
      odoo_id: rfp.id,
      provider: 'odoo',
      name: rfp.name,
      vendor_id: rfp.vendorId,
      vendor_name: rfp.vendor,
      amount_total: rfp.amount,
      currency: rfp.currency,
      currency_symbol: rfp.currencySymbol,
      state: rfp.state,
      date_order: rfp.date instanceof Date ? rfp.date.toISOString() : rfp.date,
      origin: rfp.origin || null,
      line_count: rfp.lineCount,
      ai_summary: rfp.aiSummary || null,
      ai_priority: rfp.aiPriority || null,
      ai_suggested_action: rfp.aiSuggestedAction ? JSON.stringify(rfp.aiSuggestedAction) : null,
      analyzed_at: rfp.aiSummary ? new Date().toISOString() : null,
    }));

    for (const entry of entries) {
      const { error } = await this.supabase
        .from('odoo_rfp_cache')
        .upsert(entry, {
          onConflict: 'user_id,odoo_id,provider',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Failed to cache RFP:', error);
      }
    }
  }

  async invalidateRfp(odooId: number): Promise<void> {
    const { error } = await this.supabase
      .from('odoo_rfp_cache')
      .delete()
      .eq('user_id', this.userId)
      .eq('odoo_id', odooId);

    if (error) {
      console.error('Failed to invalidate RFP cache:', error);
    }
  }

  // ============ Sales Orders ============

  async getCachedSales(limit: number = 10): Promise<SalesCache[]> {
    const { data, error } = await this.supabase
      .from('odoo_sales_cache')
      .select('*')
      .eq('user_id', this.userId)
      .order('date_order', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get cached sales orders:', error);
      return [];
    }

    return data || [];
  }

  async cacheSales(summaries: OdooSalesOrderSummary[]): Promise<void> {
    const entries: SalesCacheInsert[] = summaries.map((order) => ({
      user_id: this.userId,
      odoo_id: order.id,
      provider: 'odoo',
      name: order.name,
      customer_id: order.customerId,
      customer_name: order.customer,
      amount_total: order.amount,
      currency: order.currency,
      currency_symbol: order.currencySymbol,
      state: order.state,
      date_order: order.date instanceof Date ? order.date.toISOString() : order.date,
      invoice_status: order.invoiceStatus,
      line_count: order.lineCount,
      ai_summary: order.aiSummary || null,
      ai_priority: order.aiPriority || null,
      ai_suggested_action: order.aiSuggestedAction ? JSON.stringify(order.aiSuggestedAction) : null,
      analyzed_at: order.aiSummary ? new Date().toISOString() : null,
    }));

    for (const entry of entries) {
      const { error } = await this.supabase
        .from('odoo_sales_cache')
        .upsert(entry, {
          onConflict: 'user_id,odoo_id,provider',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Failed to cache sales order:', error);
      }
    }
  }

  async invalidateSale(odooId: number): Promise<void> {
    const { error } = await this.supabase
      .from('odoo_sales_cache')
      .delete()
      .eq('user_id', this.userId)
      .eq('odoo_id', odooId);

    if (error) {
      console.error('Failed to invalidate sales cache:', error);
    }
  }

  // ============ Invoices ============

  async getCachedInvoices(limit: number = 10): Promise<InvoiceCache[]> {
    const { data, error } = await this.supabase
      .from('odoo_invoices_cache')
      .select('*')
      .eq('user_id', this.userId)
      .order('invoice_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get cached invoices:', error);
      return [];
    }

    return data || [];
  }

  async cacheInvoices(summaries: OdooInvoiceSummary[]): Promise<void> {
    const entries: InvoiceCacheInsert[] = summaries.map((inv) => ({
      user_id: this.userId,
      odoo_id: inv.id,
      provider: 'odoo',
      name: inv.name,
      partner_id: inv.partnerId,
      partner_name: inv.partner,
      amount_total: inv.amount,
      amount_residual: inv.amountDue,
      currency: inv.currency,
      currency_symbol: inv.currencySymbol,
      state: inv.state,
      payment_state: inv.paymentState,
      move_type: inv.moveType,
      invoice_date: inv.invoiceDate instanceof Date ? inv.invoiceDate.toISOString() : inv.invoiceDate,
      invoice_date_due: inv.dueDate instanceof Date ? inv.dueDate.toISOString() : inv.dueDate,
      is_overdue: inv.isOverdue,
      days_overdue: inv.daysOverdue,
      line_count: inv.lineCount,
      ai_summary: inv.aiSummary || null,
      ai_priority: inv.aiPriority || null,
      ai_suggested_action: inv.aiSuggestedAction ? JSON.stringify(inv.aiSuggestedAction) : null,
      analyzed_at: inv.aiSummary ? new Date().toISOString() : null,
    }));

    for (const entry of entries) {
      const { error } = await this.supabase
        .from('odoo_invoices_cache')
        .upsert(entry, {
          onConflict: 'user_id,odoo_id,provider',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Failed to cache invoice:', error);
      }
    }
  }

  async invalidateInvoice(odooId: number): Promise<void> {
    const { error } = await this.supabase
      .from('odoo_invoices_cache')
      .delete()
      .eq('user_id', this.userId)
      .eq('odoo_id', odooId);

    if (error) {
      console.error('Failed to invalidate invoice cache:', error);
    }
  }

  // ============ Static Converters ============

  static parseAction(raw: string | null): OdooSuggestedAction | undefined {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as OdooSuggestedAction;
    } catch {
      return { type: raw as OdooSuggestedAction['type'], label: raw, description: '', urgency: 'normal' };
    }
  }

  static toRfpSummary(row: RfpCache): OdooRfpSummary {
    const state = (row.state || 'draft') as OdooRfpState;
    return {
      id: row.odoo_id,
      name: row.name || '',
      vendor: row.vendor_name || '',
      vendorId: row.vendor_id || 0,
      amount: row.amount_total || 0,
      currency: row.currency || 'USD',
      currencySymbol: row.currency_symbol || '$',
      state,
      stateLabel: RFP_STATE_LABELS[state] || state,
      date: row.date_order ? new Date(row.date_order) : new Date(),
      origin: row.origin || undefined,
      lineCount: row.line_count || 0,
      aiSummary: row.ai_summary || undefined,
      aiPriority: (row.ai_priority as 'high' | 'medium' | 'low') || undefined,
      aiSuggestedAction: OdooCacheService.parseAction(row.ai_suggested_action),
    };
  }

  static toSalesOrderSummary(row: SalesCache): OdooSalesOrderSummary {
    const state = (row.state || 'draft') as OdooSalesState;
    const invoiceStatus = row.invoice_status || 'no';
    return {
      id: row.odoo_id,
      name: row.name || '',
      customer: row.customer_name || '',
      customerId: row.customer_id || 0,
      amount: row.amount_total || 0,
      currency: row.currency || 'USD',
      currencySymbol: row.currency_symbol || '$',
      state,
      stateLabel: SALES_STATE_LABELS[state] || state,
      date: row.date_order ? new Date(row.date_order) : new Date(),
      invoiceStatus,
      invoiceStatusLabel: INVOICE_STATUS_LABELS[invoiceStatus] || invoiceStatus,
      lineCount: row.line_count || 0,
      aiSummary: row.ai_summary || undefined,
      aiPriority: (row.ai_priority as 'high' | 'medium' | 'low') || undefined,
      aiSuggestedAction: OdooCacheService.parseAction(row.ai_suggested_action),
    };
  }

  static toInvoiceSummary(row: InvoiceCache): OdooInvoiceSummary {
    const state = (row.state || 'draft') as OdooInvoiceState;
    const paymentState = (row.payment_state || 'not_paid') as OdooPaymentState;
    return {
      id: row.odoo_id,
      name: row.name || '',
      partner: row.partner_name || '',
      partnerId: row.partner_id || 0,
      amount: row.amount_total || 0,
      amountDue: row.amount_residual || 0,
      currency: row.currency || 'USD',
      currencySymbol: row.currency_symbol || '$',
      state,
      stateLabel: INVOICE_STATE_LABELS[state] || state,
      paymentState,
      paymentStateLabel: PAYMENT_STATE_LABELS[paymentState] || paymentState,
      moveType: row.move_type || 'out_invoice',
      invoiceDate: row.invoice_date ? new Date(row.invoice_date) : new Date(),
      dueDate: row.invoice_date_due ? new Date(row.invoice_date_due) : new Date(),
      isOverdue: row.is_overdue || false,
      daysOverdue: row.days_overdue || 0,
      lineCount: row.line_count || 0,
      aiSummary: row.ai_summary || undefined,
      aiPriority: (row.ai_priority as 'high' | 'medium' | 'low') || undefined,
      aiSuggestedAction: OdooCacheService.parseAction(row.ai_suggested_action),
    };
  }
}
