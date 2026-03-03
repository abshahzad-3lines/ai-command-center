// Odoo adapter interface - implement this for different connection methods

import type {
  OdooRfp,
  OdooRfpSummary,
  OdooSalesOrder,
  OdooSalesOrderSummary,
  OdooInvoice,
  OdooInvoiceSummary,
  OdooToolResult,
} from '@/types/odoo';

export interface OdooAdapterConfig {
  baseUrl: string;
  database: string;
  username: string;
  password: string;
  timeout?: number;
}

export interface OdooAdapter {
  // Connection
  isConfigured(): boolean;
  validateConnection(): Promise<boolean>;
  getServerInfo(): Promise<{ version: string; database: string } | null>;

  // RFPs / Purchase Requests
  fetchRfps(options?: { limit?: number; states?: string[]; offset?: number }): Promise<OdooRfp[]>;
  getRfp(id: number): Promise<OdooRfp | null>;
  approveRfp(id: number): Promise<OdooToolResult>;
  rejectRfp(id: number, reason?: string): Promise<OdooToolResult>;

  // Sales Orders
  fetchSalesOrders(options?: { limit?: number; states?: string[]; offset?: number }): Promise<OdooSalesOrder[]>;
  getSalesOrder(id: number): Promise<OdooSalesOrder | null>;
  findSalesOrderByName(name: string): Promise<OdooSalesOrder | null>;
  confirmSalesOrder(id: number): Promise<OdooToolResult>;
  cancelSalesOrder(id: number): Promise<OdooToolResult>;

  // Invoices
  fetchInvoices(options?: { limit?: number; states?: string[]; offset?: number }): Promise<OdooInvoice[]>;
  getInvoice(id: number): Promise<OdooInvoice | null>;
  registerPayment(invoiceId: number, amount: number, date?: string): Promise<OdooToolResult>;
  sendReminder(invoiceId: number, reminderType: 'friendly' | 'formal' | 'final_notice'): Promise<OdooToolResult>;

  // Record Creation
  createSalesOrder(
    partnerId: number,
    orderLines: Array<{ product_id: number; quantity: number; price_unit?: number }>,
    note?: string
  ): Promise<OdooToolResult>;
  createPurchaseOrder(
    partnerId: number,
    orderLines: Array<{ product_id: number; quantity: number; price_unit: number }>,
    note?: string
  ): Promise<OdooToolResult>;
  createInvoice(
    partnerId: number,
    invoiceLines: Array<{ name: string; product_id?: number; quantity: number; price_unit: number }>,
    note?: string
  ): Promise<OdooToolResult>;

  // Tool Execution
  executeTool(toolName: string, args: Record<string, unknown>): Promise<OdooToolResult>;

  // Low-level API
  searchRead<T = unknown>(
    model: string,
    domain: unknown[],
    fields: string[],
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<T[]>;

  executeKw<T = unknown>(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<T>;
}

// Transform functions
export function toRfpSummary(rfp: OdooRfp): OdooRfpSummary {
  return {
    id: rfp.id,
    name: rfp.name,
    vendor: rfp.partner_id.name,
    vendorId: rfp.partner_id.id,
    amount: rfp.amount_total,
    currency: rfp.currency_id.name,
    currencySymbol: rfp.currency_id.symbol,
    state: rfp.state,
    stateLabel: getStateLabel('rfp', rfp.state),
    date: new Date(rfp.date_order),
    origin: rfp.origin,
    lineCount: rfp.order_line?.length || 0,
  };
}

export function toSalesOrderSummary(order: OdooSalesOrder): OdooSalesOrderSummary {
  return {
    id: order.id,
    name: order.name,
    customer: order.partner_id.name,
    customerId: order.partner_id.id,
    amount: order.amount_total,
    currency: order.currency_id.name,
    currencySymbol: order.currency_id.symbol,
    state: order.state,
    stateLabel: getStateLabel('sales', order.state),
    date: new Date(order.date_order),
    invoiceStatus: order.invoice_status,
    invoiceStatusLabel: getInvoiceStatusLabel(order.invoice_status),
    lineCount: order.order_line?.length || 0,
  };
}

export function toInvoiceSummary(invoice: OdooInvoice): OdooInvoiceSummary {
  const dueDate = new Date(invoice.invoice_date_due);
  const now = new Date();
  const isOverdue = invoice.payment_state !== 'paid' && dueDate < now;
  const daysOverdue = isOverdue
    ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    id: invoice.id,
    name: invoice.name,
    partner: invoice.partner_id.name,
    partnerId: invoice.partner_id.id,
    amount: invoice.amount_total,
    amountDue: invoice.amount_residual,
    currency: invoice.currency_id.name,
    currencySymbol: invoice.currency_id.symbol,
    state: invoice.state,
    stateLabel: getStateLabel('invoice', invoice.state),
    paymentState: invoice.payment_state,
    paymentStateLabel: getPaymentStateLabel(invoice.payment_state),
    moveType: invoice.move_type,
    invoiceDate: new Date(invoice.invoice_date),
    dueDate,
    isOverdue,
    daysOverdue,
    lineCount: invoice.invoice_line_ids?.length || 0,
  };
}

function getStateLabel(type: 'rfp' | 'sales' | 'invoice', state: string): string {
  const labels: Record<string, Record<string, string>> = {
    rfp: {
      draft: 'Draft',
      sent: 'RFQ Sent',
      'to approve': 'To Approve',
      purchase: 'Purchase Order',
      done: 'Done',
      cancel: 'Cancelled',
    },
    sales: {
      draft: 'Quotation',
      sent: 'Quotation Sent',
      sale: 'Sales Order',
      done: 'Done',
      cancel: 'Cancelled',
    },
    invoice: {
      draft: 'Draft',
      posted: 'Posted',
      cancel: 'Cancelled',
    },
  };
  return labels[type]?.[state] || state;
}

function getPaymentStateLabel(state: string): string {
  const labels: Record<string, string> = {
    not_paid: 'Not Paid',
    in_payment: 'In Payment',
    paid: 'Paid',
    partial: 'Partially Paid',
    reversed: 'Reversed',
  };
  return labels[state] || state;
}

function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    no: 'Nothing to Invoice',
    to_invoice: 'To Invoice',
    invoiced: 'Fully Invoiced',
  };
  return labels[status] || status;
}
