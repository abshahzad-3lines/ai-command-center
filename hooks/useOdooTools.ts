'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import type { ApiResponse } from '@/types';
import type { OdooToolResult } from '@/types/odoo';

interface ExecuteToolParams {
  tool: string;
  arguments: Record<string, unknown>;
  profileId?: string;
}

async function executeOdooTool(params: ExecuteToolParams): Promise<OdooToolResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (params.profileId) {
    headers['x-user-id'] = params.profileId;
  }

  const response = await fetch('/api/odoo/tools/execute', {
    method: 'POST',
    headers,
    body: JSON.stringify({ tool: params.tool, arguments: params.arguments }),
  });

  const data: ApiResponse<OdooToolResult> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to execute Odoo tool');
  }

  return data.data;
}

export function useOdooTools() {
  const queryClient = useQueryClient();
  const { profileId } = useAuth();

  const executeMutation = useMutation({
    mutationFn: executeOdooTool,
    onSuccess: (_, variables) => {
      // Invalidate relevant queries based on the tool executed
      const tool = variables.tool.toLowerCase();

      if (tool.includes('rfp') || tool.includes('purchase')) {
        queryClient.invalidateQueries({ queryKey: ['odoo-rfps'] });
      }
      if (tool.includes('sales') || tool.includes('order')) {
        queryClient.invalidateQueries({ queryKey: ['odoo-sales'] });
      }
      if (tool.includes('invoice') || tool.includes('payment')) {
        queryClient.invalidateQueries({ queryKey: ['odoo-invoices'] });
      }
    },
  });

  return {
    executeTool: executeMutation.mutateAsync,
    isExecuting: executeMutation.isPending,
    lastResult: executeMutation.data || null,
    error: executeMutation.error?.message || null,

    // Convenience methods for common tools
    // Tool names and argument keys must match tool-executor.ts exactly
    approvePurchaseOrder: (orderId: number) =>
      executeMutation.mutateAsync({
        tool: 'approve_purchase_order',
        arguments: { order_id: orderId },
        profileId: profileId || undefined,
      }),

    rejectPurchaseOrder: (orderId: number, reason?: string) =>
      executeMutation.mutateAsync({
        tool: 'reject_purchase_order',
        arguments: { order_id: orderId, reason },
        profileId: profileId || undefined,
      }),

    confirmSalesOrder: (orderId: number) =>
      executeMutation.mutateAsync({
        tool: 'confirm_sales_order',
        arguments: { order_id: orderId },
        profileId: profileId || undefined,
      }),

    cancelSalesOrder: (orderId: number) =>
      executeMutation.mutateAsync({
        tool: 'cancel_sales_order',
        arguments: { order_id: orderId },
        profileId: profileId || undefined,
      }),

    registerInvoicePayment: (invoiceId: number, amount: number, date?: string) =>
      executeMutation.mutateAsync({
        tool: 'register_invoice_payment',
        arguments: { invoice_id: invoiceId, amount, payment_date: date },
        profileId: profileId || undefined,
      }),

    sendPaymentReminder: (invoiceId: number, reminderType: 'friendly' | 'formal' | 'final_notice') =>
      executeMutation.mutateAsync({
        tool: 'send_payment_reminder',
        arguments: { invoice_id: invoiceId, reminder_type: reminderType },
        profileId: profileId || undefined,
      }),
  };
}
