/**
 * @fileoverview Tool executor for Claude AI
 * Executes Odoo tools called by Claude and returns results
 */

import { getOdooService } from '@/lib/odoo';
import type { ToolResultBlock } from '@/lib/adapters/ai/claude.adapter';
import type {
  OdooRfp,
  OdooSalesOrder,
  OdooInvoice,
} from '@/types/odoo';

/**
 * Result of tool execution
 */
interface ToolExecutionResult {
  success: boolean;
  result: string;
  data?: unknown;
}

/**
 * Execute an Odoo tool and return the result
 */
export async function executeOdooTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<ToolExecutionResult> {
  const odoo = getOdooService();

  try {
    switch (toolName) {
      // ============ Purchase Orders ============
      case 'search_purchase_orders': {
        const orders = await odoo.getPurchaseOrders({
          limit: (toolInput.limit as number) || 10,
          states: toolInput.states as string[] | undefined,
        });
        return {
          success: true,
          result: JSON.stringify(formatPurchaseOrders(orders), null, 2),
          data: orders,
        };
      }

      case 'get_purchase_order': {
        const order = await odoo.getPurchaseOrder(toolInput.order_id as number);
        if (!order) {
          return {
            success: false,
            result: `Purchase order with ID ${toolInput.order_id} not found`,
          };
        }
        return {
          success: true,
          result: JSON.stringify(formatPurchaseOrder(order), null, 2),
          data: order,
        };
      }

      case 'approve_purchase_order': {
        const result = await odoo.approvePurchaseOrder(toolInput.order_id as number);
        return {
          success: result.success,
          result: result.message,
          data: result.data,
        };
      }

      case 'reject_purchase_order': {
        const result = await odoo.rejectPurchaseOrder(
          toolInput.order_id as number,
          toolInput.reason as string | undefined
        );
        return {
          success: result.success,
          result: result.message,
          data: result.data,
        };
      }

      // ============ Sales Orders ============
      case 'search_sales_orders': {
        const orders = await odoo.getSalesOrders({
          limit: (toolInput.limit as number) || 10,
          states: toolInput.states as string[] | undefined,
        });
        return {
          success: true,
          result: JSON.stringify(formatSalesOrders(orders), null, 2),
          data: orders,
        };
      }

      case 'get_sales_order': {
        const order = await odoo.getSalesOrder(toolInput.order_id as number);
        if (!order) {
          return {
            success: false,
            result: `Sales order with ID ${toolInput.order_id} not found`,
          };
        }
        return {
          success: true,
          result: JSON.stringify(formatSalesOrder(order), null, 2),
          data: order,
        };
      }

      case 'confirm_sales_order': {
        const result = await odoo.confirmSalesOrder(toolInput.order_id as number);
        return {
          success: result.success,
          result: result.message,
          data: result.data,
        };
      }

      case 'cancel_sales_order': {
        const result = await odoo.cancelSalesOrder(toolInput.order_id as number);
        return {
          success: result.success,
          result: result.message,
          data: result.data,
        };
      }

      // ============ Invoices ============
      case 'search_invoices': {
        const invoices = await odoo.getInvoices({
          limit: (toolInput.limit as number) || 10,
          states: toolInput.states as string[] | undefined,
        });
        return {
          success: true,
          result: JSON.stringify(formatInvoices(invoices), null, 2),
          data: invoices,
        };
      }

      case 'get_invoice': {
        const invoice = await odoo.getInvoice(toolInput.invoice_id as number);
        if (!invoice) {
          return {
            success: false,
            result: `Invoice with ID ${toolInput.invoice_id} not found`,
          };
        }
        return {
          success: true,
          result: JSON.stringify(formatInvoice(invoice), null, 2),
          data: invoice,
        };
      }

      case 'register_invoice_payment': {
        const result = await odoo.registerPayment(
          toolInput.invoice_id as number,
          toolInput.amount as number,
          toolInput.payment_date as string | undefined
        );
        return {
          success: result.success,
          result: result.message,
          data: result.data,
        };
      }

      case 'send_payment_reminder': {
        const result = await odoo.sendReminder(
          toolInput.invoice_id as number,
          toolInput.reminder_type as 'friendly' | 'formal' | 'final_notice'
        );
        return {
          success: result.success,
          result: result.message,
          data: result.data,
        };
      }

      default:
        return {
          success: false,
          result: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      result: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Execute multiple tools and return results formatted for Claude
 */
export async function executeToolsForClaude(
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>
): Promise<ToolResultBlock[]> {
  const results: ToolResultBlock[] = [];

  for (const tool of toolCalls) {
    const result = await executeOdooTool(tool.name, tool.input);
    results.push({
      type: 'tool_result',
      tool_use_id: tool.id,
      content: result.result,
      is_error: !result.success,
    });
  }

  return results;
}

// ============ Formatting Helpers ============

interface FormattedPurchaseOrder {
  id: number;
  name: string;
  vendor: string;
  date: string;
  state: string;
  amount: string;
}

function formatPurchaseOrders(orders: OdooRfp[]): FormattedPurchaseOrder[] {
  return orders.map((o) => formatPurchaseOrder(o));
}

function formatPurchaseOrder(order: OdooRfp): FormattedPurchaseOrder {
  const partner = order.partner_id;
  const currency = order.currency_id;

  return {
    id: order.id,
    name: order.name,
    vendor: partner?.name || 'Unknown',
    date: order.date_order,
    state: formatState(order.state),
    amount: `${(order.amount_total || 0).toFixed(2)} ${currency?.symbol || currency?.name || 'USD'}`,
  };
}

interface FormattedSalesOrder {
  id: number;
  name: string;
  customer: string;
  date: string;
  state: string;
  amount: string;
  invoiceStatus: string;
}

function formatSalesOrders(orders: OdooSalesOrder[]): FormattedSalesOrder[] {
  return orders.map((o) => formatSalesOrder(o));
}

function formatSalesOrder(order: OdooSalesOrder): FormattedSalesOrder {
  const partner = order.partner_id;
  const currency = order.currency_id;

  return {
    id: order.id,
    name: order.name,
    customer: partner?.name || 'Unknown',
    date: order.date_order,
    state: formatState(order.state),
    amount: `${(order.amount_total || 0).toFixed(2)} ${currency?.symbol || currency?.name || 'USD'}`,
    invoiceStatus: order.invoice_status || 'N/A',
  };
}

interface FormattedInvoice {
  id: number;
  number: string;
  partner: string;
  invoiceDate: string;
  dueDate: string;
  state: string;
  paymentStatus: string;
  total: string;
  amountDue: string;
  type: string;
}

function formatInvoices(invoices: OdooInvoice[]): FormattedInvoice[] {
  return invoices.map((i) => formatInvoice(i));
}

function formatInvoice(invoice: OdooInvoice): FormattedInvoice {
  const partner = invoice.partner_id;
  const currency = invoice.currency_id;
  const moveType = invoice.move_type;

  return {
    id: invoice.id,
    number: invoice.name,
    partner: partner?.name || 'Unknown',
    invoiceDate: invoice.invoice_date || 'N/A',
    dueDate: invoice.invoice_date_due || 'N/A',
    state: formatState(invoice.state),
    paymentStatus: formatPaymentState(invoice.payment_state),
    total: `${(invoice.amount_total || 0).toFixed(2)} ${currency?.symbol || currency?.name || 'USD'}`,
    amountDue: `${(invoice.amount_residual || 0).toFixed(2)} ${currency?.symbol || currency?.name || 'USD'}`,
    type: moveType === 'out_invoice' ? 'Customer Invoice' : 'Vendor Bill',
  };
}

function formatState(state: string): string {
  const states: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    'to approve': 'Waiting Approval',
    purchase: 'Purchase Order',
    done: 'Done',
    cancel: 'Cancelled',
    sale: 'Sales Order',
    posted: 'Posted',
  };
  return states[state] || state;
}

function formatPaymentState(state: string): string {
  const states: Record<string, string> = {
    not_paid: 'Not Paid',
    in_payment: 'In Payment',
    paid: 'Paid',
    partial: 'Partially Paid',
    reversed: 'Reversed',
  };
  return states[state] || state;
}
