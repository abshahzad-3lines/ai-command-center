/**
 * @fileoverview Odoo Action History API
 * GET /api/odoo/actions - Fetch action history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActionHistory, getActionStats } from '@/lib/services/odoo-action-log.service';
import type { ApiResponse } from '@/types';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const toolName = searchParams.get('toolName') || undefined;
    const modelName = searchParams.get('modelName') || undefined;
    const includeStats = searchParams.get('stats') === 'true';

    const actions = await getActionHistory(userId, {
      limit,
      offset,
      toolName,
      modelName,
    });

    let stats = null;
    if (includeStats) {
      stats = await getActionStats(userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        actions,
        stats,
        pagination: {
          limit,
          offset,
          hasMore: actions.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch action history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch action history',
      },
      { status: 500 }
    );
  }
}
