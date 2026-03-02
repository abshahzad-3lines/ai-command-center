'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@/types';
import type { OdooToolResult } from '@/types/odoo';

interface ExecuteToolParams {
  tool: string;
  arguments: Record<string, unknown>;
}

async function executeOdooTool(params: ExecuteToolParams): Promise<OdooToolResult> {
  const response = await fetch('/api/odoo/tools/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data: ApiResponse<OdooToolResult> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to execute Odoo tool');
  }

  return data.data;
}

export function useOdooTools() {
  const queryClient = useQueryClient();

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
    approvePurchaseRequest: (id: number) =>
      executeMutation.mutateAsync({
        tool: 'approve_purchase_request',
        arguments: { id },
      }),

    rejectPurchaseRequest: (id: number, reason?: string) =>
      executeMutation.mutateAsync({
        tool: 'reject_purchase_request',
        arguments: { id, reason },
      }),

    confirmSalesOrder: (id: number) =>
      executeMutation.mutateAsync({
        tool: 'confirm_sales_order',
        arguments: { id },
      }),

    registerInvoicePayment: (invoiceId: number, amount: number, date?: string) =>
      executeMutation.mutateAsync({
        tool: 'register_invoice_payment',
        arguments: { invoice_id: invoiceId, amount, date },
      }),

    sendPaymentReminder: (invoiceId: number, reminderType: 'friendly' | 'formal' | 'final_notice') =>
      executeMutation.mutateAsync({
        tool: 'send_payment_reminder',
        arguments: { invoice_id: invoiceId, reminder_type: reminderType },
      }),

    createFollowupTask: (
      recordType: 'rfp' | 'sales_order' | 'invoice',
      recordId: number,
      title: string,
      description?: string,
      dueDate?: string
    ) =>
      executeMutation.mutateAsync({
        tool: 'create_followup_task',
        arguments: {
          record_type: recordType,
          record_id: recordId,
          title,
          description,
          due_date: dueDate,
        },
      }),

    generateVendorResponse: (rfpId: number, responseType: 'accept' | 'negotiate' | 'decline') =>
      executeMutation.mutateAsync({
        tool: 'generate_vendor_response',
        arguments: {
          rfp_id: rfpId,
          response_type: responseType,
        },
      }),
  };
}
