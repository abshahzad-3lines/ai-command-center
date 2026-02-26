// API route: GET /api/odoo/rfps - fetch RFPs with AI analysis

import { NextRequest, NextResponse } from 'next/server';
import { getOdooService } from '@/lib/services/odoo.service';
import type { ApiResponse } from '@/types';
import type { OdooRfpSummary } from '@/types/odoo';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OdooRfpSummary[]>>> {
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

    const rfps = await odooService.getRfpsWithAnalysis(limit);

    return NextResponse.json({
      success: true,
      data: rfps,
    });
  } catch (error) {
    console.error('Failed to fetch RFPs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch RFPs',
      },
      { status: 500 }
    );
  }
}
