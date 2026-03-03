// API route: GET/POST /api/odoo/invoices/[id] - fetch or action on single Invoice

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOdooService } from '@/lib/services/odoo.service';
import { OdooCacheService } from '@/lib/services/odoo-cache.service';
import type { ApiResponse } from '@/types';
import type { OdooInvoice, OdooToolResult } from '@/types/odoo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<OdooInvoice>>> {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id, 10);

    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Invoice ID' },
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

    const invoice = await odooService.getInvoice(invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Failed to fetch Invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Invoice',
      },
      { status: 500 }
    );
  }
}

interface InvoiceActionRequest {
  action: 'register_payment' | 'send_reminder';
  amount?: number;
  date?: string;
  reminderType?: 'friendly' | 'formal' | 'final_notice';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<OdooToolResult>>> {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id, 10);

    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Invoice ID' },
        { status: 400 }
      );
    }

    const body: InvoiceActionRequest = await request.json();

    if (!body.action || !['register_payment', 'send_reminder'].includes(body.action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "register_payment" or "send_reminder".' },
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

    if (body.action === 'register_payment') {
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Amount is required and must be positive for payment registration.' },
          { status: 400 }
        );
      }
      result = await odooService.registerPayment(invoiceId, body.amount, body.date);
    } else {
      const reminderType = body.reminderType || 'friendly';
      result = await odooService.sendReminder(invoiceId, reminderType);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Action failed' },
        { status: 400 }
      );
    }

    // Invalidate cache so next read fetches fresh data
    const userId = request.headers.get('x-user-id');
    if (userId) {
      const supabase = await createClient();
      const cacheService = new OdooCacheService(supabase, userId);
      await cacheService.invalidateInvoice(invoiceId);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to execute Invoice action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute action',
      },
      { status: 500 }
    );
  }
}
