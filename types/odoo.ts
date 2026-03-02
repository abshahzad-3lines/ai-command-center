// Odoo ERP types

// ============ Base Types ============
export interface OdooCredentials {
  baseUrl: string;
  database: string;
  apiKey: string;
}

export interface OdooRecord {
  id: number;
  create_date?: string;
  write_date?: string;
}

// ============ RFP / Purchase Request Types ============
export interface OdooRfp extends OdooRecord {
  name: string;
  partner_id: { id: number; name: string };
  date_order: string;
  state: OdooRfpState;
  amount_total: number;
  currency_id: { id: number; name: string; symbol: string };
  user_id: { id: number; name: string };
  company_id: { id: number; name: string };
  origin?: string;
  notes?: string;
  order_line: OdooOrderLine[];
}

export type OdooRfpState = 'draft' | 'sent' | 'to approve' | 'purchase' | 'done' | 'cancel';

export interface OdooOrderLine {
  id: number;
  product_id: { id: number; name: string };
  product_qty: number;
  price_unit: number;
  price_subtotal: number;
}

export interface OdooRfpSummary {
  id: number;
  name: string;
  vendor: string;
  vendorId: number;
  amount: number;
  currency: string;
  currencySymbol: string;
  state: OdooRfpState;
  stateLabel: string;
  date: Date;
  origin?: string;
  lineCount: number;
  aiSummary?: string;
  aiPriority?: 'high' | 'medium' | 'low';
  aiSuggestedAction?: OdooSuggestedAction;
}

// ============ Sales Order Types ============
export interface OdooSalesOrder extends OdooRecord {
  name: string;
  partner_id: { id: number; name: string };
  date_order: string;
  state: OdooSalesState;
  amount_total: number;
  currency_id: { id: number; name: string; symbol: string };
  user_id: { id: number; name: string };
  order_line: OdooSalesOrderLine[];
  invoice_status: 'no' | 'to invoice' | 'invoiced';
}

export type OdooSalesState = 'draft' | 'sent' | 'sale' | 'done' | 'cancel';

export interface OdooSalesOrderLine {
  id: number;
  product_id: { id: number; name: string };
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
}

export interface OdooSalesOrderSummary {
  id: number;
  name: string;
  customer: string;
  customerId: number;
  amount: number;
  currency: string;
  currencySymbol: string;
  state: OdooSalesState;
  stateLabel: string;
  date: Date;
  invoiceStatus: string;
  invoiceStatusLabel: string;
  lineCount: number;
  aiSummary?: string;
  aiPriority?: 'high' | 'medium' | 'low';
  aiSuggestedAction?: OdooSuggestedAction;
}

// ============ Invoice Types ============
export interface OdooInvoice extends OdooRecord {
  name: string;
  partner_id: { id: number; name: string };
  invoice_date: string;
  invoice_date_due: string;
  state: OdooInvoiceState;
  payment_state: OdooPaymentState;
  amount_total: number;
  amount_residual: number;
  currency_id: { id: number; name: string; symbol: string };
  move_type: 'out_invoice' | 'out_refund' | 'in_invoice' | 'in_refund';
  invoice_line_ids: OdooInvoiceLine[];
}

export type OdooInvoiceState = 'draft' | 'posted' | 'cancel';
export type OdooPaymentState = 'not_paid' | 'in_payment' | 'paid' | 'partial' | 'reversed';

export interface OdooInvoiceLine {
  id: number;
  product_id: { id: number; name: string };
  quantity: number;
  price_unit: number;
  price_subtotal: number;
}

export interface OdooInvoiceSummary {
  id: number;
  name: string;
  partner: string;
  partnerId: number;
  amount: number;
  amountDue: number;
  currency: string;
  currencySymbol: string;
  state: OdooInvoiceState;
  stateLabel: string;
  paymentState: OdooPaymentState;
  paymentStateLabel: string;
  moveType: string;
  invoiceDate: Date;
  dueDate: Date;
  isOverdue: boolean;
  daysOverdue: number;
  lineCount: number;
  aiSummary?: string;
  aiPriority?: 'high' | 'medium' | 'low';
  aiSuggestedAction?: OdooSuggestedAction;
}

// ============ AI Action Types ============
export type OdooActionType = 'approve' | 'reject' | 'follow_up' | 'respond' | 'escalate' | 'confirm' | 'pay' | 'remind' | 'none';

export interface OdooSuggestedAction {
  type: OdooActionType;
  label: string;
  description: string;
  draftContent?: string;
  urgency: 'immediate' | 'soon' | 'normal';
}

export interface OdooAIAnalysis {
  summary: string;
  priority: 'high' | 'medium' | 'low';
  suggestedAction: OdooSuggestedAction;
  riskFactors?: string[];
  insights?: string[];
}

// ============ Tool Types ============
export interface OdooToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface OdooToolResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface OdooToolExecuteRequest {
  tool: string;
  arguments: Record<string, unknown>;
}

// ============ State Label Mappings ============
export const RFP_STATE_LABELS: Record<OdooRfpState, string> = {
  'draft': 'Draft',
  'sent': 'RFQ Sent',
  'to approve': 'To Approve',
  'purchase': 'Purchase Order',
  'done': 'Done',
  'cancel': 'Cancelled',
};

export const SALES_STATE_LABELS: Record<OdooSalesState, string> = {
  'draft': 'Quotation',
  'sent': 'Quotation Sent',
  'sale': 'Sales Order',
  'done': 'Done',
  'cancel': 'Cancelled',
};

export const INVOICE_STATE_LABELS: Record<OdooInvoiceState, string> = {
  'draft': 'Draft',
  'posted': 'Posted',
  'cancel': 'Cancelled',
};

export const PAYMENT_STATE_LABELS: Record<OdooPaymentState, string> = {
  'not_paid': 'Not Paid',
  'in_payment': 'In Payment',
  'paid': 'Paid',
  'partial': 'Partially Paid',
  'reversed': 'Reversed',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  'no': 'Nothing to Invoice',
  'to invoice': 'To Invoice',
  'invoiced': 'Fully Invoiced',
};
