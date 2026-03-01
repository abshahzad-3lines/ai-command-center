/**
 * @fileoverview Odoo Service - Business logic layer for Odoo ERP integration
 * Uses Claude AI for intelligent analysis of Odoo records
 */

import { createOdooAdapter, toRfpSummary, toSalesOrderSummary, toInvoiceSummary } from '@/lib/adapters/odoo';
import { createAIAdapter } from '@/lib/adapters/ai';
import { config } from '@/config';
import type { OdooAdapter } from '@/lib/adapters/odoo/types';
import type { AIAdapter } from '@/lib/adapters/ai/types';
import type {
  OdooRfp,
  OdooRfpSummary,
  OdooSalesOrder,
  OdooSalesOrderSummary,
  OdooInvoice,
  OdooInvoiceSummary,
  OdooAIAnalysis,
  McpToolResult,
  OdooSuggestedAction,
} from '@/types/odoo';

/**
 * Odoo Service - Provides business logic for Odoo ERP operations
 * Includes AI-powered analysis using Claude
 */
export class OdooService {
  private adapter: OdooAdapter;
  private aiAdapter: AIAdapter;

  constructor() {
    this.adapter = createOdooAdapter();
    // Create AI adapter based on configured provider
    this.aiAdapter = this.createConfiguredAIAdapter();
  }

  /**
   * Create the appropriate AI adapter based on configuration
   */
  private createConfiguredAIAdapter(): AIAdapter {
    const provider = config.ai.provider;

    switch (provider) {
      case 'anthropic':
        return createAIAdapter('anthropic', {
          apiKey: config.ai.anthropic?.apiKey,
          model: config.ai.anthropic?.model,
        });
      case 'openai':
        return createAIAdapter('openai', {
          apiKey: config.ai.openai.apiKey,
          model: config.ai.openai.model,
        });
      case 'local':
        return createAIAdapter('local', {
          baseUrl: config.ai.local.baseUrl,
          model: config.ai.local.model,
        });
      default:
        // Default to Claude
        return createAIAdapter('anthropic', {
          apiKey: config.ai.anthropic?.apiKey,
          model: config.ai.anthropic?.model,
        });
    }
  }

  // ============ Connection ============

  isConfigured(): boolean {
    return this.adapter.isConfigured();
  }

  async validateConnection(): Promise<boolean> {
    return this.adapter.validateConnection();
  }

  async getServerInfo(): Promise<{ version: string; database: string } | null> {
    return this.adapter.getServerInfo();
  }

  // ============ RFPs with AI Analysis ============

  async getRfpsWithAnalysis(limit: number = 10): Promise<OdooRfpSummary[]> {
    const rfps = await this.adapter.fetchRfps({ limit });
    const summaries = rfps.map(toRfpSummary);

    // Add AI analysis to each RFP
    const analyzed = await Promise.all(
      summaries.map(async (summary) => {
        try {
          const analysis = await this.analyzeRfp(summary);
          return {
            ...summary,
            aiSummary: analysis.summary,
            aiPriority: analysis.priority,
            aiSuggestedAction: analysis.suggestedAction,
          };
        } catch {
          // Return without AI analysis if it fails
          return {
            ...summary,
            aiPriority: this.getDefaultPriority(summary) as 'high' | 'medium' | 'low',
            aiSuggestedAction: this.getDefaultRfpAction(summary),
          };
        }
      })
    );

    return analyzed;
  }

  async getRfp(id: number): Promise<OdooRfp | null> {
    return this.adapter.getRfp(id);
  }

  async approveRfp(id: number): Promise<McpToolResult> {
    return this.adapter.approveRfp(id);
  }

  async rejectRfp(id: number, reason?: string): Promise<McpToolResult> {
    return this.adapter.rejectRfp(id, reason);
  }

  // ============ Sales Orders with AI Analysis ============

  async getSalesOrdersWithAnalysis(limit: number = 10): Promise<OdooSalesOrderSummary[]> {
    const orders = await this.adapter.fetchSalesOrders({ limit });
    const summaries = orders.map(toSalesOrderSummary);

    const analyzed = await Promise.all(
      summaries.map(async (summary) => {
        try {
          const analysis = await this.analyzeSalesOrder(summary);
          return {
            ...summary,
            aiSummary: analysis.summary,
            aiPriority: analysis.priority,
            aiSuggestedAction: analysis.suggestedAction,
          };
        } catch {
          return {
            ...summary,
            aiPriority: this.getDefaultPriority(summary) as 'high' | 'medium' | 'low',
            aiSuggestedAction: this.getDefaultSalesAction(summary),
          };
        }
      })
    );

    return analyzed;
  }

