/**
 * @fileoverview AI adapter factory
 * Creates AI adapters for different providers (OpenAI, Anthropic, Local)
 */

import { OpenAIAdapter } from './openai.adapter';
import { ClaudeAdapter } from './claude.adapter';
import type { AIAdapter, AIAdapterConfig } from './types';

export type AIProvider = 'openai' | 'local' | 'anthropic';

/**
 * Create an AI adapter for the specified provider
 * @param provider - The AI provider to use
 * @param config - Optional configuration
 * @returns An AI adapter instance
 */
export function createAIAdapter(
  provider: AIProvider,
  config?: AIAdapterConfig
): AIAdapter {
  switch (provider) {
    case 'openai':
      return new OpenAIAdapter(config);
    case 'local':
      // Local AI uses OpenAI-compatible API format
      return new OpenAIAdapter({
        ...config,
        baseUrl: config?.baseUrl || 'http://localhost:11434/v1',
      });
    case 'anthropic':
      return new ClaudeAdapter(config);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Create a Claude adapter with tool calling support
 * Use this when you need tool calling capabilities
 */
export function createClaudeAdapter(config?: AIAdapterConfig): ClaudeAdapter {
  return new ClaudeAdapter(config);
}

export { OpenAIAdapter } from './openai.adapter';
export { ClaudeAdapter } from './claude.adapter';
export type { AIAdapter, AIAdapterConfig } from './types';
export type { ClaudeTool, ToolUseBlock, ToolResultBlock, ChatWithToolsResponse } from './claude.adapter';
