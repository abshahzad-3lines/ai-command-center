/**
 * @fileoverview Report Service - Generates business reports from Odoo data
 * Uses OdooService.searchRecords() for all queries, returns structured ReportResult
 */

import { getOdooService } from '@/lib/odoo';

// ============ Types ============

export interface ReportResult {
  title: string;
  description: string;
  generatedAt: string;
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  type: 'stats' | 'table' | 'chart';
  stats?: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
  columns?: string[];
  rows?: (string | number)[][];
  chartType?: 'bar' | 'line' | 'pie';
  chartData?: { name: string; value: number }[];
  chartKeys?: { dataKey: string; color: string; label: string }[];
}

export type ReportType =
  | 'sales_summary'
  | 'invoice_aging'
  | 'purchase_overview'
  | 'revenue_by_customer'
  | 'product_performance'
  | 'accounts_receivable'
  | 'master_report';

export interface ReportDateRange {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
}

// ============ Helpers ============

/** Format a number as $1,234,567.89 */
function fmtUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format a number with commas: 1,234,567 */
function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

// ============ Service ============

export class ReportService {
  private odoo = getOdooService();

  async generateReport(type: ReportType, dateRange?: ReportDateRange): Promise<ReportResult> {
    switch (type) {
      case 'sales_summary':
        return this.salesSummary(dateRange);
      case 'invoice_aging':
        return this.invoiceAging(dateRange);
      case 'purchase_overview':
        return this.purchaseOverview(dateRange);
      case 'revenue_by_customer':
        return this.revenueByCustomer(dateRange);
      case 'product_performance':
        return this.productPerformance(dateRange);
      case 'accounts_receivable':
        return this.accountsReceivable(dateRange);
      case 'master_report':
        return this.masterReport(dateRange);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  /**
   * Build Odoo domain filters for a date range on a given field
   */
  private buildDateDomain(dateField: string, dateRange?: ReportDateRange): unknown[] {
    if (!dateRange) return [];
    const domain: unknown[] = [];
    if (dateRange.dateFrom) {
      domain.push([dateField, '>=', dateRange.dateFrom]);
    }
    if (dateRange.dateTo) {
      domain.push([dateField, '<=', dateRange.dateTo]);
    }
    return domain;
  }

  // ============ Sales Summary ============

  private async salesSummary(dateRange?: ReportDateRange): Promise<ReportResult> {
    const dateDomain = this.buildDateDomain('date_order', dateRange);
    const orders = await this.odoo.searchRecords<{
      id: number;
      name: string;
      state: string;
      amount_total: number;
      partner_id: [number, string] | false;
      date_order: string;
    }>('sale.order', [...dateDomain], ['id', 'name', 'state', 'amount_total', 'partner_id', 'date_order'], {
      limit: 200,
      order: 'date_order desc',
    });

    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
    const confirmedOrders = orders.filter((o) => o.state === 'sale' || o.state === 'done');
    const confirmedRevenue = confirmedOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0);

    // Count by state
    const stateCounts: Record<string, number> = {};
    for (const o of orders) {
      stateCounts[o.state] = (stateCounts[o.state] || 0) + 1;
    }

    // Top customers
    const customerTotals: Record<string, number> = {};
    for (const o of confirmedOrders) {
      const name = Array.isArray(o.partner_id) ? o.partner_id[1] : 'Unknown';
      customerTotals[name] = (customerTotals[name] || 0) + (o.amount_total || 0);
    }
    const topCustomers = Object.entries(customerTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Chart data
    const statusChartData = Object.entries(stateCounts).map(([state, count]) => ({
      name: formatState(state),
      value: count,
    }));

    const customerChartData = topCustomers.slice(0, 5).map(([name, total]) => ({
      name: name.length > 20 ? name.slice(0, 18) + '...' : name,
      value: Math.round(total * 100) / 100,
    }));

    return {
      title: 'Sales Summary',
      description: 'Overview of all sales orders with revenue breakdown and top customers.',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'Key Metrics',
          type: 'stats',
          stats: [
            { label: 'Total Orders', value: fmtNum(orders.length), trend: 'neutral' },
            { label: 'Confirmed Orders', value: fmtNum(confirmedOrders.length), trend: 'up' },
            { label: 'Total Revenue', value: fmtUSD(totalRevenue), trend: 'neutral' },
            { label: 'Confirmed Revenue', value: fmtUSD(confirmedRevenue), trend: 'up' },
          ],
        },
        {
          title: 'Orders by Status',
          type: 'chart',
          chartType: 'bar',
          chartData: statusChartData,
          chartKeys: [{ dataKey: 'value', color: '#3b82f6', label: 'Orders' }],
        },
        {
          title: 'Revenue by Top Customers',
          type: 'chart',
          chartType: 'pie',
          chartData: customerChartData,
          chartKeys: [{ dataKey: 'value', color: '#8b5cf6', label: 'Revenue' }],
        },
        {
          title: 'Orders by Status',
          type: 'table',
          columns: ['Status', 'Count'],
          rows: Object.entries(stateCounts).map(([state, count]) => [
            formatState(state),
            count,
          ]),
        },
        {
          title: 'Top Customers by Revenue',
          type: 'table',
          columns: ['Customer', 'Revenue'],
          rows: topCustomers.map(([name, total]) => [name, fmtUSD(total)]),
        },
      ],
    };
  }

