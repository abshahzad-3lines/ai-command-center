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
    retry: 2, // Retry on failure
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

  return {
    orders: salesQuery.data || [],
    isLoading: salesQuery.isLoading,
    error: salesQuery.error?.message || null,
    refetch: salesQuery.refetch,
    confirmOrder: confirmMutation.mutateAsync,
    cancelOrder: cancelMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
    isCancelling: cancelMutation.isPending,
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
