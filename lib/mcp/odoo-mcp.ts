/**
 * @fileoverview Odoo MCP Service
 * Provides high-level functions for interacting with Odoo via MCP
 */

import { getMcpClient, McpClient } from './client';

/**
 * Odoo MCP Service for interacting with Odoo ERP
 */
export class OdooMcpService {
  private client: McpClient;
  private connected = false;

  constructor() {
    this.client = getMcpClient();
  }

  /**
   * Ensure connection to Odoo MCP server
   */
  private async ensureConnection(): Promise<boolean> {
    if (!this.connected) {
      this.connected = await this.client.connect('odoo');
    }
    return this.connected;
  }

  /**
   * Get available Odoo tools
   */
  async getAvailableTools(): Promise<unknown[]> {
    if (!(await this.ensureConnection())) {
      return [];
    }
    return this.client.listTools('odoo');
  }

  /**
   * Search for purchase orders (RFPs)
   */
  async searchPurchaseOrders(params: {
    limit?: number;
    state?: string;
    fields?: string[];
  }): Promise<unknown> {
    if (!(await this.ensureConnection())) {
      return { success: false, error: 'Failed to connect to Odoo MCP' };
    }

    return this.client.callTool('odoo', 'search_read', {
      model: 'purchase.order',
      domain: params.state ? [['state', '=', params.state]] : [],
      fields: params.fields || ['name', 'partner_id', 'amount_total', 'state', 'date_order', 'origin'],
      limit: params.limit || 10,
    });
  }

  /**
   * Search for sales orders
   */
  async searchSalesOrders(params: {
    limit?: number;
    state?: string;
    fields?: string[];
  }): Promise<unknown> {
    if (!(await this.ensureConnection())) {
      return { success: false, error: 'Failed to connect to Odoo MCP' };
    }

    return this.client.callTool('odoo', 'search_read', {
      model: 'sale.order',
      domain: params.state ? [['state', '=', params.state]] : [],
      fields: params.fields || ['name', 'partner_id', 'amount_total', 'state', 'date_order', 'invoice_status'],
      limit: params.limit || 10,
    });
  }

  /**
   * Search for invoices
   */
  async searchInvoices(params: {
    limit?: number;
    state?: string;
    moveType?: string;
    fields?: string[];
  }): Promise<unknown> {
    if (!(await this.ensureConnection())) {
      return { success: false, error: 'Failed to connect to Odoo MCP' };
    }

    const domain: unknown[][] = [];
    if (params.state) domain.push(['state', '=', params.state]);
    if (params.moveType) domain.push(['move_type', '=', params.moveType]);

    return this.client.callTool('odoo', 'search_read', {
      model: 'account.move',
      domain,
      fields: params.fields || [
        'name',
        'partner_id',
        'amount_total',
        'amount_residual',
        'state',
        'invoice_date',
        'invoice_date_due',
        'payment_state',
        'move_type',
      ],
      limit: params.limit || 10,
    });
  }

  /**
   * Approve a purchase order
   */
  async approvePurchaseOrder(orderId: number): Promise<unknown> {
    if (!(await this.ensureConnection())) {
      return { success: false, error: 'Failed to connect to Odoo MCP' };
    }

    return this.client.callTool('odoo', 'execute_kw', {
      model: 'purchase.order',
      method: 'button_approve',
      args: [[orderId]],
    });
  }

  /**
   * Confirm a sales order
   */
  async confirmSalesOrder(orderId: number): Promise<unknown> {
    if (!(await this.ensureConnection())) {
      return { success: false, error: 'Failed to connect to Odoo MCP' };
    }

    return this.client.callTool('odoo', 'execute_kw', {
      model: 'sale.order',
      method: 'action_confirm',
      args: [[orderId]],
    });
  }

  /**
   * Register a payment on an invoice
   */
  async registerPayment(invoiceId: number, amount: number): Promise<unknown> {
    if (!(await this.ensureConnection())) {
      return { success: false, error: 'Failed to connect to Odoo MCP' };
    }

    return this.client.callTool('odoo', 'register_payment', {
      invoice_id: invoiceId,
      amount,
    });
  }

  /**
   * Execute a generic tool on Odoo MCP
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!(await this.ensureConnection())) {
      return { success: false, error: 'Failed to connect to Odoo MCP' };
    }

    return this.client.callTool('odoo', toolName, args);
  }
}

// Singleton instance
let odooMcpService: OdooMcpService | null = null;

/**
 * Get the singleton Odoo MCP service instance
 */
export function getOdooMcpService(): OdooMcpService {
  if (!odooMcpService) {
    odooMcpService = new OdooMcpService();
  }
  return odooMcpService;
}
