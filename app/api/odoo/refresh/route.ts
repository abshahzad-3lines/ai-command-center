// API route: POST /api/odoo/refresh - background cache refresh from Odoo + AI

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOdooService } from '@/lib/services/odoo.service';
import { OdooCacheService } from '@/lib/services/odoo-cache.service';
import type { ApiResponse } from '@/types';

type RefreshType = 'rfps' | 'sales' | 'invoices';

interface RefreshRequest {
  types: RefreshType[];
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ refreshed: RefreshType[] }>>> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const odooService = getOdooService();
    if (!odooService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Odoo is not configured' },
        { status: 503 }
      );
    }

    const body: RefreshRequest = await request.json();
    const types = body.types || ['rfps', 'sales', 'invoices'];

    const supabase = await createClient();
    const cacheService = new OdooCacheService(supabase, userId);
    const refreshed: RefreshType[] = [];

    const refreshPromises = types.map(async (type) => {
      try {
        switch (type) {
          case 'rfps': {
            const rfps = await odooService.getRfpsWithAnalysis();
            await cacheService.cacheRfps(rfps);
            refreshed.push('rfps');
            break;
          }
          case 'sales': {
            const sales = await odooService.getSalesOrdersWithAnalysis();
            await cacheService.cacheSales(sales);
            refreshed.push('sales');
            break;
          }
          case 'invoices': {
            const invoices = await odooService.getInvoicesWithAnalysis();
            await cacheService.cacheInvoices(invoices);
            refreshed.push('invoices');
            break;
          }
        }
      } catch (error) {
        console.error(`Failed to refresh ${type}:`, error);
      }
    });

    await Promise.all(refreshPromises);

    return NextResponse.json({
      success: true,
      data: { refreshed },
    });
  } catch (error) {
    console.error('Failed to refresh Odoo cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh cache',
      },
      { status: 500 }
    );
  }
}
