// Email adapter factory

import { OutlookAdapter } from './outlook.adapter';
import type { EmailAdapter, EmailAdapterConfig } from './types';

export type EmailProvider = 'outlook';

export function createEmailAdapter(
  provider: EmailProvider,
  config?: EmailAdapterConfig
): EmailAdapter {
  switch (provider) {
    case 'outlook':
      return new OutlookAdapter(config);
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }
}

export { OutlookAdapter };
export type { EmailAdapter, EmailAdapterConfig } from './types';