  async getSalesOrder(id: number): Promise<OdooSalesOrder | null> {
    return this.adapter.getSalesOrder(id);
  }

  async confirmSalesOrder(id: number): Promise<McpToolResult> {
    return this.adapter.confirmSalesOrder(id);
  }

  async cancelSalesOrder(id: number): Promise<McpToolResult> {
    return this.adapter.cancelSalesOrder(id);
  }

  // ============ Invoices with AI Analysis ============

  async getInvoicesWithAnalysis(limit: number = 10): Promise<OdooInvoiceSummary[]> {
    const invoices = await this.adapter.fetchInvoices({ limit });
    const summaries = invoices.map(toInvoiceSummary);

    const analyzed = await Promise.all(
      summaries.map(async (summary) => {
        try {
          const analysis = await this.analyzeInvoice(summary);
          return {
            ...summary,
            aiSummary: analysis.summary,
            aiPriority: analysis.priority,
            aiSuggestedAction: analysis.suggestedAction,
          };
        } catch {
          return {
            ...summary,
            aiPriority: this.getInvoicePriority(summary),
            aiSuggestedAction: this.getDefaultInvoiceAction(summary),
          };
        }
      })
    );

    return analyzed;
  }

  async getInvoice(id: number): Promise<OdooInvoice | null> {
    return this.adapter.getInvoice(id);
  }

  async registerPayment(invoiceId: number, amount: number, date?: string): Promise<McpToolResult> {
    return this.adapter.registerPayment(invoiceId, amount, date);
  }

  async sendReminder(invoiceId: number, reminderType: 'friendly' | 'formal' | 'final_notice'): Promise<McpToolResult> {
    return this.adapter.sendReminder(invoiceId, reminderType);
  }

