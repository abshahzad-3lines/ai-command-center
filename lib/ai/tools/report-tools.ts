/**
 * AI tool definitions for report generation
 */

import type { ClaudeTool } from '@/lib/adapters/ai/claude.adapter';

export const reportTools: ClaudeTool[] = [
  {
    name: 'generate_report',
    description:
      'Generate a business report from Odoo ERP data. Available report types:\n' +
      '- sales_summary: Total revenue, order count by status, top customers from sale.order\n' +
      '- invoice_aging: Overdue invoices in 0-30, 31-60, 61-90, 90+ day buckets from account.move\n' +
      '- purchase_overview: Spending by status, top vendors from purchase.order\n' +
      '- revenue_by_customer: Revenue per customer from confirmed sales orders, sorted descending\n' +
      '- product_performance: Top products by quantity sold and revenue from sale.order.line\n' +
      '- accounts_receivable: Outstanding balance per customer from unpaid invoices\n' +
      '- master_report: All-in-one report combining all 6 report types into a single comprehensive overview\n\n' +
      'Use this when the user asks for a report, analytics, summary, or overview of sales, purchases, invoices, revenue, products, or accounts receivable.\n' +
      'Supports optional date_from and date_to parameters (YYYY-MM-DD) to filter data by date range.',
    input_schema: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          enum: [
            'sales_summary',
            'invoice_aging',
            'purchase_overview',
            'revenue_by_customer',
            'product_performance',
            'accounts_receivable',
            'master_report',
          ],
          description:
            'The type of report to generate. Choose based on what the user is asking about.',
        },
        date_from: {
          type: 'string',
          description:
            'Optional start date for the report in YYYY-MM-DD format. Filters records created/dated on or after this date.',
        },
        date_to: {
          type: 'string',
          description:
            'Optional end date for the report in YYYY-MM-DD format. Filters records created/dated on or before this date.',
        },
      },
      required: ['report_type'],
    },
  },
];
