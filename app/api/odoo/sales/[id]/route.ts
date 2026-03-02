// API route: GET/POST /api/odoo/sales/[id] - fetch or action on single Sales Order

import { NextRequest, NextResponse } from 'next/server';
import { getOdooService } from '@/lib/services/odoo.service';
import type { ApiResponse } from '@/types';
import type { OdooSalesOrder, OdooToolResult } from '@/types/odoo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<OdooSalesOrder>>> {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Sales Order ID' },
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

    const order = await odooService.getSalesOrder(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Sales Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Failed to fetch Sales Order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Sales Order',
      },
      { status: 500 }
    );
  }
}

interface SalesOrderActionRequest {
  action: 'confirm' | 'cancel';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<OdooToolResult>>> {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Sales Order ID' },
        { status: 400 }
      );
    }

    const body: SalesOrderActionRequest = await request.json();

    if (!body.action || !['confirm', 'cancel'].includes(body.action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "confirm" or "cancel".' },
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

    if (body.action === 'confirm') {
      result = await odooService.confirmSalesOrder(orderId);
    } else {
      result = await odooService.cancelSalesOrder(orderId);
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
    console.error('Failed to execute Sales Order action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute action',
      },
      { status: 500 }
    );
  }
}
