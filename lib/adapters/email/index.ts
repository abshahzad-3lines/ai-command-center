// Email adapter factory

import { OutlookAdapter } from './outlook.adapter';
import type { EmailAdapter, EmailAdapterConfig } from './types';

export type EmailProvider = 'outlook' | 'gmail' | 'imap';

export function createEmailAdapter(
  provider: EmailProvider,
  config?: EmailAdapterConfig
): EmailAdapter {
  switch (provider) {
    case 'outlook':
      return new OutlookAdapter(config);
    case 'gmail':
      // TODO: Implement Gmail adapter
      throw new Error('Gmail adapter not implemented yet');
    case 'imap':
      // TODO: Implement IMAP adapter
      throw new Error('IMAP adapter not implemented yet');
    default:
      throw new Error(`Unknown email provider: ${provider}`);
  }
}

export { OutlookAdapter };
export type { EmailAdapter, EmailAdapterConfig } from './types';
