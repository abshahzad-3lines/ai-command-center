// API route: POST /api/odoo/rfps/[id]/action - execute RFP action

import { NextRequest, NextResponse } from 'next/server';
import { getOdooService } from '@/lib/services/odoo.service';
import type { ApiResponse } from '@/types';
import type { OdooToolResult } from '@/types/odoo';

interface RfpActionRequest {
  action: 'approve' | 'reject';
  reason?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<OdooToolResult>>> {
  try {
    const { id } = await params;
    const rfpId = parseInt(id, 10);

    if (isNaN(rfpId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid RFP ID' },
        { status: 400 }
      );
    }

    const body: RfpActionRequest = await request.json();

    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject".' },
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

    let result: OdooToolResult;

    if (body.action === 'approve') {
      result = await odooService.approveRfp(rfpId);
    } else {
      result = await odooService.rejectRfp(rfpId, body.reason);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Action failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to execute RFP action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute action',
      },
      { status: 500 }
    );
  }
}
