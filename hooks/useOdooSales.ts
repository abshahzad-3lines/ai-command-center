/**
 * @fileoverview React Query hooks for Odoo Sales Order management
 * Provides data fetching, caching, and mutation capabilities for Odoo sales orders
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@/types';
import type { OdooSalesOrderSummary, OdooSalesOrder, McpToolResult } from '@/types/odoo';

/**
 * Configuration options for the useOdooSales hook
 */
interface UseOdooSalesOptions {
  /** Maximum number of sales orders to fetch (default: 10) */
  limit?: number;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

// Dummy data for development/demo
const DUMMY_SALES: OdooSalesOrderSummary[] = [
  {
    id: 2001,
    name: 'SO/2024/0101',
    customer: 'Aramco Services',
    customerId: 201,
    amount: 250000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'draft',
    stateLabel: 'Quotation',
    date: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago
    invoiceStatus: 'no',
    invoiceStatusLabel: 'Nothing to Invoice',
    lineCount: 5,
    aiSummary: 'Enterprise software license and implementation services',
    aiPriority: 'high',
    aiSuggestedAction: {
      type: 'confirm',
      label: 'Confirm Order',
      description: 'High-value order from key client - recommend confirming',
      urgency: 'immediate',
    },
  },
  {
    id: 2002,
    name: 'SO/2024/0102',
    customer: 'SABIC Innovation',
    customerId: 202,
    amount: 85000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'sale',
    stateLabel: 'Sales Order',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    invoiceStatus: 'to invoice',
    invoiceStatusLabel: 'To Invoice',
    lineCount: 3,
    aiSummary: 'Consulting services package - ready for invoicing',
    aiPriority: 'medium',
    aiSuggestedAction: {
      type: 'follow_up',
      label: 'Create Invoice',
      description: 'Order delivered, proceed to invoice',
      urgency: 'soon',
    },
  },
  {
    id: 2003,
    name: 'SO/2024/0103',
    customer: 'Ministry of Health',
    customerId: 203,
    amount: 175000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'sent',
    stateLabel: 'Quotation Sent',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    invoiceStatus: 'no',
    invoiceStatusLabel: 'Nothing to Invoice',
    lineCount: 8,
    aiSummary: 'Healthcare monitoring system proposal - awaiting response',
    aiPriority: 'medium',
    aiSuggestedAction: {
      type: 'follow_up',
      label: 'Follow Up',
      description: 'No response in 48 hours - recommend follow up call',
      urgency: 'soon',
    },
  },
  {
    id: 2004,
    name: 'SO/2024/0104',
    customer: 'Riyadh Bank',
    customerId: 204,
    amount: 320000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'draft',
    stateLabel: 'Quotation',
    date: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    invoiceStatus: 'no',
    invoiceStatusLabel: 'Nothing to Invoice',
    lineCount: 12,
    aiSummary: 'Security audit and compliance services',
    aiPriority: 'high',
    aiSuggestedAction: {
      type: 'confirm',
      label: 'Review & Confirm',
      description: 'Large contract - verify terms before confirming',
      urgency: 'soon',
    },
  },
  {
    id: 2005,
    name: 'SO/2024/0105',
    customer: 'STC Telecom',
    customerId: 205,
    amount: 45000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'sale',
    stateLabel: 'Sales Order',
    date: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    invoiceStatus: 'invoiced',
    invoiceStatusLabel: 'Fully Invoiced',
    lineCount: 2,
    aiSummary: 'Training workshop delivery - complete',
    aiPriority: 'low',
  },
];

async function fetchSalesOrders(limit: number): Promise<OdooSalesOrderSummary[]> {
  const response = await fetch(`/api/odoo/sales?limit=${limit}`);
  const data: ApiResponse<OdooSalesOrderSummary[]> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch Sales Orders');
  }

  // Convert date strings back to Date objects
  return data.data.map((order) => ({
    ...order,
    date: new Date(order.date),
  }));
}

async function fetchSalesOrder(id: number): Promise<OdooSalesOrder> {
  const response = await fetch(`/api/odoo/sales/${id}`);
  const data: ApiResponse<OdooSalesOrder> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch Sales Order');
  }

  return data.data;
}

async function executeSalesAction(
  id: number,
  action: 'confirm' | 'cancel'
): Promise<McpToolResult> {
  const response = await fetch(`/api/odoo/sales/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });

  const data: ApiResponse<McpToolResult> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to execute action');
  }

  return data.data;
}

/**
 * Hook for fetching and managing Odoo Sales Orders
 *
 * Features:
 * - Fetches sales orders with AI-generated summaries and priority
 * - Falls back to dummy data when API is unavailable
 * - Provides confirm/cancel mutation functions
 * - Caches data for 5 minutes
 *
 * @param options - Configuration options
 * @returns Object containing sales orders data and mutation functions
 *
 * @example
 * ```tsx
 * const { orders, confirmOrder, cancelOrder } = useOdooSales({ limit: 20 });
 * ```
 */
export function useOdooSales({ limit = 10, enabled = true }: UseOdooSalesOptions = {}) {
  const queryClient = useQueryClient();

  const salesQuery = useQuery({
    queryKey: ['odoo-sales', limit],
    queryFn: () => fetchSalesOrders(limit),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on failure - use dummy data instead
    placeholderData: DUMMY_SALES.slice(0, limit), // Show dummy data immediately
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => executeSalesAction(id, 'confirm'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odoo-sales'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => executeSalesAction(id, 'cancel'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odoo-sales'] });
    },
  });

  // Use dummy data as fallback when no real data, error, or still loading
  const hasRealData = salesQuery.data && salesQuery.data.length > 0;
  const orders = hasRealData ? salesQuery.data : DUMMY_SALES.slice(0, limit);

  return {
    orders,
    isLoading: false, // Never show loading since we have dummy data
    error: null, // Don't show error when using dummy data
    refetch: salesQuery.refetch,
    confirmOrder: confirmMutation.mutateAsync,
    cancelOrder: cancelMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isDummyData: !salesQuery.data || salesQuery.data.length === 0,
  };
}

/**
 * Hook for fetching a single Odoo Sales Order by ID
 *
 * @param id - The sales order ID to fetch, or null to disable the query
 * @returns Object containing the order details and loading state
 *
 * @example
 * ```tsx
 * const { order, isLoading } = useOdooSalesOrder(selectedOrderId);
 * ```
 */
export function useOdooSalesOrder(id: number | null) {
  const orderQuery = useQuery({
    queryKey: ['odoo-sales-order', id],
    queryFn: () => fetchSalesOrder(id!),
    enabled: id !== null,
    staleTime: 1000 * 60 * 5,
  });

  return {
    order: orderQuery.data || null,
    isLoading: orderQuery.isLoading,
    error: orderQuery.error?.message || null,
    refetch: orderQuery.refetch,
  };
}
