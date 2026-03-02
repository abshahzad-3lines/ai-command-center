// Odoo JSON-RPC Client - Handles communication with Odoo via JSON-RPC
// Uses the external /jsonrpc endpoint for API calls

import type { OdooToolResult } from '@/types/odoo';

export interface OdooJsonRpcClientConfig {
  baseUrl: string;
  database: string;
  username: string;
  password: string;
  timeout?: number;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: {
    service: string;
    method: string;
    args: unknown[];
  };
  id: number;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: {
      message?: string;
      debug?: string;
    };
  };
}

export class OdooJsonRpcClient {
  private config: OdooJsonRpcClientConfig;
  private requestId: number = 0;
  private uid: number | null = null;

  constructor(config: OdooJsonRpcClientConfig) {
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

    // Use the external /jsonrpc endpoint for authentication
    const uid = await this.jsonRpc<number | false>('common', 'authenticate', [
      this.config.database,
      this.config.username,
      this.config.password,
      {},
    ]);

    if (uid === false || typeof uid !== 'number') {
      throw new Error('Authentication failed');
    }

    this.uid = uid;
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
      const result = await this.jsonRpc<{ server_version: string }>('common', 'version', []);
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

    const kwargs: Record<string, unknown> = {
      fields,
      limit: options?.limit || 80,
      offset: options?.offset || 0,
    };

    if (options?.order) {
      kwargs.order = options.order;
    }

    const result = await this.executeKw<T[]>(model, 'search_read', [domain], kwargs);
    return result || [];
  }

  /**
   * Read specific records by IDs
   */
  async read<T = unknown>(model: string, ids: number[], fields: string[]): Promise<T[]> {
    await this.authenticate();

    const result = await this.executeKw<T[]>(model, 'read', [ids, fields]);
    return result || [];
  }

  /**
   * Call a method on a model (execute_kw)
   */
  async callKw<T = unknown>(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<T> {
    await this.authenticate();

    const result = await this.executeKw<T>(model, method, args, kwargs);
    return result as T;
  }

  /**
   * Execute execute_kw on Odoo
   */
  private async executeKw<T = unknown>(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<T | null> {
    const executeArgs: unknown[] = [
      this.config.database,
      this.uid,
      this.config.password,
      model,
      method,
      args,
    ];

    // Add kwargs if provided
    if (kwargs && Object.keys(kwargs).length > 0) {
      executeArgs.push(kwargs);
    }

    return this.jsonRpc<T>('object', 'execute_kw', executeArgs);
  }

  /**
   * Execute a workflow action on a record
   */
  async executeAction(model: string, action: string, ids: number[]): Promise<OdooToolResult> {
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
   * Make a JSON-RPC request to Odoo's /jsonrpc endpoint
   */
  private async jsonRpc<T>(service: string, method: string, args: unknown[]): Promise<T | null> {
    const url = `${this.config.baseUrl}/jsonrpc`;
    const requestId = ++this.requestId;

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service,
        method,
        args,
      },
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
        const errorMessage = json.error.data?.message || json.error.message || 'RPC Error';
        throw new Error(errorMessage);
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
    return !!(this.config.baseUrl && this.config.database && this.config.username && this.config.password);
  }
}
