/**
 * @fileoverview Odoo Service - High-level service for Odoo operations
 * Wraps the Odoo adapter for use by the AI tool executor
 */

import { getOdooAdapter } from '@/lib/adapters/odoo';
import type { OdooRfp, OdooSalesOrder, OdooInvoice, OdooToolResult } from '@/types/odoo';

/**
 * Odoo Service - Singleton service for Odoo operations
 */
export class OdooService {
  private static instance: OdooService | null = null;

  private constructor() {}

  static getInstance(): OdooService {
    if (!OdooService.instance) {
      OdooService.instance = new OdooService();
    }
    return OdooService.instance;
  }

  // ============ Connection ============

  /**
   * Check if Odoo is configured
   */
  isConfigured(): boolean {
    return getOdooAdapter().isConfigured();
  }

  /**
   * Validate connection to Odoo
   */
  async validateConnection(): Promise<boolean> {
    return getOdooAdapter().validateConnection();
  }

  /**
   * Get Odoo server info
   */
  async getServerInfo(): Promise<{ version: string; database: string } | null> {
    return getOdooAdapter().getServerInfo();
  }

  // ============ Purchase Orders / RFPs ============

  /**
   * Get purchase orders
   */
  async getPurchaseOrders(options?: {
    limit?: number;
    states?: string[];
  }): Promise<OdooRfp[]> {
    return getOdooAdapter().fetchRfps({
      limit: options?.limit || 10,
      states: options?.states,
    });
  }

  /**
   * Get a single purchase order
   */
  async getPurchaseOrder(id: number): Promise<OdooRfp | null> {
    return getOdooAdapter().getRfp(id);
  }

  /**
   * Approve a purchase order
   */
  async approvePurchaseOrder(id: number): Promise<OdooToolResult> {
    return getOdooAdapter().approveRfp(id);
  }

  /**
   * Reject a purchase order
   */
  async rejectPurchaseOrder(id: number, reason?: string): Promise<OdooToolResult> {
    return getOdooAdapter().rejectRfp(id, reason);
  }

  // ============ Sales Orders ============

  /**
   * Get sales orders
   */
  async getSalesOrders(options?: {
    limit?: number;
    states?: string[];
  }): Promise<OdooSalesOrder[]> {
    return getOdooAdapter().fetchSalesOrders({
      limit: options?.limit || 10,
      states: options?.states,
    });
  }

  /**
   * Get a single sales order
   */
  async getSalesOrder(id: number): Promise<OdooSalesOrder | null> {
    return getOdooAdapter().getSalesOrder(id);
  }

  /**
   * Find a sales order by name (e.g., "SO-3L-03058")
   */
  async findSalesOrderByName(name: string): Promise<OdooSalesOrder | null> {
    return getOdooAdapter().findSalesOrderByName(name);
  }

  /**
   * Confirm a sales order
   */
  async confirmSalesOrder(id: number): Promise<OdooToolResult> {
    return getOdooAdapter().confirmSalesOrder(id);
  }

  /**
   * Cancel a sales order
   */
  async cancelSalesOrder(id: number): Promise<OdooToolResult> {
    return getOdooAdapter().cancelSalesOrder(id);
  }

  // ============ Invoices ============

  /**
   * Get invoices
   */
  async getInvoices(options?: {
    limit?: number;
    states?: string[];
  }): Promise<OdooInvoice[]> {
    return getOdooAdapter().fetchInvoices({
      limit: options?.limit || 10,
      states: options?.states,
    });
  }

  /**
   * Get a single invoice
   */
  async getInvoice(id: number): Promise<OdooInvoice | null> {
    return getOdooAdapter().getInvoice(id);
  }

  /**
   * Register a payment for an invoice
   */
  async registerPayment(
    invoiceId: number,
    amount: number,
    date?: string
  ): Promise<OdooToolResult> {
    return getOdooAdapter().registerPayment(invoiceId, amount, date);
  }

  /**
   * Send a payment reminder
   */
  async sendReminder(
    invoiceId: number,
    type: 'friendly' | 'formal' | 'final_notice'
  ): Promise<OdooToolResult> {
    return getOdooAdapter().sendReminder(invoiceId, type);
  }

  // ============ Record Creation ============

  async createSalesOrder(
    partnerId: number,
    orderLines: Array<{ product_id: number; quantity: number; price_unit?: number }>,
    note?: string
  ): Promise<OdooToolResult> {
    return getOdooAdapter().createSalesOrder(partnerId, orderLines, note);
  }

  async createPurchaseOrder(
    partnerId: number,
    orderLines: Array<{ product_id: number; quantity: number; price_unit: number }>,
    note?: string
  ): Promise<OdooToolResult> {
    return getOdooAdapter().createPurchaseOrder(partnerId, orderLines, note);
  }

  async createInvoice(
    partnerId: number,
    invoiceLines: Array<{ name: string; product_id?: number; quantity: number; price_unit: number }>,
    note?: string
  ): Promise<OdooToolResult> {
    return getOdooAdapter().createInvoice(partnerId, invoiceLines, note);
  }

  // ============ Generic Search ============

  /**
   * Search any Odoo model with domain filters
   */
  async searchRecords<T = Record<string, unknown>>(
    model: string,
    domain: unknown[] = [],
    fields: string[] = ['id', 'name', 'display_name'],
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<T[]> {
    return getOdooAdapter().searchRead<T>(model, domain, fields, options);
  }

  /**
   * Get a single record from any Odoo model by ID
   */
  async getRecord<T = Record<string, unknown>>(
    model: string,
    id: number,
    fields?: string[]
  ): Promise<T | null> {
    const records = await getOdooAdapter().searchRead<T>(
      model,
      [['id', '=', id]],
      fields || [],
      { limit: 1 }
    );
    return records.length > 0 ? records[0] : null;
  }
}

/**
 * Get the singleton Odoo service instance
 */
export function getOdooService(): OdooService {
  return OdooService.getInstance();
}
