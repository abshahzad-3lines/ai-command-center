// API route: GET /api/odoo/rfps/[id] - fetch single RFP

import { NextRequest, NextResponse } from 'next/server';
import { getOdooService } from '@/lib/services/odoo.service';
import type { ApiResponse } from '@/types';
import type { OdooRfp } from '@/types/odoo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<OdooRfp>>> {
  try {
    const { id } = await params;
    const rfpId = parseInt(id, 10);

    if (isNaN(rfpId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid RFP ID' },
        { status: 400 }
      );
    }

    const odooService = getOdooService();

    if (!odooService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Odoo is not configured. Please set ODOO_URL, ODOO_DATABASE, and ODOO_API_KEY.' },
        { status: 503 }
      );
    }

    const rfp = await odooService.getRfp(rfpId);

    if (!rfp) {
      return NextResponse.json(
        { success: false, error: 'RFP not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rfp,
    });
  } catch (error) {
    console.error('Failed to fetch RFP:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch RFP',
      },
      { status: 500 }
    );
  }
}
