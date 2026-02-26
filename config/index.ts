// Application configuration

export const config = {
  // Microsoft Graph (Outlook)
  microsoft: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    scopes: ['User.Read', 'Mail.Read', 'Mail.Send', 'Mail.ReadWrite'],
  },

  // AI Configuration
  ai: {
    provider: (process.env.AI_PROVIDER || 'openai') as 'openai' | 'local',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
    local: {
      baseUrl: process.env.LOCAL_AI_URL || 'http://localhost:11434/v1',
      model: process.env.LOCAL_AI_MODEL || 'llama2',
    },
  },

  // Odoo ERP Configuration
  odoo: {
    baseUrl: process.env.ODOO_URL || '',
    database: process.env.ODOO_DATABASE || '',
    apiKey: process.env.ODOO_API_KEY || '',
    fetchLimit: 10,
  },

  // App settings
  app: {
    name: 'AI Command Center',
    emailFetchLimit: 10,
    odooFetchLimit: 10,
  },
} as const;

export type Config = typeof config;
