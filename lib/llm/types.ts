/**
 * TypeScript interfaces for LLM service layer.
 * Defines request/response types for cultural interpretation using LLM providers.
 */

import { CultureCode } from '@/lib/types/models';
import { StreamChunk } from './streamTypes';

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
 * Response from LLM inbound interpretation.
 * Contains interpretation insights and detected emotions.
 */
export interface InboundInterpretationResponse {
  /** Simple explanation of what the message really means (2-3 sentences) */
  bottomLine: string;
  /** Cultural context and communication insights (2-4 sentences) */
  culturalContext: string;
  /** Top 3 emotions detected in the message */
  emotions: LLMEmotion[];
}

/**
 * Response from LLM outbound optimization.
 * Contains optimization suggestions and improved message version.
 */
export interface OutboundInterpretationResponse {
  /** How the message will be perceived by the receiver (2-3 sentences) */
  originalAnalysis: string;
  /** List of 3-5 specific improvements to make */
  suggestions: string[];
  /** Culturally optimized version of the message */
  optimizedMessage: string;
  /** Top 3 emotions detected in the original message */
  emotions: LLMEmotion[];
}

/**
 * Union type for interpretation responses.
 * Can be either inbound interpretation or outbound optimization.
 */
export type InterpretationResponse =
  | InboundInterpretationResponse
  | OutboundInterpretationResponse;

/**
 * @deprecated Use InboundInterpretationResponse instead
 * Legacy type alias for backward compatibility.
 */
export type LLMInterpretationResponse = InboundInterpretationResponse;

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
 * Includes cost, performance, token usage, and cache metrics.
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
  /** Input tokens (for detailed tracking) */
  inputTokens?: number;
  /** Output tokens (for detailed tracking) */
  outputTokens?: number;
  /** Tokens served from cache (prompt caching benefit - 90% discount) */
  cacheReadTokens?: number;
  /** Tokens written to cache (first request for this prompt - 25% premium) */
  cacheCreationTokens?: number;
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
 *   sameCulture: false,
 *   mode: 'inbound'
 * });
 * console.log(result.interpretation.bottomLine);
 * console.log(`Cost: $${result.metadata.costUsd}`);
 * ```
 */
export interface LLMAdapter {
  /**
   * Interprets a message in its cultural context or optimizes outbound message.
   *
   * @param request - Interpretation request with message and culture context
   * @param mode - Interpretation mode: 'inbound' (analyze received message) or 'outbound' (optimize message to send)
   * @returns Promise resolving to interpretation and metadata
   * @throws {LLMTimeoutError} If request exceeds timeout
   * @throws {LLMRateLimitError} If rate limit exceeded
   * @throws {LLMAuthError} If API key invalid
   * @throws {LLMParsingError} If response cannot be parsed
   * @throws {LLMProviderError} For other provider errors
   */
  interpret(
    request: LLMInterpretationRequest,
    mode: 'inbound' | 'outbound'
  ): Promise<{
    interpretation: InterpretationResponse;
    metadata: LLMMetadata;
  }>;

  /**
   * Streaming interpretation method.
   * Yields text chunks as they are received, then yields a final 'complete' chunk
   * with the parsed interpretation and metadata.
   *
   * NOTE: Uses yield for final result (not return) because AsyncGenerator return
   * values cannot be captured with for-await loops. The consumer should check
   * chunk.type to identify the complete chunk.
   *
   * @param request - Interpretation request with message and culture context
   * @param mode - Interpretation mode: 'inbound' or 'outbound'
   * @yields StreamTextChunk for each text fragment, then StreamCompleteChunk at end
   */
  interpretStream?(
    request: LLMInterpretationRequest,
    mode: 'inbound' | 'outbound'
  ): AsyncGenerator<StreamChunk, void, unknown>;
}
