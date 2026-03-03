/**
 * @fileoverview AI tool definitions for Odoo ERP operations
 * These tools allow AI models to interact with Odoo ERP via JSON-RPC.
 * Descriptions are written to be explicit enough for smaller models.
 */

import type { ClaudeTool } from '@/lib/adapters/ai/claude.adapter';

/**
 * All available Odoo tools for AI
 */
export const odooTools: ClaudeTool[] = [
  // ============ Purchase Orders / RFPs ============
  {
    name: 'search_purchase_orders',
    description:
      'Search for purchase orders (also called RFPs, Request for Proposals, or vendor orders) in Odoo ERP. ' +
      'Use this when the user asks about purchase orders, RFPs, procurement, or vendor orders. ' +
      'Do NOT use this for sales orders or invoices — use search_sales_orders or search_invoices instead. ' +
      'Returns a JSON array of purchase orders, each with: id, name, vendor, date, state, and total amount.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description:
            'Maximum number of purchase orders to return. Must be a positive integer. Default: 10. Example: 5',
        },
        states: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['draft', 'sent', 'to approve', 'purchase', 'done', 'cancel'],
          },
          description:
            'Filter by purchase order status. Only returns orders matching these states. ' +
            'Valid values: "draft" (new), "sent" (RFQ sent to vendor), "to approve" (waiting for approval), ' +
            '"purchase" (confirmed), "done" (completed), "cancel" (cancelled). ' +
            'Example: ["to approve", "draft"]. If omitted, returns orders in all states.',
        },
      },
    },
  },
  {
    name: 'get_purchase_order',
    description:
      'Get full details of a specific purchase order by its numeric ID. ' +
      'Use this when you already have the purchase order ID and need complete details including line items. ' +
      'Returns a JSON object with: id, name, vendor, date, state, amount, currency, order lines, and notes. ' +
      'If you have the order name instead of ID, use search_purchase_orders first to find the ID.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The numeric ID of the purchase order. Must be a positive integer. Example: 42',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'approve_purchase_order',
    description:
      'Approve a purchase order that is currently waiting for approval (state must be "to approve"). ' +
      'This is a WRITE action that changes the order state from "to approve" to "purchase" (confirmed). ' +
      'The order MUST be in "to approve" state — use get_purchase_order first to verify the current state. ' +
      'Returns a success/failure message with the updated order details.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The numeric ID of the purchase order to approve. Must be a positive integer. Example: 42',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'reject_purchase_order',
    description:
      'Reject and cancel a purchase order. This is a WRITE action that changes the order state to "cancel". ' +
      'Use this when the user wants to reject, decline, or cancel a purchase order. ' +
      'Returns a success/failure message.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The numeric ID of the purchase order to reject. Must be a positive integer. Example: 42',
        },
        reason: {
          type: 'string',
          description:
            'Optional reason for rejection. Will be added as a note on the purchase order. ' +
            'Example: "Price too high compared to alternative vendors"',
        },
      },
      required: ['order_id'],
    },
  },

  // ============ Sales Orders ============
  {
    name: 'search_sales_orders',
    description:
      'Search for sales orders (also called quotations or customer orders) in Odoo ERP. ' +
      'Use this when the user asks about sales orders, quotations, customer orders, or revenue. ' +
      'Do NOT use this for purchase orders or invoices — use search_purchase_orders or search_invoices instead. ' +
      'Returns a JSON array of sales orders, each with: id, name, customer, date, state, amount, and invoice status.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description:
            'Maximum number of sales orders to return. Must be a positive integer. Default: 10. Example: 5',
        },
        states: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['draft', 'sent', 'sale', 'done', 'cancel'],
          },
          description:
            'Filter by sales order status. Only returns orders matching these states. ' +
            'Valid values: "draft" (quotation), "sent" (quotation sent), "sale" (confirmed sales order), ' +
            '"done" (completed), "cancel" (cancelled). ' +
            'Example: ["draft", "sent"]. If omitted, returns orders in all states.',
        },
      },
    },
  },
  {
    name: 'get_sales_order',
    description:
      'Get full details of a specific sales order by its numeric ID. ' +
      'Use this when you already have the sales order ID and need complete details including line items. ' +
      'Returns a JSON object with: id, name, customer, date, state, amount, currency, order lines, and invoice status. ' +
      'If you have the order name (like "SO-3L-03058") instead of the numeric ID, use find_sales_order_by_name first.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'The numeric ID of the sales order. Must be a positive integer. Example: 15',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'find_sales_order_by_name',
    description:
      'Find a sales order by its display name or order number (e.g., "SO-3L-03058", "S00123"). ' +
      'Use this when the user refers to a sales order by its name/number string instead of a numeric ID. ' +
      'Returns a single JSON object with the full order details if found, or an error if not found. ' +
      'After finding the order, you can use its "id" field with other tools like confirm_sales_order or cancel_sales_order.',
    input_schema: {
      type: 'object',
      properties: {
        order_name: {
          type: 'string',
          description:
            'The exact name or order number to search for. This is the display name like "SO-3L-03058" or "S00123". ' +
            'Must match exactly (case-sensitive). Example: "SO-3L-03058"',
        },
      },
      required: ['order_name'],
    },
  },
  {
    name: 'confirm_sales_order',
    description:
      'Confirm a sales order, changing it from a draft quotation to a confirmed sale. ' +
      'This is a WRITE action. The order MUST be in "draft" or "sent" state. ' +
      'Use get_sales_order or find_sales_order_by_name first to verify the current state before confirming. ' +
      'Returns a success/failure message with the updated order details.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description:
            'The numeric ID of the sales order to confirm. Must be a positive integer. ' +
            'If you have the order name instead, use find_sales_order_by_name first to get the ID. Example: 15',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'cancel_sales_order',
    description:
      'Cancel a sales order. This is a WRITE action. Use this when the user says "cancel", "delete", or "remove" a sales order. ' +
      'You can provide EITHER the numeric order_id OR the order_name string — you do not need both. ' +
      'If you provide order_name, the system will automatically look up the ID. ' +
      'Returns a success/failure message.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description:
            'The numeric ID of the sales order to cancel. Provide this OR order_name, not both. Example: 15',
        },
        order_name: {
          type: 'string',
          description:
            'The display name of the sales order to cancel (e.g., "SO-3L-03058"). ' +
            'Provide this OR order_id, not both. The system will look up the ID automatically. Example: "SO-3L-03058"',
        },
      },
    },
  },

  // ============ Invoices ============
  {
    name: 'search_invoices',
    description:
      'Search for invoices (both customer invoices and vendor bills) in Odoo ERP. ' +
      'Use this when the user asks about invoices, bills, payments due, or overdue amounts. ' +
      'Do NOT use this for purchase orders or sales orders — use search_purchase_orders or search_sales_orders instead. ' +
      'Returns a JSON array of invoices, each with: id, number, partner, invoice date, due date, state, payment status, total, and amount due.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description:
            'Maximum number of invoices to return. Must be a positive integer. Default: 10. Example: 5',
        },
        states: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['draft', 'posted', 'cancel'],
          },
          description:
            'Filter by invoice status. Only returns invoices matching these states. ' +
            'Valid values: "draft" (not yet validated), "posted" (validated/confirmed), "cancel" (cancelled). ' +
            'Example: ["posted"]. If omitted, returns invoices in all states.',
        },
      },
    },
  },
  {
    name: 'get_invoice',
    description:
      'Get full details of a specific invoice by its numeric ID. ' +
      'Use this when you already have the invoice ID and need complete details including line items and payment info. ' +
      'Returns a JSON object with: id, number, partner, dates, state, payment state, amounts, currency, type, and line items.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'number',
          description: 'The numeric ID of the invoice. Must be a positive integer. Example: 7',
        },
      },
      required: ['invoice_id'],
    },
  },
  {
    name: 'register_invoice_payment',
    description:
      'Register a payment against an invoice. This is a WRITE action. ' +
      'The invoice MUST be in "posted" state to accept payments. Use get_invoice first to verify the state and check the amount due. ' +
      'Returns a success/failure message with payment details.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'number',
          description: 'The numeric ID of the invoice to pay. Must be a positive integer. Example: 7',
        },
        amount: {
          type: 'number',
          description:
            'The payment amount as a positive number. Can be partial or full payment. ' +
            'Use get_invoice first to check the amount_due field. Example: 1500.00',
        },
        payment_date: {
          type: 'string',
          description:
            'Payment date in YYYY-MM-DD format. If omitted, defaults to today. Example: "2026-03-01"',
        },
      },
      required: ['invoice_id', 'amount'],
    },
  },
  {
    name: 'send_payment_reminder',
    description:
      'Send a payment reminder for an overdue or unpaid invoice. This is a WRITE action. ' +
      'Use this when the user wants to follow up on an unpaid invoice or send a collection notice. ' +
      'Creates a log entry on the invoice with the reminder details. ' +
      'Returns a success/failure message.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id: {
          type: 'number',
          description: 'The numeric ID of the invoice to send a reminder for. Must be a positive integer. Example: 7',
        },
        reminder_type: {
          type: 'string',
          enum: ['friendly', 'formal', 'final_notice'],
          description:
            'The tone/severity of the reminder. Must be one of: ' +
            '"friendly" (polite first reminder), "formal" (official follow-up), or "final_notice" (last warning before escalation). ' +
            'Example: "friendly"',
        },
      },
      required: ['invoice_id', 'reminder_type'],
    },
  },

  // ============ Create Records ============
  {
    name: 'create_sales_order',
    description:
      'Create a new sales order (quotation) in Odoo. This is a WRITE action. ' +
      'IMPORTANT: Before calling this tool, you MUST have ALL required information: customer/partner ID, and at least one order line with product ID, quantity, and price. ' +
      'Use search_odoo_records with model "res.partner" to look up the customer by name first. ' +
      'Use search_odoo_records with model "product.product" to look up products by name first. ' +
      'Do NOT call this tool if you are missing any required fields — ask the user for the missing info instead. ' +
      'Returns the created sales order details.',
    input_schema: {
      type: 'object',
      properties: {
        partner_id: {
          type: 'number',
          description: 'The numeric ID of the customer (res.partner). Use search_odoo_records to find this. Example: 42',
        },
        order_lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: {
                type: 'number',
                description: 'The numeric ID of the product. Use search_odoo_records with model "product.product" to find this.',
              },
              quantity: {
                type: 'number',
                description: 'The quantity to order. Must be a positive number. Example: 10',
              },
              price_unit: {
                type: 'number',
                description: 'The unit price. If omitted, the product\'s default price will be used. Example: 99.99',
              },
            },
            required: ['product_id', 'quantity'],
          },
          description: 'Array of order line items. Each must have a product_id and quantity.',
        },
        note: {
          type: 'string',
          description: 'Optional internal note for the order.',
        },
      },
      required: ['partner_id', 'order_lines'],
    },
  },
  {
    name: 'create_purchase_order',
    description:
      'Create a new purchase order (RFQ) in Odoo. This is a WRITE action. ' +
      'IMPORTANT: Before calling this tool, you MUST have ALL required information: vendor/partner ID, and at least one order line with product ID, quantity, and price. ' +
      'Use search_odoo_records with model "res.partner" to look up the vendor by name first. ' +
      'Use search_odoo_records with model "product.product" to look up products by name first. ' +
      'Do NOT call this tool if you are missing any required fields — ask the user for the missing info instead. ' +
      'Returns the created purchase order details.',
    input_schema: {
      type: 'object',
      properties: {
        partner_id: {
          type: 'number',
          description: 'The numeric ID of the vendor (res.partner). Use search_odoo_records to find this. Example: 15',
        },
        order_lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: {
                type: 'number',
                description: 'The numeric ID of the product. Use search_odoo_records with model "product.product" to find this.',
              },
              quantity: {
                type: 'number',
                description: 'The quantity to order. Must be a positive number. Example: 50',
              },
              price_unit: {
                type: 'number',
                description: 'The unit price from the vendor. Example: 25.00',
              },
            },
            required: ['product_id', 'quantity', 'price_unit'],
          },
          description: 'Array of order line items. Each must have product_id, quantity, and price_unit.',
        },
        note: {
          type: 'string',
          description: 'Optional internal note for the purchase order.',
        },
      },
      required: ['partner_id', 'order_lines'],
    },
  },
  {
    name: 'create_invoice',
    description:
      'Create a new customer invoice (draft) in Odoo. This is a WRITE action. ' +
      'IMPORTANT: Before calling this tool, you MUST have ALL required information: customer/partner ID, and at least one invoice line with description, quantity, and unit price. ' +
      'Use search_odoo_records with model "res.partner" to look up the customer by name first. ' +
      'Do NOT call this tool if you are missing any required fields — ask the user for the missing info instead. ' +
      'The invoice is created in "draft" state — it must be posted separately. ' +
      'Returns the created invoice details.',
    input_schema: {
      type: 'object',
      properties: {
        partner_id: {
          type: 'number',
          description: 'The numeric ID of the customer (res.partner). Use search_odoo_records to find this. Example: 42',
        },
        invoice_lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Description of the invoice line. Example: "Consulting services - March 2026"',
              },
              product_id: {
                type: 'number',
                description: 'Optional product ID. If omitted, uses the description as a manual line.',
              },
              quantity: {
                type: 'number',
                description: 'The quantity. Default: 1. Example: 5',
              },
              price_unit: {
                type: 'number',
                description: 'The unit price. Example: 500.00',
              },
            },
            required: ['name', 'quantity', 'price_unit'],
          },
          description: 'Array of invoice line items. Each must have name, quantity, and price_unit.',
        },
        note: {
          type: 'string',
          description: 'Optional narration/notes for the invoice.',
        },
      },
      required: ['partner_id', 'invoice_lines'],
    },
  },

  // ============ Generic Odoo Search ============
  {
    name: 'search_odoo_records',
    description:
      'Search any Odoo model using domain filters. Use this for data NOT covered by the specific tools above — ' +
      'for example: contacts, products, employees, deliveries, CRM leads, projects, or tasks. ' +
      'Do NOT use this for purchase orders, sales orders, or invoices — use the specific tools instead ' +
      '(search_purchase_orders, search_sales_orders, search_invoices). ' +
      'Returns a JSON array of matching records with the requested fields.\n\n' +
      'Common models and their key fields:\n' +
      '- "res.partner": Contacts/customers/vendors — fields: name, email, phone, is_company, city, country_id\n' +
      '- "product.product": Products — fields: name, default_code, list_price, qty_available, categ_id\n' +
      '- "product.template": Product templates — fields: name, list_price, type, categ_id\n' +
      '- "stock.picking": Delivery/receipt orders — fields: name, partner_id, state, scheduled_date, origin\n' +
      '- "hr.employee": Employees — fields: name, job_title, department_id, work_email, work_phone\n' +
      '- "crm.lead": CRM leads/opportunities — fields: name, partner_id, expected_revenue, stage_id, probability\n' +
      '- "project.project": Projects — fields: name, user_id, partner_id, date_start, date\n' +
      '- "project.task": Tasks — fields: name, project_id, user_ids, stage_id, date_deadline\n' +
      '- "account.payment": Payments — fields: name, partner_id, amount, payment_type, state, date\n' +
      '- "res.users": System users — fields: name, login, email\n\n' +
      'Domain filter syntax: Array of conditions, each condition is [field, operator, value].\n' +
      'Operators: "=" (equals), "!=" (not equals), ">" , "<", ">=", "<=", "ilike" (case-insensitive contains), "in" (in list).\n' +
      'Examples: [["is_company", "=", true]], [["name", "ilike", "acme"]], [["state", "=", "done"], ["amount", ">", 1000]]',
    input_schema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description:
            'The Odoo model technical name. Must be a valid dotted model name. ' +
            'Common values: "res.partner", "product.product", "product.template", "stock.picking", ' +
            '"hr.employee", "crm.lead", "project.project", "project.task", "account.payment", "res.users". ' +
            'Example: "res.partner"',
        },
        domain: {
          type: 'array',
          description:
            'Odoo domain filter: array of condition tuples. Each condition is [field_name, operator, value]. ' +
            'Use [] (empty array) or omit to return all records. ' +
            'Example: [["is_company", "=", true]] to get only companies. ' +
            'Example: [["name", "ilike", "john"], ["email", "!=", false]] for contacts named john who have an email.',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description:
            'List of field names to include in the results. ' +
            'If omitted, returns: ["id", "name", "display_name"]. ' +
            'Example: ["name", "email", "phone", "city"] for contacts.',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of records to return. Must be between 1 and 50. Default: 10. Example: 20',
        },
        order: {
          type: 'string',
          description:
            'Sort order as "field_name direction". Direction is "asc" (ascending) or "desc" (descending). ' +
            'Example: "name asc", "create_date desc", "amount_total desc"',
        },
      },
      required: ['model'],
    },
  },
  {
    name: 'get_odoo_record',
    description:
      'Get a single record from any Odoo model by its numeric ID. ' +
      'Use this when you know the exact model and record ID and need its details. ' +
      'Do NOT use this for purchase orders, sales orders, or invoices — use get_purchase_order, get_sales_order, or get_invoice instead. ' +
      'Returns a JSON object with all requested fields, or an error if the record is not found.',
    input_schema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description:
            'The Odoo model technical name. Must be a valid dotted model name. ' +
            'Common values: "res.partner", "product.product", "hr.employee", "crm.lead", "project.task". ' +
            'Example: "res.partner"',
        },
        record_id: {
          type: 'number',
          description:
            'The numeric ID of the record to retrieve. Must be a positive integer. Example: 5',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description:
            'List of field names to include in the result. If omitted, returns common fields for the model. ' +
            'Example: ["name", "email", "phone"] for a contact.',
        },
      },
      required: ['model', 'record_id'],
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
