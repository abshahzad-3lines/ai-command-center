/**
 * @fileoverview Report generation API endpoint
 * POST /api/reports/generate - Generate a report by type
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReportService } from '@/lib/services/report.service';
import type { ReportType, ReportDateRange } from '@/lib/services/report.service';
import type { ApiResponse } from '@/types';
import type { ReportResult } from '@/lib/services/report.service';

const VALID_TYPES: ReportType[] = [
  'sales_summary',
  'invoice_aging',
  'purchase_overview',
  'revenue_by_customer',
  'product_performance',
  'accounts_receivable',
  'master_report',
];

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ReportResult>>> {
  try {
    const body = await request.json();
    const { reportType, dateFrom, dateTo } = body;

    if (!reportType || !VALID_TYPES.includes(reportType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid report type. Must be one of: ${VALID_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const dateRange: ReportDateRange | undefined =
      dateFrom && dateTo ? { dateFrom, dateTo } : undefined;

    const service = new ReportService();
    const result = await service.generateReport(reportType as ReportType, dateRange);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}
