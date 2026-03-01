/**
 * @fileoverview React Query hooks for Odoo Invoice management
 * Provides data fetching, caching, and mutation capabilities for Odoo invoices
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@/types';
import type { OdooInvoiceSummary, OdooInvoice, McpToolResult } from '@/types/odoo';

/**
 * Configuration options for the useOdooInvoices hook
 */
interface UseOdooInvoicesOptions {
  /** Maximum number of invoices to fetch (default: 10) */
  limit?: number;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

async function fetchInvoices(limit: number): Promise<OdooInvoiceSummary[]> {
  const response = await fetch(`/api/odoo/invoices?limit=${limit}`);
  const data: ApiResponse<OdooInvoiceSummary[]> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch Invoices');
  }

  // Convert date strings back to Date objects
  return data.data.map((invoice) => ({
    ...invoice,
    invoiceDate: new Date(invoice.invoiceDate),
    dueDate: new Date(invoice.dueDate),
  }));
}

async function fetchInvoice(id: number): Promise<OdooInvoice> {
  const response = await fetch(`/api/odoo/invoices/${id}`);
  const data: ApiResponse<OdooInvoice> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch Invoice');
  }

  return data.data;
}

async function registerPayment(
  invoiceId: number,
  amount: number,
  date?: string
): Promise<McpToolResult> {
  const response = await fetch(`/api/odoo/invoices/${invoiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'register_payment', amount, date }),
  });

  const data: ApiResponse<McpToolResult> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to register payment');
  }

  return data.data;
}

async function sendReminder(
  invoiceId: number,
  reminderType: 'friendly' | 'formal' | 'final_notice'
): Promise<McpToolResult> {
  const response = await fetch(`/api/odoo/invoices/${invoiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'send_reminder', reminderType }),
  });

  const data: ApiResponse<McpToolResult> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to send reminder');
  }

  return data.data;
}

/**
 * Hook for fetching and managing Odoo Invoices
 *
 * Features:
 * - Fetches invoices with AI-generated summaries and priority
 * - Tracks overdue invoices with days overdue calculation
 * - Provides payment registration and reminder mutation functions
 * - Caches data for 5 minutes
 *
 * @param options - Configuration options
 * @returns Object containing invoices data and mutation functions
 *
 * @example
 * ```tsx
 * const { invoices, registerPayment, sendReminder } = useOdooInvoices({ limit: 20 });
 * ```
 */
export function useOdooInvoices({ limit = 10, enabled = true }: UseOdooInvoicesOptions = {}) {
  const queryClient = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: ['odoo-invoices', limit],
    queryFn: () => fetchInvoices(limit),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2, // Retry on failure
  });

  const paymentMutation = useMutation({
    mutationFn: ({ invoiceId, amount, date }: { invoiceId: number; amount: number; date?: string }) =>
      registerPayment(invoiceId, amount, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odoo-invoices'] });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: ({
      invoiceId,
      reminderType,
    }: {
      invoiceId: number;
      reminderType: 'friendly' | 'formal' | 'final_notice';
    }) => sendReminder(invoiceId, reminderType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odoo-invoices'] });
    },
  });

  return {
    invoices: invoicesQuery.data || [],
    isLoading: invoicesQuery.isLoading,
    error: invoicesQuery.error?.message || null,
    refetch: invoicesQuery.refetch,
    registerPayment: (invoiceId: number, amount: number, date?: string) =>
      paymentMutation.mutateAsync({ invoiceId, amount, date }),
    sendReminder: (invoiceId: number, reminderType: 'friendly' | 'formal' | 'final_notice') =>
      reminderMutation.mutateAsync({ invoiceId, reminderType }),
    isRegisteringPayment: paymentMutation.isPending,
    isSendingReminder: reminderMutation.isPending,
  };
}

/**
 * Hook for fetching a single Odoo Invoice by ID
 *
 * @param id - The invoice ID to fetch, or null to disable the query
 * @returns Object containing the invoice details and loading state
 *
 * @example
 * ```tsx
 * const { invoice, isLoading } = useOdooInvoice(selectedInvoiceId);
 * ```
 */
export function useOdooInvoice(id: number | null) {
  const invoiceQuery = useQuery({
    queryKey: ['odoo-invoice', id],
    queryFn: () => fetchInvoice(id!),
    enabled: id !== null,
    staleTime: 1000 * 60 * 5,
  });

  return {
    invoice: invoiceQuery.data || null,
    isLoading: invoiceQuery.isLoading,
    error: invoiceQuery.error?.message || null,
    refetch: invoiceQuery.refetch,
  };
}
