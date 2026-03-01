/**
 * @fileoverview API route for executing MCP tools
 * POST /api/mcp/execute - Execute a tool on an MCP server
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMcpClient } from '@/lib/mcp';

export const dynamic = 'force-dynamic';

interface ExecuteRequest {
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json();
    const { server, tool, arguments: args } = body;

    if (!server || !tool) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: server, tool',
        },
        { status: 400 }
      );
    }

    const client = getMcpClient();

    // Ensure connection
    const connected = await client.connect(server);
    if (!connected) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to connect to MCP server: ${server}`,
        },
        { status: 500 }
      );
    }

    // Execute the tool
    const result = await client.callTool(server, tool, args || {});

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error) {
    console.error('Error executing MCP tool:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute MCP tool',
      },
      { status: 500 }
    );
  }
}