  // ============ Invoice Aging ============

  private async invoiceAging(dateRange?: ReportDateRange): Promise<ReportResult> {
    const dateDomain = this.buildDateDomain('invoice_date', dateRange);
    const invoices = await this.odoo.searchRecords<{
      id: number;
      name: string;
      partner_id: [number, string] | false;
      invoice_date_due: string | false;
      amount_residual: number;
      state: string;
      move_type: string;
    }>(
      'account.move',
      [
        ['move_type', '=', 'out_invoice'],
        ['state', '=', 'posted'],
        ['amount_residual', '>', 0],
        ...dateDomain,
      ],
      ['id', 'name', 'partner_id', 'invoice_date_due', 'amount_residual', 'state', 'move_type'],
      { limit: 200, order: 'invoice_date_due asc' }
    );

    const now = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const bucketInvoices: Record<string, typeof invoices> = {
      current: [],
      days30: [],
      days60: [],
      days90: [],
      over90: [],
    };

    for (const inv of invoices) {
      const dueDate = inv.invoice_date_due ? new Date(inv.invoice_date_due) : now;
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) {
        buckets.current += inv.amount_residual;
        bucketInvoices.current.push(inv);
      } else if (daysOverdue <= 30) {
        buckets.days30 += inv.amount_residual;
        bucketInvoices.days30.push(inv);
      } else if (daysOverdue <= 60) {
        buckets.days60 += inv.amount_residual;
        bucketInvoices.days60.push(inv);
      } else if (daysOverdue <= 90) {
        buckets.days90 += inv.amount_residual;
        bucketInvoices.days90.push(inv);
      } else {
        buckets.over90 += inv.amount_residual;
        bucketInvoices.over90.push(inv);
      }
    }

    const totalOutstanding = Object.values(buckets).reduce((s, v) => s + v, 0);

    // Chart data for aging buckets
    const agingChartData = [
      { name: 'Current', value: Math.round(buckets.current * 100) / 100 },
      { name: '1-30 Days', value: Math.round(buckets.days30 * 100) / 100 },
      { name: '31-60 Days', value: Math.round(buckets.days60 * 100) / 100 },
      { name: '61-90 Days', value: Math.round(buckets.days90 * 100) / 100 },
      { name: '90+ Days', value: Math.round(buckets.over90 * 100) / 100 },
    ];

