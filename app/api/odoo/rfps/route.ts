// API route: GET /api/odoo/rfps - fetch RFPs with cache-first + stale-while-revalidate

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOdooService } from '@/lib/services/odoo.service';
import { OdooCacheService } from '@/lib/services/odoo-cache.service';
import type { ApiResponse } from '@/types';
import type { OdooRfpSummary } from '@/types/odoo';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<OdooRfpSummary[]>>> {
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
      const cached = await cacheService.getCachedRfps(limit);

      if (cached.length > 0) {
        // Check staleness and trigger background refresh if needed
        const stale = await cacheService.isCacheStale('odoo_rfp_cache');
        if (stale) {
          const baseUrl = request.nextUrl.origin;
          fetch(`${baseUrl}/api/odoo/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ types: ['rfps'] }),
          }).catch((err) => console.error('Background RFP refresh failed:', err));
        }

        return NextResponse.json({
          success: true,
          data: cached.map(OdooCacheService.toRfpSummary),
        });
      }
    }

    // Force refresh or cache empty — fetch from Odoo, cache, and return
    const rfps = await odooService.getRfpsWithAnalysis(limit);
    await cacheService.cacheRfps(rfps);

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
