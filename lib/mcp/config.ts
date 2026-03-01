/**
 * @fileoverview MCP (Model Context Protocol) Server Configuration
 * Defines the MCP servers available for use in the AI Command Center
 */

export interface McpServerConfig {
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface McpConfig {
  servers: Record<string, McpServerConfig>;
}

/**
 * MCP Server configurations loaded from user settings
 * These servers provide AI capabilities for the dashboard
 */
export const mcpConfig: McpConfig = {
  servers: {
    // Sequential thinking for step-by-step reasoning
    'sequential-thinking': {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      env: {},
    },

    // Memory/Knowledge graph for persistent context
    memory: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: {},
    },

    // Playwright for browser automation
    playwright: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@playwright/mcp@latest'],
      env: {},
    },

    // Odoo ERP integration
    odoo: {
      type: 'stdio',
      command: process.env.ODOO_MCP_PYTHON_PATH || 'python',
      args: ['-m', 'mcp_server_odoo'],
      env: {
        ODOO_URL: process.env.ODOO_URL || '',
        ODOO_DB: process.env.ODOO_DATABASE || '',
        ODOO_API_KEY: process.env.ODOO_API_KEY || '',
      },
    },
  },
};

/**
 * Get a specific MCP server configuration
 */
export function getMcpServerConfig(serverName: string): McpServerConfig | null {
  return mcpConfig.servers[serverName] || null;
}

/**
 * Get all available MCP server names
 */
export function getAvailableMcpServers(): string[] {
  return Object.keys(mcpConfig.servers);
}