    return {
      title: 'Invoice Aging',
      description: 'Breakdown of outstanding invoices by aging bucket.',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'Aging Summary',
          type: 'stats',
          stats: [
            { label: 'Total Outstanding', value: fmtUSD(totalOutstanding), trend: 'neutral' },
            { label: 'Current (Not Due)', value: fmtUSD(buckets.current), trend: 'up' },
            { label: '1-30 Days', value: fmtUSD(buckets.days30), trend: 'neutral' },
            { label: '31-60 Days', value: fmtUSD(buckets.days60), trend: 'down' },
            { label: '61-90 Days', value: fmtUSD(buckets.days90), trend: 'down' },
            { label: '90+ Days', value: fmtUSD(buckets.over90), trend: 'down' },
          ],
        },
        {
          title: 'Aging Buckets',
          type: 'chart',
          chartType: 'bar',
          chartData: agingChartData,
          chartKeys: [{ dataKey: 'value', color: '#ef4444', label: 'Amount' }],
        },
        {
          title: 'Overdue Invoices (31+ Days)',
          type: 'table',
          columns: ['Invoice', 'Customer', 'Due Date', 'Amount Due'],
          rows: [...bucketInvoices.days60, ...bucketInvoices.days90, ...bucketInvoices.over90]
            .slice(0, 20)
            .map((inv) => [
              inv.name,
              Array.isArray(inv.partner_id) ? inv.partner_id[1] : 'Unknown',
              inv.invoice_date_due || 'N/A',
              fmtUSD(inv.amount_residual),
            ]),
        },
      ],
    };
  }

  // ============ Purchase Overview ============

  private async purchaseOverview(dateRange?: ReportDateRange): Promise<ReportResult> {
    const dateDomain = this.buildDateDomain('date_order', dateRange);
    const orders = await this.odoo.searchRecords<{
      id: number;
      name: string;
      state: string;
      amount_total: number;
      partner_id: [number, string] | false;
      date_order: string;
    }>('purchase.order', [...dateDomain], ['id', 'name', 'state', 'amount_total', 'partner_id', 'date_order'], {
      limit: 200,
      order: 'date_order desc',
    });

    const totalSpend = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
    const confirmedOrders = orders.filter((o) => o.state === 'purchase' || o.state === 'done');
    const confirmedSpend = confirmedOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0);

    // Count by state
    const stateCounts: Record<string, number> = {};
    for (const o of orders) {
      stateCounts[o.state] = (stateCounts[o.state] || 0) + 1;
    }

    // Top vendors
    const vendorTotals: Record<string, number> = {};
    for (const o of orders) {
      const name = Array.isArray(o.partner_id) ? o.partner_id[1] : 'Unknown';
      vendorTotals[name] = (vendorTotals[name] || 0) + (o.amount_total || 0);
    }
    const topVendors = Object.entries(vendorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Chart data
    const statusChartData = Object.entries(stateCounts).map(([state, count]) => ({
      name: formatState(state),
      value: count,
    }));

    const vendorChartData = topVendors.slice(0, 5).map(([name, total]) => ({
      name: name.length > 20 ? name.slice(0, 18) + '...' : name,
      value: Math.round(total * 100) / 100,
    }));

    return {
      title: 'Purchase Overview',
      description: 'Summary of purchase orders with spending breakdown and top vendors.',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'Key Metrics',
          type: 'stats',
          stats: [
            { label: 'Total POs', value: fmtNum(orders.length), trend: 'neutral' },
            { label: 'Confirmed POs', value: fmtNum(confirmedOrders.length), trend: 'up' },
            { label: 'Total Spend', value: fmtUSD(totalSpend), trend: 'neutral' },
            { label: 'Confirmed Spend', value: fmtUSD(confirmedSpend), trend: 'up' },
          ],
        },
        {
          title: 'Orders by Status',
          type: 'chart',
          chartType: 'bar',
          chartData: statusChartData,
          chartKeys: [{ dataKey: 'value', color: '#3b82f6', label: 'Orders' }],
        },
        {
          title: 'Spend by Top Vendors',
          type: 'chart',
          chartType: 'pie',
          chartData: vendorChartData,
          chartKeys: [{ dataKey: 'value', color: '#f59e0b', label: 'Spend' }],
        },
        {
          title: 'Orders by Status',
          type: 'table',
          columns: ['Status', 'Count'],
          rows: Object.entries(stateCounts).map(([state, count]) => [
            formatState(state),
            count,
          ]),
        },
        {
          title: 'Top Vendors by Spend',
          type: 'table',
          columns: ['Vendor', 'Total Spend'],
          rows: topVendors.map(([name, total]) => [name, fmtUSD(total)]),
        },
      ],
    };
  }

  // ============ Revenue by Customer ============

  private async revenueByCustomer(dateRange?: ReportDateRange): Promise<ReportResult> {
    const dateDomain = this.buildDateDomain('date_order', dateRange);
    const orders = await this.odoo.searchRecords<{
      id: number;
      partner_id: [number, string] | false;
      amount_total: number;
      state: string;
    }>(
      'sale.order',
      [['state', 'in', ['sale', 'done']], ...dateDomain],
      ['id', 'partner_id', 'amount_total', 'state'],
      { limit: 500, order: 'amount_total desc' }
    );

    const customerTotals: Record<string, { revenue: number; orders: number }> = {};
    for (const o of orders) {
      const name = Array.isArray(o.partner_id) ? o.partner_id[1] : 'Unknown';
      if (!customerTotals[name]) customerTotals[name] = { revenue: 0, orders: 0 };
      customerTotals[name].revenue += o.amount_total || 0;
      customerTotals[name].orders += 1;
    }

    const sorted = Object.entries(customerTotals)
      .sort((a, b) => b[1].revenue - a[1].revenue);

    const totalRevenue = sorted.reduce((sum, [, v]) => sum + v.revenue, 0);

    // Chart data - top 10 customers bar chart
    const customerChartData = sorted.slice(0, 10).map(([name, data]) => ({
      name: name.length > 20 ? name.slice(0, 18) + '...' : name,
      value: Math.round(data.revenue * 100) / 100,
    }));

    return {
      title: 'Revenue by Customer',
      description: 'Revenue per customer from confirmed sales orders, sorted by highest revenue.',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'Summary',
          type: 'stats',
          stats: [
            { label: 'Total Revenue', value: fmtUSD(totalRevenue), trend: 'up' },
            { label: 'Total Customers', value: fmtNum(sorted.length), trend: 'neutral' },
            { label: 'Avg per Customer', value: fmtUSD(sorted.length > 0 ? totalRevenue / sorted.length : 0), trend: 'neutral' },
          ],
        },
        {
          title: 'Top 10 Customers by Revenue',
          type: 'chart',
          chartType: 'bar',
          chartData: customerChartData,
          chartKeys: [{ dataKey: 'value', color: '#10b981', label: 'Revenue' }],
        },
        {
          title: 'Revenue by Customer',
          type: 'table',
          columns: ['Customer', 'Orders', 'Revenue', '% of Total'],
          rows: sorted.slice(0, 20).map(([name, data]) => [
            name,
            data.orders,
            fmtUSD(data.revenue),
            `${totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : '0'}%`,
          ]),
        },
      ],
    };
  }

  // ============ Product Performance ============

  private async productPerformance(dateRange?: ReportDateRange): Promise<ReportResult> {
    const dateDomain = this.buildDateDomain('create_date', dateRange);
    const lines = await this.odoo.searchRecords<{
      id: number;
      product_id: [number, string] | false;
      product_uom_qty: number;
      price_subtotal: number;
      order_id: [number, string] | false;
    }>(
      'sale.order.line',
      [['state', 'in', ['sale', 'done']], ...dateDomain],
      ['id', 'product_id', 'product_uom_qty', 'price_subtotal', 'order_id'],
      { limit: 500, order: 'price_subtotal desc' }
    );

    const productTotals: Record<string, { quantity: number; revenue: number }> = {};
    for (const line of lines) {
      const name = Array.isArray(line.product_id) ? line.product_id[1] : 'Unknown Product';
      if (!productTotals[name]) productTotals[name] = { quantity: 0, revenue: 0 };
      productTotals[name].quantity += line.product_uom_qty || 0;
      productTotals[name].revenue += line.price_subtotal || 0;
    }

    const byRevenue = Object.entries(productTotals)
      .sort((a, b) => b[1].revenue - a[1].revenue);
    const byQuantity = Object.entries(productTotals)
      .sort((a, b) => b[1].quantity - a[1].quantity);

    const totalRevenue = byRevenue.reduce((sum, [, v]) => sum + v.revenue, 0);
    const totalQty = byQuantity.reduce((sum, [, v]) => sum + v.quantity, 0);

    // Chart data - top 10 products by revenue
    const productChartData = byRevenue.slice(0, 10).map(([name, data]) => ({
      name: name.length > 20 ? name.slice(0, 18) + '...' : name,
      value: Math.round(data.revenue * 100) / 100,
    }));

    return {
      title: 'Product Performance',
      description: 'Top products by quantity sold and revenue from confirmed sales orders.',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'Summary',
          type: 'stats',
          stats: [
            { label: 'Total Products', value: fmtNum(byRevenue.length), trend: 'neutral' },
            { label: 'Total Quantity Sold', value: fmtNum(Math.round(totalQty)), trend: 'up' },
            { label: 'Total Revenue', value: fmtUSD(totalRevenue), trend: 'up' },
          ],
        },
        {
          title: 'Top 10 Products by Revenue',
          type: 'chart',
          chartType: 'bar',
          chartData: productChartData,
          chartKeys: [{ dataKey: 'value', color: '#8b5cf6', label: 'Revenue' }],
        },
        {
          title: 'Top Products by Revenue',
          type: 'table',
          columns: ['Product', 'Qty Sold', 'Revenue'],
          rows: byRevenue.slice(0, 15).map(([name, data]) => [
            name,
            fmtNum(Math.round(data.quantity)),
            fmtUSD(data.revenue),
          ]),
        },
        {
          title: 'Top Products by Quantity',
          type: 'table',
          columns: ['Product', 'Qty Sold', 'Revenue'],
          rows: byQuantity.slice(0, 15).map(([name, data]) => [
            name,
            fmtNum(Math.round(data.quantity)),
            fmtUSD(data.revenue),
          ]),
        },
      ],
    };
  }

  // ============ Accounts Receivable ============

  private async accountsReceivable(dateRange?: ReportDateRange): Promise<ReportResult> {
    const dateDomain = this.buildDateDomain('invoice_date', dateRange);
    const invoices = await this.odoo.searchRecords<{
      id: number;
      name: string;
      partner_id: [number, string] | false;
      amount_residual: number;
      invoice_date_due: string | false;
      state: string;
      move_type: string;
    }>(
      'account.move',
      [
        ['move_type', '=', 'out_invoice'],
        ['state', '=', 'posted'],
        ['amount_residual', '>', 0],
        ...dateDomain,
      ],
      ['id', 'name', 'partner_id', 'amount_residual', 'invoice_date_due', 'state', 'move_type'],
      { limit: 200, order: 'amount_residual desc' }
    );

    // Aggregate by customer
    const customerBalances: Record<string, { balance: number; invoices: number }> = {};
    for (const inv of invoices) {
      const name = Array.isArray(inv.partner_id) ? inv.partner_id[1] : 'Unknown';
      if (!customerBalances[name]) customerBalances[name] = { balance: 0, invoices: 0 };
      customerBalances[name].balance += inv.amount_residual || 0;
      customerBalances[name].invoices += 1;
    }

    const sorted = Object.entries(customerBalances)
      .sort((a, b) => b[1].balance - a[1].balance);

    const totalOutstanding = sorted.reduce((sum, [, v]) => sum + v.balance, 0);

    // Chart data - top 10 customers by outstanding balance
    const arChartData = sorted.slice(0, 10).map(([name, data]) => ({
      name: name.length > 20 ? name.slice(0, 18) + '...' : name,
      value: Math.round(data.balance * 100) / 100,
    }));

    return {
      title: 'Accounts Receivable',
      description: 'Outstanding balance per customer from unpaid posted invoices.',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          title: 'Summary',
          type: 'stats',
          stats: [
            { label: 'Total Outstanding', value: fmtUSD(totalOutstanding), trend: 'down' },
            { label: 'Unpaid Invoices', value: fmtNum(invoices.length), trend: 'neutral' },
            { label: 'Customers with Balance', value: fmtNum(sorted.length), trend: 'neutral' },
          ],
        },
        {
          title: 'Outstanding by Top Customers',
          type: 'chart',
          chartType: 'bar',
          chartData: arChartData,
          chartKeys: [{ dataKey: 'value', color: '#ef4444', label: 'Outstanding' }],
        },
        {
          title: 'Outstanding by Customer',
          type: 'table',
          columns: ['Customer', 'Invoices', 'Outstanding Balance', '% of Total'],
          rows: sorted.slice(0, 20).map(([name, data]) => [
            name,
            data.invoices,
            fmtUSD(data.balance),
            `${totalOutstanding > 0 ? ((data.balance / totalOutstanding) * 100).toFixed(1) : '0'}%`,
          ]),
        },
      ],
    };
  }
  // ============ Master Report (All-in-One) ============

  private async masterReport(dateRange?: ReportDateRange): Promise<ReportResult> {
    const [sales, invoiceAging, purchases, revenueByCustomer, productPerf, accountsRec] =
      await Promise.all([
        this.salesSummary(dateRange),
        this.invoiceAging(dateRange),
        this.purchaseOverview(dateRange),
        this.revenueByCustomer(dateRange),
        this.productPerformance(dateRange),
        this.accountsReceivable(dateRange),
      ]);

    const prefixSections = (report: ReportResult): ReportSection[] =>
      report.sections.map((s) => ({ ...s, title: `${report.title} — ${s.title}` }));

    return {
      title: 'Master Business Report',
      description: 'Complete business overview combining all reports into one.',
      generatedAt: new Date().toISOString(),
      sections: [
        ...prefixSections(sales),
        ...prefixSections(invoiceAging),
        ...prefixSections(purchases),
        ...prefixSections(revenueByCustomer),
        ...prefixSections(productPerf),
        ...prefixSections(accountsRec),
      ],
    };
  }
}

// ============ Helpers ============

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
