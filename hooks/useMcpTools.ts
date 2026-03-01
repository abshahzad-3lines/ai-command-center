/**
 * @fileoverview React Query hook for MCP tools
 * Provides access to available MCP tools and execution capabilities
 */
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import type { ApiResponse } from '@/types';

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface McpServerTools {
  server: string;
  tools: McpTool[];
}

interface McpExecuteResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Fetch available MCP tools from all servers
 */
async function fetchMcpTools(): Promise<McpServerTools[]> {
  const response = await fetch('/api/mcp/tools');
  const data: ApiResponse<McpServerTools[]> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch MCP tools');
  }

  return data.data;
}

/**
 * Execute an MCP tool
 */
async function executeMcpTool(params: {
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
}): Promise<McpExecuteResult> {
  const response = await fetch('/api/mcp/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data: ApiResponse<McpExecuteResult> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to execute MCP tool');
  }

  return data.data!;
}

/**
 * Hook for accessing and executing MCP tools
 *
 * @returns Object containing available tools and execution function
 *
 * @example
 * ```tsx
 * const { tools, execute, isExecuting } = useMcpTools();
 *
 * // List tools
 * tools?.forEach(server => {
 *   console.log(`${server.server}: ${server.tools.length} tools`);
 * });
 *
 * // Execute a tool
 * const result = await execute({
 *   server: 'odoo',
 *   tool: 'search_read',
 *   arguments: { model: 'sale.order', limit: 10 }
 * });
 * ```
 */
export function useMcpTools() {
  const toolsQuery = useQuery({
    queryKey: ['mcp-tools'],
    queryFn: fetchMcpTools,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const executeMutation = useMutation({
    mutationFn: executeMcpTool,
  });

  return {
    /** Available MCP tools grouped by server */
    tools: toolsQuery.data || [],
    /** Whether tools are loading */
    isLoading: toolsQuery.isLoading,
    /** Error loading tools */
    error: toolsQuery.error?.message || null,
    /** Refetch available tools */
    refetch: toolsQuery.refetch,
    /** Execute an MCP tool */
    execute: executeMutation.mutateAsync,
    /** Whether a tool is currently executing */
    isExecuting: executeMutation.isPending,
    /** Result of the last tool execution */
    lastResult: executeMutation.data,
    /** Error from the last tool execution */
    executeError: executeMutation.error?.message || null,
  };
}

/**
 * Get a flat list of all available tools
 */
export function useFlatMcpTools() {
  const { tools, isLoading, error } = useMcpTools();

  const flatTools = tools.flatMap((server) =>
    server.tools.map((tool) => ({
      server: server.server,
      ...tool,
    }))
  );

  return {
    tools: flatTools,
    isLoading,
    error,
  };
}
