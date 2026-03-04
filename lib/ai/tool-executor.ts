/**
 * @fileoverview Tool executor for Claude AI
 * Executes Odoo tools called by Claude and returns results
 * Includes action logging for audit trail
 */

import { getOdooService } from '@/lib/odoo';
import { logOdooAction } from '@/lib/services/odoo-action-log.service';
import { config } from '@/config';
import { OutlookAdapter } from '@/lib/adapters/email/outlook.adapter';
import { OutlookCalendarAdapter } from '@/lib/adapters/calendar/outlook.adapter';
import { TasksService } from '@/lib/services/tasks.service';
import { createClient } from '@/lib/supabase/server';
import type { ToolResultBlock } from '@/lib/adapters/ai/claude.adapter';
import { ReportService } from '@/lib/services/report.service';
import type { ReportType, ReportDateRange } from '@/lib/services/report.service';
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
  'create_sales_order',
  'create_purchase_order',
  'create_invoice',
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

      // ============ Create Records ============
      case 'create_sales_order': {
        const result = await odoo.createSalesOrder(
          toolInput.partner_id as number,
          toolInput.order_lines as Array<{ product_id: number; quantity: number; price_unit?: number }>,
          toolInput.note as string | undefined
        );
        return {
          success: result.success,
          result: result.message,
          data: result.data,
          recordId: (result.data as { id?: number })?.id,
          recordName: (result.data as { name?: string })?.name,
          modelName: 'sale.order',
        };
      }

      case 'create_purchase_order': {
        const result = await odoo.createPurchaseOrder(
          toolInput.partner_id as number,
          toolInput.order_lines as Array<{ product_id: number; quantity: number; price_unit: number }>,
          toolInput.note as string | undefined
        );
        return {
          success: result.success,
          result: result.message,
          data: result.data,
          recordId: (result.data as { id?: number })?.id,
          recordName: (result.data as { name?: string })?.name,
          modelName: 'purchase.order',
        };
      }

      case 'create_invoice': {
        const result = await odoo.createInvoice(
          toolInput.partner_id as number,
          toolInput.invoice_lines as Array<{ name: string; product_id?: number; quantity: number; price_unit: number }>,
          toolInput.note as string | undefined
        );
        return {
          success: result.success,
          result: result.message,
          data: result.data,
          recordId: (result.data as { id?: number })?.id,
          recordName: (result.data as { name?: string })?.name,
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
 * Execute an email tool and return the result
 */
async function executeEmailTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  accessToken?: string
): Promise<ToolExecutionResult> {
  if (!accessToken) {
    return { success: false, result: 'No access token provided. User must be authenticated with Outlook.' };
  }

  const adapter = new OutlookAdapter({ accessToken });

  try {
    switch (toolName) {
      case 'search_emails': {
        const limit = (toolInput.limit as number) || 10;
        const emails = await adapter.fetchEmails(limit);
        const formatted = emails.map((e) => ({
          id: e.id,
          subject: e.subject,
          from: `${e.from.name} <${e.from.email}>`,
          preview: e.preview.slice(0, 200),
          receivedAt: e.receivedAt,
          isRead: e.isRead,
        }));
        return { success: true, result: JSON.stringify(formatted, null, 2) };
      }

      case 'send_email': {
        const sent = await adapter.sendEmail(
          toolInput.to as string[],
          toolInput.subject as string,
          toolInput.body as string,
          toolInput.cc as string[] | undefined,
          toolInput.bcc as string[] | undefined
        );
        return {
          success: sent,
          result: sent
            ? `Email sent successfully to ${(toolInput.to as string[]).join(', ')}`
            : 'Failed to send email',
        };
      }

      case 'reply_to_email': {
        const replied = await adapter.sendReply(
          toolInput.email_id as string,
          toolInput.body as string
        );
        return {
          success: replied,
          result: replied ? 'Reply sent successfully' : 'Failed to send reply',
        };
      }

      default:
        return { success: false, result: `Unknown email tool: ${toolName}` };
    }
  } catch (error) {
    return {
      success: false,
      result: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Execute a calendar tool and return the result
 */
async function executeCalendarTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  accessToken?: string
): Promise<ToolExecutionResult> {
  if (!accessToken) {
    return { success: false, result: 'No access token provided. User must be authenticated with Outlook.' };
  }

  const adapter = new OutlookCalendarAdapter({ accessToken });

  try {
    switch (toolName) {
      case 'search_calendar_events': {
        const now = new Date();
        const startDate = toolInput.start_date
          ? new Date(toolInput.start_date as string)
          : now;
        const endDate = toolInput.end_date
          ? new Date(toolInput.end_date as string)
          : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        const events = await adapter.fetchEvents(startDate, endDate);
        const formatted = events.map((e) => ({
          id: e.id,
          subject: e.subject,
          start: e.start,
          end: e.end,
          location: e.location,
          isAllDay: e.isAllDay,
          isOnline: e.isOnline,
          attendees: e.attendees?.length || 0,
        }));
        return { success: true, result: JSON.stringify(formatted, null, 2) };
      }

      case 'create_calendar_event': {
        const event = await adapter.createEvent({
          subject: toolInput.subject as string,
          start: new Date(toolInput.start as string),
          end: new Date(toolInput.end as string),
          location: toolInput.location as string | undefined,
          isAllDay: (toolInput.is_all_day as boolean) || false,
          isOnline: false,
          importance: 'normal',
          showAs: 'busy',
        });
        return {
          success: true,
          result: `Event "${event.subject}" created for ${new Date(event.start).toLocaleString()}`,
        };
      }

      default:
        return { success: false, result: `Unknown calendar tool: ${toolName}` };
    }
  } catch (error) {
    return {
      success: false,
      result: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Execute a task tool and return the result
 */
async function executeTaskTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId?: string
): Promise<ToolExecutionResult> {
  if (!userId) {
    return { success: false, result: 'No user ID provided. User must be authenticated.' };
  }

  try {
    const supabase = await createClient();
    const tasksService = new TasksService(supabase, userId);

    switch (toolName) {
      case 'search_tasks': {
        const tasks = await tasksService.getTasks({
          status: toolInput.status as 'pending' | 'in_progress' | 'completed' | 'cancelled' | undefined,
          priority: toolInput.priority as 'low' | 'medium' | 'high' | undefined,
          limit: (toolInput.limit as number) || 20,
        });
        const formatted = tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          tags: t.tags,
        }));
        return { success: true, result: JSON.stringify(formatted, null, 2) };
      }

      case 'create_task': {
        const task = await tasksService.createTask({
          title: toolInput.title as string,
          description: toolInput.description as string | undefined,
          priority: (toolInput.priority as 'low' | 'medium' | 'high') || 'medium',
          dueDate: toolInput.due_date ? new Date(toolInput.due_date as string) : undefined,
          tags: toolInput.tags as string[] | undefined,
        });
        return {
          success: !!task,
          result: task
            ? `Task "${task.title}" created successfully (ID: ${task.id})`
            : 'Failed to create task',
        };
      }

      case 'complete_task': {
        const task = await tasksService.completeTask(toolInput.task_id as string);
        return {
          success: !!task,
          result: task
            ? `Task "${task.title}" marked as completed`
            : 'Failed to complete task. Task may not exist or you may not have permission.',
        };
      }

      default:
        return { success: false, result: `Unknown task tool: ${toolName}` };
    }
  } catch (error) {
    return {
      success: false,
      result: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Tool name prefixes for routing
const EMAIL_TOOLS = ['search_emails', 'send_email', 'reply_to_email'];
const CALENDAR_TOOLS = ['search_calendar_events', 'create_calendar_event'];
const TASK_TOOLS = ['search_tasks', 'create_task', 'complete_task'];
const REPORT_TOOLS = ['generate_report'];

/**
 * Execute multiple tools and return results formatted for Claude
 * Logs write actions for audit trail
 */
export async function executeToolsForClaude(
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>,
  userId?: string,
  accessToken?: string
): Promise<ToolResultBlock[]> {
  const results: ToolResultBlock[] = [];

  for (const tool of toolCalls) {
    let result: ToolExecutionResult;

    // Route tool calls by type
    if (EMAIL_TOOLS.includes(tool.name)) {
      result = await executeEmailTool(tool.name, tool.input, accessToken);
    } else if (CALENDAR_TOOLS.includes(tool.name)) {
      result = await executeCalendarTool(tool.name, tool.input, accessToken);
    } else if (TASK_TOOLS.includes(tool.name)) {
      result = await executeTaskTool(tool.name, tool.input, userId);
    } else if (REPORT_TOOLS.includes(tool.name)) {
      result = await executeReportTool(tool.name, tool.input);
    } else {
      result = await executeOdooTool(tool.name, tool.input);
    }

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

/**
 * Execute a report tool and return the result
 */
async function executeReportTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<ToolExecutionResult> {
  try {
    if (toolName === 'generate_report') {
      const reportType = toolInput.report_type as ReportType;
      const dateFrom = toolInput.date_from as string | undefined;
      const dateTo = toolInput.date_to as string | undefined;
      const dateRange: ReportDateRange | undefined =
        dateFrom && dateTo ? { dateFrom, dateTo } : undefined;
      const service = new ReportService();
      const report = await service.generateReport(reportType, dateRange);
      return {
        success: true,
        result: JSON.stringify(report, null, 2),
        data: report,
      };
    }

    return { success: false, result: `Unknown report tool: ${toolName}` };
  } catch (error) {
    return {
      success: false,
      result: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
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
