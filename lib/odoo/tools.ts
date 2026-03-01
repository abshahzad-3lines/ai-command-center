/**
 * @fileoverview Claude tool definitions for Odoo operations
 * These tools allow Claude to interact with Odoo ERP
 */

import type { ClaudeTool } from '@/lib/adapters/ai/claude.adapter';

/**
 * All available Odoo tools for Claude
 */
export const odooTools: ClaudeTool[] = [
  // ============ Purchase Orders / RFPs ============
  {
    name: 'search_purchase_orders',
    description: 'Search for purchase orders (RFPs) in Odoo. Returns a list of purchase orders with details like vendor, amount, state, and date.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
        states: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by states: draft, sent, to approve, purchase, done, cancel',
        },
      },
    },
  },
  {
    name: 'get_purchase_order',
    description: 'Get details of a specific purchase order by ID',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The ID of the purchase order',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'approve_purchase_order',
    description: 'Approve a purchase order that is waiting for approval (state: to approve)',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The ID of the purchase order to approve',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'reject_purchase_order',
    description: 'Reject/cancel a purchase order',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The ID of the purchase order to reject',
        },
        reason: {
          type: 'string',
          description: 'Reason for rejection (optional)',
        },
      },
      required: ['order_id'],
    },
  },

  // ============ Sales Orders ============
  {
    name: 'search_sales_orders',
    description: 'Search for sales orders in Odoo. Returns a list of sales orders with customer, amount, and status.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
        states: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by states: draft, sent, sale, done, cancel',
        },
      },
    },
  },
  {
    name: 'get_sales_order',
    description: 'Get details of a specific sales order by ID',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The ID of the sales order',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'confirm_sales_order',
    description: 'Confirm a draft or sent sales order to make it an official sale',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The ID of the sales order to confirm',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'cancel_sales_order',
    description: 'Cancel a sales order',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The ID of the sales order to cancel',
        },
      },
      required: ['order_id'],
    },
  },

  // ============ Invoices ============
  {
    name: 'search_invoices',
    description: 'Search for invoices in Odoo. Returns customer and vendor invoices with amount, due date, and payment status.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
        states: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by states: draft, posted, cancel',
        },
      },
    },
  },
  {
    name: 'get_invoice',
    description: 'Get details of a specific invoice by ID',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'number',
          description: 'The ID of the invoice',
        },
      },
      required: ['invoice_id'],
    },
  },
  {
    name: 'register_invoice_payment',
    description: 'Register a payment for an invoice',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'number',
          description: 'The ID of the invoice',
        },
        amount: {
          type: 'number',
          description: 'Payment amount',
        },
        payment_date: {
          type: 'string',
          description: 'Payment date in YYYY-MM-DD format (default: today)',
        },
      },
      required: ['invoice_id', 'amount'],
    },
  },
  {
    name: 'send_payment_reminder',
    description: 'Send a payment reminder for an overdue invoice',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'number',
          description: 'The ID of the invoice',
        },
        reminder_type: {
          type: 'string',
          enum: ['friendly', 'formal', 'final_notice'],
          description: 'Type of reminder to send',
        },
      },
      required: ['invoice_id', 'reminder_type'],
    },
  },
];

/**
 * Get a tool by name
 */
export function getOdooTool(name: string): ClaudeTool | undefined {
  return odooTools.find((t) => t.name === name);
}

/**
 * Get tool names only
 */
export function getOdooToolNames(): string[] {
  return odooTools.map((t) => t.name);
}
