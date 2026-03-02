// Odoo Adapter - Main adapter for Odoo ERP integration

import { OdooJsonRpcClient } from './jsonrpc-client';
import type { OdooAdapter, OdooAdapterConfig } from './types';
import type {
  OdooRfp,
  OdooSalesOrder,
  OdooInvoice,
  OdooToolResult,
} from '@/types/odoo';

// Field definitions for each model
const RFP_FIELDS = [
  'id',
  'name',
  'partner_id',
  'date_order',
  'state',
  'amount_total',
  'currency_id',
  'user_id',
  'company_id',
  'origin',
  'notes',
  'order_line',
];

const SALES_ORDER_FIELDS = [
  'id',
  'name',
  'partner_id',
  'date_order',
  'state',
  'amount_total',
  'currency_id',
  'user_id',
  'order_line',
  'invoice_status',
];

const INVOICE_FIELDS = [
  'id',
  'name',
  'partner_id',
  'invoice_date',
  'invoice_date_due',
  'state',
  'payment_state',
  'amount_total',
  'amount_residual',
  'currency_id',
  'move_type',
  'invoice_line_ids',
];

export class OdooAdapterImpl implements OdooAdapter {
  private client: OdooJsonRpcClient;

  constructor(config: OdooAdapterConfig) {
    this.client = new OdooJsonRpcClient(config);
  }

  // ============ Connection ============

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  async validateConnection(): Promise<boolean> {
    return this.client.validateConnection();
  }

  async getServerInfo(): Promise<{ version: string; database: string } | null> {
    return this.client.getServerInfo();
  }

  // ============ RFPs / Purchase Requests ============

  async fetchRfps(options?: {
    limit?: number;
    states?: string[];
    offset?: number;
  }): Promise<OdooRfp[]> {
    const domain: unknown[] = [];

    // Filter by states if provided
    if (options?.states && options.states.length > 0) {
      domain.push(['state', 'in', options.states]);
    }

    const records = await this.client.searchRead<OdooRfp>(
      'purchase.order',
      domain,
      RFP_FIELDS,
      {
        limit: options?.limit || 10,
        offset: options?.offset || 0,
        order: 'date_order desc',
      }
    );

    return records;
  }

  async getRfp(id: number): Promise<OdooRfp | null> {
    const records = await this.client.read<OdooRfp>('purchase.order', [id], RFP_FIELDS);
    return records[0] || null;
  }

