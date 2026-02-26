// Odoo MCP Client - Handles communication with Odoo via JSON-RPC

import type { McpToolResult } from '@/types/odoo';

export interface OdooMcpClientConfig {
  baseUrl: string;
  database: string;
  apiKey: string;
  timeout?: number;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
  id: number;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class OdooMcpClient {
  private config: OdooMcpClientConfig;
  private requestId: number = 0;
  private uid: number | null = null;

  constructor(config: OdooMcpClientConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Authenticate with Odoo and get user ID
   */
  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    const response = await this.jsonRpc<number | false>('/web/session/authenticate', {
      db: this.config.database,
      login: 'api', // API key authentication
      password: this.config.apiKey,
    });

    if (response === false || typeof response !== 'number') {
      throw new Error('Authentication failed');
    }

    this.uid = response;
    return this.uid;
  }

  /**
   * Check if connection is valid
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get server version info
   */
  async getServerInfo(): Promise<{ version: string; database: string } | null> {
    try {
      const result = await this.jsonRpc<{ server_version: string }>('/web/webclient/version_info', {});
      return {
        version: result?.server_version || 'unknown',
        database: this.config.database,
      };
    } catch {
      return null;
    }
  }

  /**
   * Search and read records from Odoo
   */
  async searchRead<T = unknown>(
    model: string,
    domain: unknown[],
    fields: string[],
    options?: { limit?: number; offset?: number; order?: string }
  ): Promise<T[]> {
    await this.authenticate();

    const result = await this.jsonRpc<{ records: T[] }>('/web/dataset/search_read', {
      model,
      domain,
      fields,
      limit: options?.limit || 80,
      offset: options?.offset || 0,
      sort: options?.order || 'id desc',
    });

    return result?.records || [];
  }

  /**
   * Read specific records by IDs
   */
  async read<T = unknown>(model: string, ids: number[], fields: string[]): Promise<T[]> {
    await this.authenticate();

    const result = await this.callKw<T[]>(model, 'read', [ids, fields]);
    return result || [];
  }

  /**
   * Call a method on a model (execute_kw equivalent)
   */
  async callKw<T = unknown>(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<T> {
    await this.authenticate();

    const result = await this.jsonRpc<T>('/web/dataset/call_kw', {
      model,
      method,
      args,
      kwargs: kwargs || {},
    });

    return result as T;
  }

  /**
   * Execute a workflow action on a record
   */
  async executeAction(model: string, action: string, ids: number[]): Promise<McpToolResult> {
    try {
      await this.callKw(model, action, [ids]);
      return {
        success: true,
        message: `Action '${action}' executed successfully`,
        data: { model, action, ids },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute action '${action}'`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a new record
   */
  async create(model: string, values: Record<string, unknown>): Promise<number | null> {
    try {
      const id = await this.callKw<number>(model, 'create', [values]);
      return id;
    } catch {
      return null;
    }
  }

  /**
   * Update existing records
   */
  async write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean> {
    try {
      await this.callKw<boolean>(model, 'write', [ids, values]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make a JSON-RPC request to Odoo
   */
  private async jsonRpc<T>(endpoint: string, params: Record<string, unknown>): Promise<T | null> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const requestId = ++this.requestId;

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      params,
      id: requestId,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = (await response.json()) as JsonRpcResponse<T>;

      if (json.error) {
        throw new Error(json.error.message || 'RPC Error');
      }

      return json.result ?? null;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Get configuration status
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.database && this.config.apiKey);
  }
}
