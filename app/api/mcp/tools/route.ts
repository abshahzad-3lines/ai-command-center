/**
 * @fileoverview API route for listing available MCP tools
 * GET /api/mcp/tools - List all available MCP tools
 */

import { NextResponse } from 'next/server';
import { getMcpClient } from '@/lib/mcp';
import { getAvailableMcpServers } from '@/lib/mcp/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = getMcpClient();
    const serverNames = getAvailableMcpServers();
    const allTools: { server: string; tools: unknown[] }[] = [];

    for (const serverName of serverNames) {
      try {
        const connected = await client.connect(serverName);
        if (connected) {
          const tools = await client.listTools(serverName);
          allTools.push({ server: serverName, tools });
        }
      } catch (error) {
        console.error(`Failed to get tools from ${serverName}:`, error);
        allTools.push({ server: serverName, tools: [] });
      }
    }

    return NextResponse.json({
      success: true,
      data: allTools,
    });
  } catch (error) {
    console.error('Error listing MCP tools:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list MCP tools',
      },
      { status: 500 }
    );
  }
}