  async approveRfp(id: number): Promise<OdooToolResult> {
    try {
      // First check the current state
      const rfp = await this.getRfp(id);
      if (!rfp) {
        return { success: false, message: 'RFP not found', error: 'Record not found' };
      }

      if (rfp.state !== 'to approve') {
        return {
          success: false,
          message: `Cannot approve RFP in state '${rfp.state}'`,
          error: 'Invalid state for approval',
        };
      }

      // Call button_approve method
      await this.client.callKw('purchase.order', 'button_approve', [[id]]);

      return {
        success: true,
        message: `RFP ${rfp.name} approved successfully`,
        data: { id, name: rfp.name, newState: 'purchase' },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to approve RFP',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async rejectRfp(id: number, reason?: string): Promise<OdooToolResult> {
    try {
      const rfp = await this.getRfp(id);
      if (!rfp) {
        return { success: false, message: 'RFP not found', error: 'Record not found' };
      }

      // Cancel the purchase order
      await this.client.callKw('purchase.order', 'button_cancel', [[id]]);

      // Add rejection reason as note if provided
      if (reason) {
        await this.client.callKw('mail.message', 'create', [
          {
            model: 'purchase.order',
            res_id: id,
            body: `<p><strong>Rejection Reason:</strong> ${reason}</p>`,
            message_type: 'comment',
          },
        ]);
      }

      return {
        success: true,
        message: `RFP ${rfp.name} rejected`,
        data: { id, name: rfp.name, reason, newState: 'cancel' },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reject RFP',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============ Sales Orders ============

  async fetchSalesOrders(options?: {
    limit?: number;
    states?: string[];
    offset?: number;
  }): Promise<OdooSalesOrder[]> {
    const domain: unknown[] = [];

    if (options?.states && options.states.length > 0) {
      domain.push(['state', 'in', options.states]);
    }

    const records = await this.client.searchRead<OdooSalesOrder>(
      'sale.order',
      domain,
      SALES_ORDER_FIELDS,
      {
        limit: options?.limit || 10,
        offset: options?.offset || 0,
        order: 'date_order desc',
      }
    );

    return records;
  }

  async getSalesOrder(id: number): Promise<OdooSalesOrder | null> {
    const records = await this.client.read<OdooSalesOrder>('sale.order', [id], SALES_ORDER_FIELDS);
    return records[0] || null;
  }

  /**
   * Find a sales order by name (e.g., "SO-3L-03058")
   */
  async findSalesOrderByName(name: string): Promise<OdooSalesOrder | null> {
    const records = await this.client.searchRead<OdooSalesOrder>(
      'sale.order',
      [['name', '=', name]],
      SALES_ORDER_FIELDS,
      { limit: 1 }
    );
    return records[0] || null;
  }

  async confirmSalesOrder(id: number): Promise<OdooToolResult> {
    try {
      const order = await this.getSalesOrder(id);
      if (!order) {
        return { success: false, message: 'Sales order not found', error: 'Record not found' };
      }

      if (order.state !== 'draft' && order.state !== 'sent') {
        return {
          success: false,
          message: `Cannot confirm order in state '${order.state}'`,
          error: 'Invalid state for confirmation',
        };
      }

      await this.client.callKw('sale.order', 'action_confirm', [[id]]);

      return {
        success: true,
        message: `Sales order ${order.name} confirmed`,
        data: { id, name: order.name, newState: 'sale' },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to confirm sales order',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async cancelSalesOrder(id: number): Promise<OdooToolResult> {
    try {
      const order = await this.getSalesOrder(id);
      if (!order) {
        return { success: false, message: 'Sales order not found', error: 'Record not found' };
      }

      await this.client.callKw('sale.order', 'action_cancel', [[id]]);

      return {
        success: true,
        message: `Sales order ${order.name} cancelled`,
        data: { id, name: order.name, newState: 'cancel' },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cancel sales order',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============ Invoices ============

  async fetchInvoices(options?: {
    limit?: number;
    states?: string[];
    offset?: number;
  }): Promise<OdooInvoice[]> {
    const domain: unknown[] = [
      // Only customer invoices and vendor bills
      ['move_type', 'in', ['out_invoice', 'in_invoice']],
    ];

    if (options?.states && options.states.length > 0) {
      domain.push(['state', 'in', options.states]);
    }

    const records = await this.client.searchRead<OdooInvoice>(
      'account.move',
      domain,
      INVOICE_FIELDS,
      {
        limit: options?.limit || 10,
        offset: options?.offset || 0,
        order: 'invoice_date desc',
      }
    );

    return records;
  }

  async getInvoice(id: number): Promise<OdooInvoice | null> {
    const records = await this.client.read<OdooInvoice>('account.move', [id], INVOICE_FIELDS);
    return records[0] || null;
  }

  async registerPayment(invoiceId: number, amount: number, date?: string): Promise<OdooToolResult> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found', error: 'Record not found' };
      }

      if (invoice.state !== 'posted') {
        return {
          success: false,
          message: 'Invoice must be posted to register payment',
          error: 'Invalid state',
        };
      }

      // Create payment wizard and register payment
      const paymentDate = date || new Date().toISOString().split('T')[0];

      const wizardId = await this.client.create('account.payment.register', {
        amount: amount,
        payment_date: paymentDate,
        journal_id: 1, // Default journal - may need configuration
      });

      if (wizardId) {
        await this.client.callKw(
          'account.payment.register',
          'action_create_payments',
          [[wizardId]],
          { active_ids: [invoiceId], active_model: 'account.move' }
        );
      }

      return {
        success: true,
        message: `Payment of ${amount} registered for invoice ${invoice.name}`,
        data: { invoiceId, amount, date: paymentDate },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to register payment',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendReminder(
    invoiceId: number,
    reminderType: 'friendly' | 'formal' | 'final_notice'
  ): Promise<OdooToolResult> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found', error: 'Record not found' };
      }

      // For now, log the reminder action - actual email sending depends on Odoo configuration
      await this.client.callKw('mail.message', 'create', [
        {
          model: 'account.move',
          res_id: invoiceId,
          body: `<p><strong>Payment Reminder Sent:</strong> ${reminderType}</p>`,
          message_type: 'comment',
        },
      ]);

      return {
        success: true,
        message: `${reminderType} reminder sent for invoice ${invoice.name}`,
        data: { invoiceId, reminderType },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send reminder',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============ Tool Execution ============

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<OdooToolResult> {
    switch (toolName) {
      case 'approve_purchase_request':
        return this.approveRfp(args.purchase_order_id as number);

      case 'reject_purchase_request':
        return this.rejectRfp(args.purchase_order_id as number, args.reason as string);

      case 'confirm_sales_order':
        return this.confirmSalesOrder(args.sale_order_id as number);

      case 'cancel_sales_order':
        return this.cancelSalesOrder(args.sale_order_id as number);

      case 'register_invoice_payment':
        return this.registerPayment(
          args.invoice_id as number,
          args.amount as number,
          args.payment_date as string
        );

      case 'send_payment_reminder':
        return this.sendReminder(
          args.invoice_id as number,
          args.reminder_type as 'friendly' | 'formal' | 'final_notice'
        );

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
          error: 'Tool not found',
        };
    }
  }

  // ============ Low-level API ============

  async searchRead<T = unknown>(
    model: string,
    domain: unknown[],
    fields: string[],
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<T[]> {
    return this.client.searchRead<T>(model, domain, fields, options);
  }

  async executeKw<T = unknown>(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<T> {
    return this.client.callKw<T>(model, method, args, kwargs);
  }
}