  // ============ MCP Tool Execution ============

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
    return this.adapter.executeTool(toolName, args);
  }

  // ============ AI Analysis Methods ============

  private async analyzeRfp(rfp: OdooRfpSummary): Promise<OdooAIAnalysis> {
    const prompt = `Analyze this purchase request/RFP:
Name: ${rfp.name}
Vendor: ${rfp.vendor}
Amount: ${rfp.currencySymbol}${rfp.amount.toFixed(2)}
Status: ${rfp.stateLabel}
Date: ${rfp.date.toLocaleDateString()}
${rfp.origin ? `Origin: ${rfp.origin}` : ''}

Provide:
1. A brief summary (1-2 sentences)
2. Priority (high/medium/low) based on amount and status
3. Suggested action: approve, reject, follow_up, respond, or none
4. Brief reason for the suggestion`;

    return this.parseAIAnalysis(await this.callAI(prompt), rfp);
  }

  private async analyzeSalesOrder(order: OdooSalesOrderSummary): Promise<OdooAIAnalysis> {
    const prompt = `Analyze this sales order:
Name: ${order.name}
Customer: ${order.customer}
Amount: ${order.currencySymbol}${order.amount.toFixed(2)}
Status: ${order.stateLabel}
Invoice Status: ${order.invoiceStatusLabel}
Date: ${order.date.toLocaleDateString()}

Provide:
1. A brief summary (1-2 sentences)
2. Priority (high/medium/low) based on amount and status
3. Suggested action: confirm, follow_up, respond, or none
4. Brief reason for the suggestion`;

    return this.parseAIAnalysis(await this.callAI(prompt), order);
  }

  private async analyzeInvoice(invoice: OdooInvoiceSummary): Promise<OdooAIAnalysis> {
    const overdueText = invoice.isOverdue
      ? `OVERDUE by ${invoice.daysOverdue} days!`
      : `Due: ${invoice.dueDate.toLocaleDateString()}`;

    const prompt = `Analyze this invoice:
Name: ${invoice.name}
Partner: ${invoice.partner}
Total: ${invoice.currencySymbol}${invoice.amount.toFixed(2)}
Amount Due: ${invoice.currencySymbol}${invoice.amountDue.toFixed(2)}
Payment Status: ${invoice.paymentStateLabel}
${overdueText}

Provide:
1. A brief summary (1-2 sentences)
2. Priority (high/medium/low) - high if overdue or large amount
3. Suggested action: pay, remind, follow_up, or none
4. Brief reason for the suggestion`;

    return this.parseAIAnalysis(await this.callAI(prompt), invoice);
  }

  private async callAI(prompt: string): Promise<string> {
    return this.aiAdapter.chat([{ role: 'user', content: prompt }]);
  }

  private parseAIAnalysis(response: string, record: OdooRfpSummary | OdooSalesOrderSummary | OdooInvoiceSummary): OdooAIAnalysis {
    // Simple parsing - extract key information from response
    const lines = response.toLowerCase();

    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (lines.includes('high priority') || lines.includes('priority: high')) {
      priority = 'high';
    } else if (lines.includes('low priority') || lines.includes('priority: low')) {
      priority = 'low';
    }

    let actionType: OdooSuggestedAction['type'] = 'none';
    let actionLabel = 'Review';
    let actionDescription = '';

    if (lines.includes('approve')) {
      actionType = 'approve';
      actionLabel = 'Approve';
      actionDescription = 'Recommend approval based on analysis';
    } else if (lines.includes('reject')) {
      actionType = 'reject';
      actionLabel = 'Reject';
      actionDescription = 'Consider rejection based on analysis';
    } else if (lines.includes('confirm')) {
      actionType = 'confirm';
      actionLabel = 'Confirm';
      actionDescription = 'Ready for confirmation';
    } else if (lines.includes('remind') || lines.includes('reminder')) {
      actionType = 'remind';
      actionLabel = 'Send Reminder';
      actionDescription = 'Payment reminder recommended';
    } else if (lines.includes('follow') || lines.includes('follow-up') || lines.includes('follow up')) {
      actionType = 'follow_up';
      actionLabel = 'Follow Up';
      actionDescription = 'Follow-up action needed';
    } else if (lines.includes('respond')) {
      actionType = 'respond';
      actionLabel = 'Respond';
      actionDescription = 'Response needed';
    }

    return {
      summary: response.split('\n')[0] || `${record.name} requires attention`,
      priority,
      suggestedAction: {
        type: actionType,
        label: actionLabel,
        description: actionDescription,
        urgency: priority === 'high' ? 'immediate' : priority === 'medium' ? 'soon' : 'normal',
      },
    };
  }

  // ============ Default Analysis (fallback) ============

  private getDefaultPriority(record: { amount: number; state?: string }): string {
    if (record.amount > 10000) return 'high';
    if (record.amount > 1000) return 'medium';
    return 'low';
  }

  private getInvoicePriority(invoice: OdooInvoiceSummary): 'high' | 'medium' | 'low' {
    if (invoice.isOverdue && invoice.daysOverdue > 30) return 'high';
    if (invoice.isOverdue) return 'medium';
    if (invoice.amountDue > 10000) return 'high';
    return 'low';
  }

  private getDefaultRfpAction(rfp: OdooRfpSummary): OdooSuggestedAction {
    if (rfp.state === 'to approve') {
      return {
        type: 'approve',
        label: 'Review & Approve',
        description: 'RFP awaiting approval',
        urgency: 'soon',
      };
    }
    return {
      type: 'none',
      label: 'View',
      description: '',
      urgency: 'normal',
    };
  }

  private getDefaultSalesAction(order: OdooSalesOrderSummary): OdooSuggestedAction {
    if (order.state === 'draft' || order.state === 'sent') {
      return {
        type: 'confirm',
        label: 'Confirm Order',
        description: 'Ready for confirmation',
        urgency: 'soon',
      };
    }
    if (order.invoiceStatus === 'to invoice') {
      return {
        type: 'follow_up',
        label: 'Create Invoice',
        description: 'Order ready for invoicing',
        urgency: 'soon',
      };
    }
    return {
      type: 'none',
      label: 'View',
      description: '',
      urgency: 'normal',
    };
  }

  private getDefaultInvoiceAction(invoice: OdooInvoiceSummary): OdooSuggestedAction {
    if (invoice.isOverdue) {
      return {
        type: 'remind',
        label: 'Send Reminder',
        description: `Overdue by ${invoice.daysOverdue} days`,
        urgency: 'immediate',
      };
    }
    if (invoice.paymentState === 'not_paid' && invoice.state === 'posted') {
      return {
        type: 'follow_up',
        label: 'Follow Up',
        description: 'Payment pending',
        urgency: 'soon',
      };
    }
    return {
      type: 'none',
      label: 'View',
      description: '',
      urgency: 'normal',
    };
  }
}

// Singleton instance
let odooServiceInstance: OdooService | null = null;

export function getOdooService(): OdooService {
  if (!odooServiceInstance) {
    odooServiceInstance = new OdooService();
  }
  return odooServiceInstance;
}
