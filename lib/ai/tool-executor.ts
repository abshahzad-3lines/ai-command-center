/**
 * @fileoverview Tool executor for Claude AI
 * Executes Odoo tools called by Claude and returns results
 * Includes action logging for audit trail
 */

import { getOdooService } from '@/lib/odoo';
import { logOdooAction } from '@/lib/services/odoo-action-log.service';
import { config } from '@/config';
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
  recordId?: number;
  recordName?: string;
  modelName?: string;
}

// Tools that modify data and should always be logged
const WRITE_TOOLS = [
  'approve_purchase_order',
  'reject_purchase_order',
  'confirm_sales_order',
  'cancel_sales_order',
  'register_invoice_payment',
  'send_payment_reminder',
];

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
          recordId: toolInput.order_id as number,
          recordName: (result.data as { name?: string })?.name,
          modelName: 'purchase.order',
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
          recordId: toolInput.order_id as number,
          recordName: (result.data as { name?: string })?.name,
          modelName: 'purchase.order',
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

      case 'find_sales_order_by_name': {
        const order = await odoo.findSalesOrderByName(toolInput.order_name as string);
        if (!order) {
          return {
            success: false,
            result: `Sales order with name "${toolInput.order_name}" not found`,
          };
        }
        return {
          success: true,
          result: JSON.stringify(formatSalesOrder(order), null, 2),
          data: order,
          recordId: order.id,
          recordName: order.name,
          modelName: 'sale.order',
        };
      }

      case 'confirm_sales_order': {
        const result = await odoo.confirmSalesOrder(toolInput.order_id as number);
        return {
          success: result.success,
          result: result.message,
          data: result.data,
          recordId: toolInput.order_id as number,
          recordName: (result.data as { name?: string })?.name,
          modelName: 'sale.order',
        };
      }

      case 'cancel_sales_order': {
        // Support both order_id and order_name
        let orderId = toolInput.order_id as number | undefined;
        let orderName = toolInput.order_name as string | undefined;

        // If order_name is provided but not order_id, look up the order first
        if (!orderId && orderName) {
          const order = await odoo.findSalesOrderByName(orderName);
          if (!order) {
            return {
              success: false,
              result: `Sales order with name "${orderName}" not found`,
            };
          }
          orderId = order.id;
          orderName = order.name;
        }

        if (!orderId) {
          return {
            success: false,
            result: 'Either order_id or order_name must be provided',
          };
        }

        const result = await odoo.cancelSalesOrder(orderId);
        return {
          success: result.success,
          result: result.message,
          data: result.data,
          recordId: orderId,
          recordName: orderName || (result.data as { name?: string })?.name,
          modelName: 'sale.order',
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
          recordId: toolInput.invoice_id as number,
          modelName: 'account.move',
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
          recordId: toolInput.invoice_id as number,
          modelName: 'account.move',
        };
      }

      // ============ Generic Odoo Search ============
      case 'search_odoo_records': {
        const model = toolInput.model as string;
        const domain = (toolInput.domain as unknown[]) || [];
        const fields = (toolInput.fields as string[]) || ['id', 'name', 'display_name'];
        const limit = Math.min((toolInput.limit as number) || 10, 50);
        const order = toolInput.order as string | undefined;

        const records = await odoo.searchRecords(model, domain, fields, { limit, order });
        return {
          success: true,
          result: JSON.stringify(records, null, 2),
          data: records,
        };
      }

      case 'get_odoo_record': {
        const model = toolInput.model as string;
        const recordId = toolInput.record_id as number;
        const fields = toolInput.fields as string[] | undefined;

        const record = await odoo.getRecord(model, recordId, fields);
        if (!record) {
          return {
            success: false,
            result: `Record with ID ${recordId} not found in model ${model}`,
          };
        }
        return {
          success: true,
          result: JSON.stringify(record, null, 2),
          data: record,
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
 * Logs write actions for audit trail
 */
export async function executeToolsForClaude(
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>,
  userId?: string
): Promise<ToolResultBlock[]> {
  const results: ToolResultBlock[] = [];

  for (const tool of toolCalls) {
    const result = await executeOdooTool(tool.name, tool.input);

    // Log write actions for audit trail
    if (WRITE_TOOLS.includes(tool.name)) {
      // Get the Odoo username for logging
      const odooUsername = config.odoo.username;

      await logOdooAction(userId || null, {
        toolName: tool.name,
        modelName: result.modelName,
        recordId: result.recordId,
        recordName: result.recordName,
        inputArgs: tool.input,
        result: result.data as Record<string, unknown>,
        success: result.success,
        errorMessage: result.success ? undefined : result.result,
        actorEmail: odooUsername, // Log the Odoo user who performed the action
      });
    }

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
