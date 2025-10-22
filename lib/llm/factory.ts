/**
 * Factory function for creating LLM provider adapters.
 * Supports multiple providers (Anthropic, OpenAI, xAI, Google) with easy switching via environment variable.
 */

import { LLMAdapter } from './types';
import { AnthropicAdapter } from './anthropicAdapter';

/**
 * Creates an LLM provider adapter based on environment configuration.
 * Provider is selected via LLM_PROVIDER environment variable.
 *
 * @returns LLM adapter instance
 * @throws {Error} If LLM_PROVIDER not set or provider not supported
 * @throws {Error} If required API key for selected provider not set
 *
 * @example
 * ```typescript
 * // In .env.local:
 * // LLM_PROVIDER=anthropic
 * // ANTHROPIC_API_KEY=sk-ant-...
 *
 * const llmProvider = createLLMProvider();
 * const result = await llmProvider.interpret({
 *   message: 'Thank you for your help!',
 *   senderCulture: 'american',
 *   receiverCulture: 'japanese',
 *   sameCulture: false
 * });
 * ```
 */
export function createLLMProvider(): LLMAdapter {
  const provider = process.env.LLM_PROVIDER;

  if (!provider) {
    throw new Error(
      'LLM_PROVIDER environment variable is required. ' +
        'Set it to "anthropic", "openai", "xai", or "google" in your .env.local file. ' +
        'See .env.local.example for details.'
    );
  }

  switch (provider.toLowerCase()) {
    case 'anthropic':
      return new AnthropicAdapter();

    case 'openai':
      throw new Error(
        'OpenAI provider not yet implemented. ' +
          'Story 2.2 implements Anthropic only. ' +
          'Set LLM_PROVIDER=anthropic in .env.local'
      );

    case 'xai':
      throw new Error(
        'xAI provider not yet implemented. ' +
          'Story 2.2 implements Anthropic only. ' +
          'Set LLM_PROVIDER=anthropic in .env.local'
      );

    case 'google':
      throw new Error(
        'Google provider not yet implemented. ' +
          'Story 2.2 implements Anthropic only. ' +
          'Set LLM_PROVIDER=anthropic in .env.local'
      );

    default:
      throw new Error(
        `Unsupported LLM provider: "${provider}". ` +
          'Supported providers: anthropic, openai, xai, google. ' +
          'Update LLM_PROVIDER in .env.local file.'
      );
  }
}
