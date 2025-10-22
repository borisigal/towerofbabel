/**
 * TypeScript interfaces for LLM service layer.
 * Defines request/response types for cultural interpretation using LLM providers.
 */

import { CultureCode } from '@/lib/types/models';

/**
 * Request payload for LLM interpretation.
 * Contains message and cultural context for interpretation.
 */
export interface LLMInterpretationRequest {
  /** The message text to interpret */
  message: string;
  /** Culture code of the message sender */
  senderCulture: CultureCode;
  /** Culture code of the message receiver */
  receiverCulture: CultureCode;
  /** Whether sender and receiver share the same culture */
  sameCulture: boolean;
}

/**
 * Response from LLM interpretation.
 * Contains interpretation insights and detected emotions.
 */
export interface LLMInterpretationResponse {
  /** Simple explanation of what the message really means (2-3 sentences) */
  bottomLine: string;
  /** Cultural context and communication insights (2-4 sentences) */
  culturalContext: string;
  /** Top 3 emotions detected in the message */
  emotions: LLMEmotion[];
}

/**
 * Emotion detected by LLM with intensity scores.
 * Includes sender perspective and optionally receiver perspective for cross-cultural contexts.
 */
export interface LLMEmotion {
  /** Name of the emotion (dynamically detected by LLM) */
  name: string;
  /** Emotion intensity from sender's perspective (0-10 scale) */
  senderScore: number;
  /** Emotion intensity from receiver's perspective (0-10 scale, undefined if same culture) */
  receiverScore?: number;
  /** Optional explanation of the emotion context */
  explanation?: string;
}

/**
 * Metadata about the LLM request/response.
 * Includes cost, performance, and token usage metrics.
 */
export interface LLMMetadata {
  /** Cost of the LLM call in USD */
  costUsd: number;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Total tokens used (prompt + completion) */
  tokenCount: number;
  /** Model identifier used for interpretation */
  model: string;
}

/**
 * LLM provider adapter interface.
 * All LLM providers (Anthropic, OpenAI, xAI, Google) must implement this interface.
 *
 * @example
 * ```typescript
 * const adapter = new AnthropicAdapter();
 * const result = await adapter.interpret({
 *   message: 'I appreciate your hard work on this project.',
 *   senderCulture: 'american',
 *   receiverCulture: 'japanese',
 *   sameCulture: false
 * });
 * console.log(result.interpretation.bottomLine);
 * console.log(`Cost: $${result.metadata.costUsd}`);
 * ```
 */
export interface LLMAdapter {
  /**
   * Interprets a message in its cultural context.
   *
   * @param request - Interpretation request with message and culture context
   * @returns Promise resolving to interpretation and metadata
   * @throws {LLMTimeoutError} If request exceeds timeout
   * @throws {LLMRateLimitError} If rate limit exceeded
   * @throws {LLMAuthError} If API key invalid
   * @throws {LLMParsingError} If response cannot be parsed
   * @throws {LLMProviderError} For other provider errors
   */
  interpret(request: LLMInterpretationRequest): Promise<{
    interpretation: LLMInterpretationResponse;
    metadata: LLMMetadata;
  }>;
}
