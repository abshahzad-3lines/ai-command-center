// API route: GET /api/odoo/invoices - fetch Invoices with AI analysis

import { NextRequest, NextResponse } from 'next/server';
import { getOdooService } from '@/lib/services/odoo.service';
import type { ApiResponse } from '@/types';
import type { OdooInvoiceSummary } from '@/types/odoo';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OdooInvoiceSummary[]>>> {
  try {
    const odooService = getOdooService();

    // Check if Odoo is configured
    if (!odooService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Odoo is not configured. Please set ODOO_URL, ODOO_DATABASE, and ODOO_API_KEY.' },
        { status: 503 }
      );
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const invoices = await odooService.getInvoicesWithAnalysis(limit);

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Failed to fetch Invoices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Invoices',
      },
      { status: 500 }
    );
  }
}
