// Odoo adapter factory and exports

export * from './types';
export * from './odoo.adapter';
export * from './mcp-client';

import { OdooAdapterImpl } from './odoo.adapter';
import type { OdooAdapter, OdooAdapterConfig } from './types';
import { config } from '@/config';

/**
 * Create an Odoo adapter instance
 */
export function createOdooAdapter(customConfig?: Partial<OdooAdapterConfig>): OdooAdapter {
  const adapterConfig: OdooAdapterConfig = {
    baseUrl: customConfig?.baseUrl || config.odoo?.baseUrl || '',
    database: customConfig?.database || config.odoo?.database || '',
    apiKey: customConfig?.apiKey || config.odoo?.apiKey || '',
    timeout: customConfig?.timeout || 30000,
  };

  return new OdooAdapterImpl(adapterConfig);
}

// Singleton instance for server-side use
let odooAdapterInstance: OdooAdapter | null = null;

export function getOdooAdapter(): OdooAdapter {
  if (!odooAdapterInstance) {
    odooAdapterInstance = createOdooAdapter();
  }
  return odooAdapterInstance;
}

export function resetOdooAdapter(): void {
  odooAdapterInstance = null;
}
