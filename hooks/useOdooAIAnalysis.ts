'use client';

import { useQuery } from '@tanstack/react-query';
import type { OdooRfpSummary, OdooSalesOrderSummary, OdooInvoiceSummary, OdooSuggestedAction } from '@/types/odoo';

interface AIActionResult {
  id: number;
  type: 'rfp' | 'sales' | 'invoice';
  aiPriority: 'high' | 'medium' | 'low';
  aiSummary: string;
  aiSuggestedAction: OdooSuggestedAction;
}

interface AnalysisInput {
  rfps: OdooRfpSummary[];
  orders: OdooSalesOrderSummary[];
  invoices: OdooInvoiceSummary[];
}

async function fetchAIAnalysis(input: AnalysisInput): Promise<AIActionResult[]> {
  // Build compact items for the API
  const items = [
    ...input.rfps.map((r) => ({
      id: r.id,
      type: 'rfp' as const,
      name: r.name,
      entity: r.vendor,
      amount: r.amount,
      currency: r.currencySymbol,
      state: r.state,
      stateLabel: r.stateLabel,
      date: new Date(r.date).toISOString().split('T')[0],
      lineCount: r.lineCount,
    })),
    ...input.orders.map((o) => ({
      id: o.id,
      type: 'sales' as const,
      name: o.name,
      entity: o.customer,
      amount: o.amount,
      currency: o.currencySymbol,
      state: o.state,
      stateLabel: o.stateLabel,
      date: new Date(o.date).toISOString().split('T')[0],
      lineCount: o.lineCount,
      invoiceStatus: o.invoiceStatusLabel,
    })),
    ...input.invoices.map((i) => ({
      id: i.id,
      type: 'invoice' as const,
      name: i.name,
      entity: i.partner,
      amount: i.amount,
      currency: i.currencySymbol,
      state: i.state,
      stateLabel: i.stateLabel,
      date: new Date(i.invoiceDate).toISOString().split('T')[0],
      lineCount: i.lineCount,
      amountDue: i.amountDue,
      paymentState: i.paymentStateLabel,
      dueDate: new Date(i.dueDate).toISOString().split('T')[0],
      isOverdue: i.isOverdue,
      daysOverdue: i.daysOverdue,
    })),
  ];

  if (items.length === 0) return [];

  const response = await fetch('/api/odoo/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'AI analysis failed');
  }

  return data.data;
}

/**
 * Merges AI analysis results back into the summary objects.
 * Returns new arrays with aiSummary, aiPriority, and aiSuggestedAction populated.
 */
function mergeAnalysis(
  input: AnalysisInput,
  analysis: AIActionResult[]
): AnalysisInput {
  const byKey = new Map(analysis.map((a) => [`${a.type}-${a.id}`, a]));

  return {
    rfps: input.rfps.map((r) => {
      const ai = byKey.get(`rfp-${r.id}`);
      if (!ai) return r;
      return { ...r, aiSummary: ai.aiSummary, aiPriority: ai.aiPriority, aiSuggestedAction: ai.aiSuggestedAction };
    }),
    orders: input.orders.map((o) => {
      const ai = byKey.get(`sales-${o.id}`);
      if (!ai) return o;
      return { ...o, aiSummary: ai.aiSummary, aiPriority: ai.aiPriority, aiSuggestedAction: ai.aiSuggestedAction };
    }),
    invoices: input.invoices.map((i) => {
      const ai = byKey.get(`invoice-${i.id}`);
      if (!ai) return i;
      return { ...i, aiSummary: ai.aiSummary, aiPriority: ai.aiPriority, aiSuggestedAction: ai.aiSuggestedAction };
    }),
  };
}

/**
 * Hook that takes raw Odoo data and returns AI-enriched versions.
 * Calls Claude to analyze and generate predictive actions.
 */
export function useOdooAIAnalysis(
  rfps: OdooRfpSummary[],
  orders: OdooSalesOrderSummary[],
  invoices: OdooInvoiceSummary[]
) {
  const hasData = rfps.length > 0 || orders.length > 0 || invoices.length > 0;

  // Create a stable key from the data IDs so we only re-analyze when data changes
  const dataKey = [
    ...rfps.map((r) => `r${r.id}:${r.state}`),
    ...orders.map((o) => `s${o.id}:${o.state}`),
    ...invoices.map((i) => `i${i.id}:${i.state}:${i.paymentState}`),
  ].join(',');

  const query = useQuery({
    queryKey: ['odoo-ai-analysis', dataKey],
    queryFn: () => fetchAIAnalysis({ rfps, orders, invoices }),
    enabled: hasData,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    retry: 1,
  });

  // Merge AI results into the original data
  const enriched = query.data
    ? mergeAnalysis({ rfps, orders, invoices }, query.data)
    : { rfps, orders, invoices };

  return {
    rfps: enriched.rfps,
    orders: enriched.orders,
    invoices: enriched.invoices,
    isAnalyzing: query.isLoading,
    analysisError: query.error?.message || null,
    refetchAnalysis: query.refetch,
  };
}
