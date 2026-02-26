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

// Dummy data for development/demo
const DUMMY_INVOICES: OdooInvoiceSummary[] = [
  {
    id: 3001,
    name: 'INV/2024/0001',
    partner: 'Aramco Services',
    partnerId: 201,
    amount: 250000,
    amountDue: 250000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'posted',
    stateLabel: 'Posted',
    paymentState: 'not_paid',
    paymentStateLabel: 'Not Paid',
    moveType: 'out_invoice',
    invoiceDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days overdue
    isOverdue: true,
    daysOverdue: 5,
    lineCount: 5,
    aiSummary: 'Enterprise software license - payment overdue',
    aiPriority: 'high',
    aiSuggestedAction: {
      type: 'remind',
      label: 'Send Reminder',
      description: 'Payment is 5 days overdue - send formal reminder',
      urgency: 'immediate',
    },
  },
  {
    id: 3002,
    name: 'INV/2024/0002',
    partner: 'SABIC Innovation',
    partnerId: 202,
    amount: 85000,
    amountDue: 42500,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'posted',
    stateLabel: 'Posted',
    paymentState: 'partial',
    paymentStateLabel: 'Partially Paid',
    moveType: 'out_invoice',
    invoiceDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20), // 20 days ago
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), // Due in 10 days
    isOverdue: false,
    daysOverdue: 0,
    lineCount: 3,
    aiSummary: 'Consulting services - 50% paid, remainder due soon',
    aiPriority: 'medium',
    aiSuggestedAction: {
      type: 'follow_up',
      label: 'Schedule Follow-up',
      description: 'Follow up on remaining balance before due date',
      urgency: 'soon',
    },
  },
  {
    id: 3003,
    name: 'INV/2024/0003',
    partner: 'Ministry of Health',
    partnerId: 203,
    amount: 175000,
    amountDue: 175000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'posted',
    stateLabel: 'Posted',
    paymentState: 'not_paid',
    paymentStateLabel: 'Not Paid',
    moveType: 'out_invoice',
    invoiceDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25), // Due in 25 days
    isOverdue: false,
    daysOverdue: 0,
    lineCount: 8,
    aiSummary: 'Healthcare system implementation - new invoice',
    aiPriority: 'low',
  },
  {
    id: 3004,
    name: 'INV/2024/0004',
    partner: 'Riyadh Bank',
    partnerId: 204,
    amount: 120000,
    amountDue: 120000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'posted',
    stateLabel: 'Posted',
    paymentState: 'not_paid',
    paymentStateLabel: 'Not Paid',
    moveType: 'out_invoice',
    invoiceDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35), // 35 days ago
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12), // 12 days overdue
    isOverdue: true,
    daysOverdue: 12,
    lineCount: 4,
    aiSummary: 'Security audit services - significantly overdue',
    aiPriority: 'high',
    aiSuggestedAction: {
      type: 'remind',
      label: 'Final Notice',
      description: 'Send final payment notice - 12 days overdue',
      urgency: 'immediate',
    },
  },
  {
    id: 3005,
    name: 'INV/2024/0005',
    partner: 'STC Telecom',
    partnerId: 205,
    amount: 45000,
    amountDue: 0,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'posted',
    stateLabel: 'Posted',
    paymentState: 'paid',
    paymentStateLabel: 'Paid',
    moveType: 'out_invoice',
    invoiceDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // Was due 10 days ago
    isOverdue: false,
    daysOverdue: 0,
    lineCount: 2,
    aiSummary: 'Training workshop - fully paid',
    aiPriority: 'low',
  },
  {
    id: 3006,
    name: 'INV/2024/0006',
    partner: 'Al Rajhi Capital',
    partnerId: 206,
    amount: 68000,
    amountDue: 68000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'draft',
    stateLabel: 'Draft',
    paymentState: 'not_paid',
    paymentStateLabel: 'Not Paid',
    moveType: 'out_invoice',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // Due in 30 days
    isOverdue: false,
    daysOverdue: 0,
    lineCount: 3,
    aiSummary: 'Draft invoice pending review',
    aiPriority: 'medium',
    aiSuggestedAction: {
      type: 'confirm',
      label: 'Post Invoice',
      description: 'Review and post invoice to send to customer',
      urgency: 'soon',
    },
  },
];

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
 * - Falls back to dummy data when API is unavailable
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
    retry: false, // Don't retry on failure - use dummy data instead
    placeholderData: DUMMY_INVOICES.slice(0, limit), // Show dummy data immediately
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

  // Use dummy data as fallback when no real data, error, or still loading
  const hasRealData = invoicesQuery.data && invoicesQuery.data.length > 0;
  const invoices = hasRealData ? invoicesQuery.data : DUMMY_INVOICES.slice(0, limit);

  return {
    invoices,
    isLoading: false, // Never show loading since we have dummy data
    error: null, // Don't show error when using dummy data
    refetch: invoicesQuery.refetch,
    registerPayment: (invoiceId: number, amount: number, date?: string) =>
      paymentMutation.mutateAsync({ invoiceId, amount, date }),
    sendReminder: (invoiceId: number, reminderType: 'friendly' | 'formal' | 'final_notice') =>
      reminderMutation.mutateAsync({ invoiceId, reminderType }),
    isRegisteringPayment: paymentMutation.isPending,
    isSendingReminder: reminderMutation.isPending,
    isDummyData: !invoicesQuery.data || invoicesQuery.data.length === 0,
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
