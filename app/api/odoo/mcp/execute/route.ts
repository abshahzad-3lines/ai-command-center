// API route: POST /api/odoo/mcp/execute - execute any MCP tool

import { NextRequest, NextResponse } from 'next/server';
import { getOdooService } from '@/lib/services/odoo.service';
import type { ApiResponse } from '@/types';
import type { McpToolResult } from '@/types/odoo';

interface McpExecuteRequest {
  tool: string;
  arguments: Record<string, unknown>;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<McpToolResult>>> {
  try {
    const body: McpExecuteRequest = await request.json();

    if (!body.tool || typeof body.tool !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Tool name is required' },
        { status: 400 }
      );
    }

    if (!body.arguments || typeof body.arguments !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Arguments object is required' },
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

    const result = await odooService.executeTool(body.tool, body.arguments);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Tool execution failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to execute MCP tool:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute MCP tool',
      },
      { status: 500 }
    );
  }
}
