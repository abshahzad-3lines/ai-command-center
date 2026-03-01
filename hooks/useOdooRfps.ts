/**
 * @fileoverview React Query hooks for Odoo RFP (Request for Proposal) / Purchase Request management
 * Provides data fetching, caching, and mutation capabilities for Odoo purchase requests
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@/types';
import type { OdooRfpSummary, OdooRfp, McpToolResult } from '@/types/odoo';

/**
 * Configuration options for the useOdooRfps hook
 */
interface UseOdooRfpsOptions {
  /** Maximum number of RFPs to fetch (default: 10) */
  limit?: number;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

async function fetchRfps(limit: number): Promise<OdooRfpSummary[]> {
  const response = await fetch(`/api/odoo/rfps?limit=${limit}`);
  const data: ApiResponse<OdooRfpSummary[]> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch RFPs');
  }

  // Convert date strings back to Date objects
  return data.data.map((rfp) => ({
    ...rfp,
    date: new Date(rfp.date),
  }));
}

async function fetchRfp(id: number): Promise<OdooRfp> {
  const response = await fetch(`/api/odoo/rfps/${id}`);
  const data: ApiResponse<OdooRfp> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch RFP');
  }

  return data.data;
}

async function executeRfpAction(
  id: number,
  action: 'approve' | 'reject',
  reason?: string
): Promise<McpToolResult> {
  const response = await fetch(`/api/odoo/rfps/${id}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, reason }),
  });

  const data: ApiResponse<McpToolResult> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to execute action');
  }

  return data.data;
}

/**
 * Hook for fetching and managing Odoo RFPs (Purchase Requests)
 *
 * Features:
 * - Fetches RFP list with AI-generated summaries and priority
 * - Provides approve/reject mutation functions
 * - Caches data for 5 minutes
 *
 * @param options - Configuration options
 * @returns Object containing RFPs data and mutation functions
 *
 * @example
 * ```tsx
 * const { rfps, approveRfp, rejectRfp, isApproving } = useOdooRfps({ limit: 20 });
 * ```
 */
export function useOdooRfps({ limit = 10, enabled = true }: UseOdooRfpsOptions = {}) {
  const queryClient = useQueryClient();

  const rfpsQuery = useQuery({
    queryKey: ['odoo-rfps', limit],
    queryFn: () => fetchRfps(limit),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2, // Retry on failure
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => executeRfpAction(id, 'approve'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odoo-rfps'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      executeRfpAction(id, 'reject', reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odoo-rfps'] });
    },
  });

  return {
    rfps: rfpsQuery.data || [],
    isLoading: rfpsQuery.isLoading,
    error: rfpsQuery.error?.message || null,
    refetch: rfpsQuery.refetch,
    approveRfp: approveMutation.mutateAsync,
    rejectRfp: (id: number, reason?: string) =>
      rejectMutation.mutateAsync({ id, reason }),
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}

/**
 * Hook for fetching a single Odoo RFP by ID
 *
 * @param id - The RFP ID to fetch, or null to disable the query
 * @returns Object containing the RFP details and loading state
 *
 * @example
 * ```tsx
 * const { rfp, isLoading } = useOdooRfp(selectedRfpId);
 * ```
 */
export function useOdooRfp(id: number | null) {
  const rfpQuery = useQuery({
    queryKey: ['odoo-rfp', id],
    queryFn: () => fetchRfp(id!),
    enabled: id !== null,
    staleTime: 1000 * 60 * 5,
  });

  return {
    rfp: rfpQuery.data || null,
    isLoading: rfpQuery.isLoading,
    error: rfpQuery.error?.message || null,
    refetch: rfpQuery.refetch,
  };
}
