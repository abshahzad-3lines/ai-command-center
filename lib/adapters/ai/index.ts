// AI adapter factory

import { OpenAIAdapter } from './openai.adapter';
import type { AIAdapter, AIAdapterConfig } from './types';

export type AIProvider = 'openai' | 'local' | 'anthropic';

export function createAIAdapter(
  provider: AIProvider,
  config?: AIAdapterConfig
): AIAdapter {
  switch (provider) {
    case 'openai':
      return new OpenAIAdapter(config);
    case 'local':
      // Local AI uses OpenAI-compatible API format
      // Just change the baseUrl
      return new OpenAIAdapter({
        ...config,
        baseUrl: config?.baseUrl || 'http://localhost:11434/v1',
      });
    case 'anthropic':
      // TODO: Implement Anthropic adapter
      throw new Error('Anthropic adapter not implemented yet');
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export { OpenAIAdapter };
export type { AIAdapter, AIAdapterConfig } from './types';
