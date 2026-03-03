// API route: GET /api/odoo/sales - fetch Sales Orders with cache-first + stale-while-revalidate

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOdooService } from '@/lib/services/odoo.service';
import { OdooCacheService } from '@/lib/services/odoo-cache.service';
import type { ApiResponse } from '@/types';
import type { OdooSalesOrderSummary } from '@/types/odoo';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OdooSalesOrderSummary[]>>> {
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
        { success: false, error: 'Odoo is not configured. Please set ODOO_URL, ODOO_DATABASE, and ODOO_API_KEY.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const supabase = await createClient();
    const cacheService = new OdooCacheService(supabase, userId);

    // Skip cache when force refresh requested (manual refresh / page reload)
    if (!forceRefresh) {
      const cached = await cacheService.getCachedSales(limit);

      if (cached.length > 0) {
        const stale = await cacheService.isCacheStale('odoo_sales_cache');
        if (stale) {
          const baseUrl = request.nextUrl.origin;
          fetch(`${baseUrl}/api/odoo/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ types: ['sales'] }),
          }).catch((err) => console.error('Background sales refresh failed:', err));
        }

        return NextResponse.json({
          success: true,
          data: cached.map(OdooCacheService.toSalesOrderSummary),
        });
      }
    }

    // Force refresh or cache empty — fetch from Odoo, cache, and return
    const orders = await odooService.getSalesOrdersWithAnalysis(limit);
    await cacheService.cacheSales(orders);

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Failed to fetch Sales Orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Sales Orders',
      },
      { status: 500 }
    );
  }
}
