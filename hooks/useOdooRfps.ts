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

// Dummy data for development/demo
const DUMMY_RFPS: OdooRfpSummary[] = [
  {
    id: 1001,
    name: 'PO/2024/0001',
    vendor: 'Al-Faisaliah Group',
    vendorId: 101,
    amount: 45000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'to approve',
    stateLabel: 'To Approve',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    origin: 'SO/2024/0055',
    lineCount: 3,
    aiSummary: 'Office furniture order including desks, chairs, and storage units',
    aiPriority: 'high',
    aiSuggestedAction: {
      type: 'approve',
      label: 'Approve Now',
      description: 'This order is within budget and from a trusted vendor',
      urgency: 'immediate',
    },
  },
  {
    id: 1002,
    name: 'PO/2024/0002',
    vendor: 'Saudi Tech Solutions',
    vendorId: 102,
    amount: 125000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'to approve',
    stateLabel: 'To Approve',
    date: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    origin: 'IT Equipment Request',
    lineCount: 8,
    aiSummary: 'IT equipment including laptops, monitors, and networking gear',
    aiPriority: 'high',
    aiSuggestedAction: {
      type: 'approve',
      label: 'Review & Approve',
      description: 'Large order - verify specifications before approval',
      urgency: 'soon',
    },
  },
  {
    id: 1003,
    name: 'PO/2024/0003',
    vendor: 'Riyadh Supplies Co.',
    vendorId: 103,
    amount: 8500,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'draft',
    stateLabel: 'Draft',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    lineCount: 5,
    aiSummary: 'Office supplies and consumables for Q1',
    aiPriority: 'low',
    aiSuggestedAction: {
      type: 'follow_up',
      label: 'Send for Approval',
      description: 'Complete draft and submit for approval',
      urgency: 'normal',
    },
  },
  {
    id: 1004,
    name: 'PO/2024/0004',
    vendor: 'Gulf Medical Supplies',
    vendorId: 104,
    amount: 32000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'to approve',
    stateLabel: 'To Approve',
    date: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    origin: 'Medical Dept Request',
    lineCount: 12,
    aiSummary: 'Medical supplies and first aid equipment for office',
    aiPriority: 'medium',
    aiSuggestedAction: {
      type: 'approve',
      label: 'Approve',
      description: 'Standard medical supplies order',
      urgency: 'soon',
    },
  },
  {
    id: 1005,
    name: 'PO/2024/0005',
    vendor: 'Jeddah Electronics',
    vendorId: 105,
    amount: 78000,
    currency: 'SAR',
    currencySymbol: 'SR',
    state: 'purchase',
    stateLabel: 'Purchase Order',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    lineCount: 4,
    aiSummary: 'Server room equipment - already approved',
    aiPriority: 'low',
  },
];

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
 * - Falls back to dummy data when API is unavailable
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
    retry: false, // Don't retry on failure - use dummy data instead
    placeholderData: DUMMY_RFPS.slice(0, limit), // Show dummy data immediately
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

  // Use dummy data as fallback when no real data, error, or still loading
  const hasRealData = rfpsQuery.data && rfpsQuery.data.length > 0;
  const rfps = hasRealData ? rfpsQuery.data : DUMMY_RFPS.slice(0, limit);

  return {
    rfps,
    isLoading: false, // Never show loading since we have dummy data
    error: null, // Don't show error when using dummy data
    refetch: rfpsQuery.refetch,
    approveRfp: approveMutation.mutateAsync,
    rejectRfp: (id: number, reason?: string) =>
      rejectMutation.mutateAsync({ id, reason }),
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isDummyData: !rfpsQuery.data || rfpsQuery.data.length === 0,
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
