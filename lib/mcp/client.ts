/**
 * @fileoverview MCP Client for communicating with MCP servers
 * Provides a unified interface for calling MCP tools from the application
 */

import { spawn, ChildProcess } from 'child_process';
import { getMcpServerConfig } from './config';

interface McpRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * MCP Client class for managing connections to MCP servers
 */
export class McpClient {
  private processes: Map<string, ChildProcess> = new Map();
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map();
  private buffers: Map<string, string> = new Map();

  /**
   * Initialize connection to an MCP server
   */
  async connect(serverName: string): Promise<boolean> {
    const config = getMcpServerConfig(serverName);
    if (!config) {
      console.error(`MCP server ${serverName} not found in config`);
      return false;
    }

    if (config.type !== 'stdio') {
      console.error(`MCP server ${serverName} is not a stdio server`);
      return false;
    }

    if (this.processes.has(serverName)) {
      return true; // Already connected
    }

    try {
      const proc = spawn(config.command!, config.args || [], {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.buffers.set(serverName, '');

      proc.stdout?.on('data', (data: Buffer) => {
        this.handleStdout(serverName, data.toString());
      });

      proc.stderr?.on('data', (data: Buffer) => {
        console.error(`[MCP ${serverName}] stderr:`, data.toString());
      });

      proc.on('close', (code) => {
        console.log(`[MCP ${serverName}] Process exited with code ${code}`);
        this.processes.delete(serverName);
        this.buffers.delete(serverName);
      });

      proc.on('error', (error) => {
        console.error(`[MCP ${serverName}] Process error:`, error);
        this.processes.delete(serverName);
      });

      this.processes.set(serverName, proc);

      // Initialize the connection
      await this.sendRequest(serverName, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'ai-command-center',
          version: '1.0.0',
        },
      });

      // Send initialized notification
      this.sendNotification(serverName, 'notifications/initialized', {});

      return true;
    } catch (error) {
      console.error(`Failed to connect to MCP server ${serverName}:`, error);
      return false;
    }
  }

  /**
   * Handle stdout data from MCP server
   */
  private handleStdout(serverName: string, data: string): void {
    let buffer = this.buffers.get(serverName) || '';
    buffer += data;

    // Process complete JSON-RPC messages (newline-delimited)
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    this.buffers.set(serverName, buffer);

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response: McpResponse = JSON.parse(line);
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response.result);
            }
          }
        } catch (e) {
          console.error(`[MCP ${serverName}] Failed to parse response:`, line, e);
        }
      }
    }
  }

  /**
   * Send a request to an MCP server
   */
  async sendRequest(serverName: string, method: string, params?: Record<string, unknown>): Promise<unknown> {
    const proc = this.processes.get(serverName);
    if (!proc || !proc.stdin) {
      throw new Error(`MCP server ${serverName} is not connected`);
    }

    const id = ++this.requestId;
    const request: McpRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request to ${serverName} timed out`));
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      proc.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Send a notification to an MCP server (no response expected)
   */
  sendNotification(serverName: string, method: string, params?: Record<string, unknown>): void {
    const proc = this.processes.get(serverName);
    if (!proc || !proc.stdin) {
      console.error(`MCP server ${serverName} is not connected`);
      return;
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    proc.stdin.write(JSON.stringify(notification) + '\n');
  }

  /**
   * List available tools from an MCP server
   */
  async listTools(serverName: string): Promise<unknown[]> {
    const result = await this.sendRequest(serverName, 'tools/list', {});
    return (result as { tools: unknown[] })?.tools || [];
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
    try {
      const result = await this.sendRequest(serverName, 'tools/call', {
        name: toolName,
        arguments: args,
      });
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Disconnect from an MCP server
   */
  disconnect(serverName: string): void {
    const proc = this.processes.get(serverName);
    if (proc) {
      proc.kill();
      this.processes.delete(serverName);
      this.buffers.delete(serverName);
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  disconnectAll(): void {
    for (const [serverName] of this.processes) {
      this.disconnect(serverName);
    }
  }

  /**
   * Check if connected to a server
   */
  isConnected(serverName: string): boolean {
    return this.processes.has(serverName);
  }
}

// Singleton instance
let mcpClientInstance: McpClient | null = null;

/**
 * Get the singleton MCP client instance
 */
export function getMcpClient(): McpClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new McpClient();
  }
  return mcpClientInstance;
}
