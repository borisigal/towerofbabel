/**
 * Anthropic Claude adapter for LLM interpretation service.
 * Implements the LLMAdapter interface using Claude Sonnet 4.5 API.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  generateDynamicInterpretationPrompt,
  generateDynamicOutboundPrompt,
  CACHEABLE_SYSTEM_MESSAGE,
} from './prompts';
import {
  LLMAdapter,
  LLMInterpretationRequest,
  InboundInterpretationResponse,
  OutboundInterpretationResponse,
  InterpretationResponse,
  LLMMetadata,
  LLMEmotion,
} from './types';
import { StreamChunk } from './streamTypes';
import {
  LLMTimeoutError,
  LLMRateLimitError,
  LLMAuthError,
  LLMParsingError,
  LLMProviderError,
} from './errors';
import { logger } from '@/lib/observability/logger';

/**
 * Claude Sonnet 4.5 pricing (as of 2025-01).
 * Includes prompt caching pricing tiers.
 */
const ANTHROPIC_PRICING = {
  INPUT_COST_PER_1M: 3.0, // $3.00 per 1M input tokens
  OUTPUT_COST_PER_1M: 15.0, // $15.00 per 1M output tokens
  CACHE_WRITE_COST_PER_1M: 3.75, // $3.75 per 1M cache creation tokens (25% premium)
  CACHE_READ_COST_PER_1M: 0.3, // $0.30 per 1M cache read tokens (90% discount)
};

/**
 * Type guard to check if a value is a plain object.
 *
 * @param value - Value to check
 * @returns True if value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses and validates LLM response JSON.
 * Handles markdown code blocks and validates structure based on mode.
 *
 * @param rawResponse - Raw text response from Claude
 * @param mode - Interpretation mode: 'inbound' or 'outbound'
 * @param sameCulture - Whether interpretation is same-culture (affects validation)
 * @returns Validated interpretation response
 * @throws {LLMParsingError} If response cannot be parsed or is invalid
 */
function parseInterpretationResponse(
  rawResponse: string,
  mode: 'inbound' | 'outbound',
  sameCulture: boolean
): InterpretationResponse {
  // Step 1: Extract JSON from markdown code blocks if present
  let jsonString = rawResponse.trim();
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonString = codeBlockMatch[1].trim();
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new LLMParsingError('Failed to parse response as JSON', {
      rawResponse,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 3: Validate structure
  if (!isObject(parsed)) {
    throw new LLMParsingError('Response is not an object', { parsed });
  }

  // Step 4: Route to appropriate validation function
  if (mode === 'inbound') {
    return validateInboundResponse(parsed, sameCulture);
  } else {
    return validateOutboundResponse(parsed, sameCulture);
  }
}

/**
 * Validates inbound interpretation response structure.
 *
 * @param parsed - Parsed JSON response
 * @param sameCulture - Whether sender and receiver share the same culture
 * @returns Validated inbound interpretation response
 * @throws {LLMParsingError} If response format is invalid
 */
function validateInboundResponse(
  parsed: Record<string, unknown>,
  sameCulture: boolean
): InboundInterpretationResponse {
  // Validate required fields
  if (typeof parsed.bottomLine !== 'string' || parsed.bottomLine.trim() === '') {
    throw new LLMParsingError('Missing or empty bottomLine field', { parsed });
  }

  if (
    typeof parsed.culturalContext !== 'string' ||
    parsed.culturalContext.trim() === ''
  ) {
    throw new LLMParsingError('Missing or empty culturalContext field', {
      parsed,
    });
  }

  if (!Array.isArray(parsed.emotions) || parsed.emotions.length === 0) {
    throw new LLMParsingError('Missing or empty emotions array', { parsed });
  }

  // Validate emotions
  const emotions: LLMEmotion[] = validateEmotions(
    parsed.emotions,
    sameCulture
  );

  return {
    bottomLine: parsed.bottomLine,
    culturalContext: parsed.culturalContext,
    emotions: emotions.slice(0, 3),
  };
}

/**
 * Validates outbound optimization response structure.
 *
 * @param parsed - Parsed JSON response
 * @param sameCulture - Whether sender and receiver share the same culture
 * @returns Validated outbound interpretation response
 * @throws {LLMParsingError} If response format is invalid
 */
function validateOutboundResponse(
  parsed: Record<string, unknown>,
  sameCulture: boolean
): OutboundInterpretationResponse {
  // Validate originalAnalysis
  if (
    typeof parsed.originalAnalysis !== 'string' ||
    parsed.originalAnalysis.trim() === ''
  ) {
    throw new LLMParsingError(
      'Missing or invalid originalAnalysis field in outbound response',
      { parsed }
    );
  }

  // Validate suggestions array
  if (!Array.isArray(parsed.suggestions)) {
    throw new LLMParsingError(
      'Missing or invalid suggestions array in outbound response',
      { parsed }
    );
  }

  if (parsed.suggestions.length < 3 || parsed.suggestions.length > 5) {
    throw new LLMParsingError('Suggestions array must contain 3-5 items', {
      parsed,
      suggestionsCount: parsed.suggestions.length,
    });
  }

  for (let i = 0; i < parsed.suggestions.length; i++) {
    const suggestion = parsed.suggestions[i];
    if (typeof suggestion !== 'string' || suggestion.trim() === '') {
      throw new LLMParsingError(
        `Suggestion at index ${i} must be a non-empty string`,
        { suggestion }
      );
    }
  }

  // Validate optimizedMessage
  if (
    typeof parsed.optimizedMessage !== 'string' ||
    parsed.optimizedMessage.trim() === ''
  ) {
    throw new LLMParsingError(
      'Missing or invalid optimizedMessage field in outbound response',
      { parsed }
    );
  }

  // Validate emotions array
  if (!Array.isArray(parsed.emotions) || parsed.emotions.length === 0) {
    throw new LLMParsingError(
      'Missing or empty emotions array in outbound response',
      { parsed }
    );
  }

  // Validate emotions
  const emotions: LLMEmotion[] = validateEmotions(
    parsed.emotions,
    sameCulture
  );

  return {
    originalAnalysis: parsed.originalAnalysis,
    suggestions: parsed.suggestions as string[],
    optimizedMessage: parsed.optimizedMessage,
    emotions: emotions.slice(0, 3),
  };
}

/**
 * Validates emotions array structure.
 * Shared by both inbound and outbound validation.
 *
 * @param emotions - Array of emotion objects to validate
 * @param sameCulture - Whether sender and receiver share the same culture
 * @returns Validated emotions array
 * @throws {LLMParsingError} If emotions format is invalid
 */
function validateEmotions(
  emotions: unknown[],
  sameCulture: boolean
): LLMEmotion[] {
  return emotions.map((emotion: unknown, index: number) => {
    if (!isObject(emotion)) {
      throw new LLMParsingError(`Emotion at index ${index} is not an object`, {
        emotion,
      });
    }

    if (typeof emotion.name !== 'string' || emotion.name.trim() === '') {
      throw new LLMParsingError(`Emotion at index ${index} missing name`, {
        emotion,
      });
    }

    if (
      typeof emotion.senderScore !== 'number' ||
      emotion.senderScore < 0 ||
      emotion.senderScore > 10
    ) {
      throw new LLMParsingError(
        `Emotion at index ${index} has invalid senderScore`,
        { emotion }
      );
    }

    // receiverScore is required for cross-culture, optional for same-culture
    if (!sameCulture) {
      if (
        typeof emotion.receiverScore !== 'number' ||
        emotion.receiverScore < 0 ||
        emotion.receiverScore > 10
      ) {
        throw new LLMParsingError(
          `Emotion at index ${index} has invalid receiverScore (required for cross-culture)`,
          { emotion }
        );
      }
    } else if (emotion.receiverScore !== undefined) {
      if (
        typeof emotion.receiverScore !== 'number' ||
        emotion.receiverScore < 0 ||
        emotion.receiverScore > 10
      ) {
        throw new LLMParsingError(
          `Emotion at index ${index} has invalid receiverScore`,
          { emotion }
        );
      }
    }

    return {
      name: emotion.name,
      senderScore: emotion.senderScore,
      receiverScore: emotion.receiverScore,
      explanation:
        typeof emotion.explanation === 'string'
          ? emotion.explanation
          : undefined,
    };
  });
}

// Note: The legacy calculateAnthropicCost function has been removed.
// All cost calculations now use calculateAnthropicCostWithCaching for cache-aware pricing.

/**
 * Calculates cost of Anthropic API call with prompt caching.
 *
 * IMPORTANT: Anthropic's response.usage.input_tokens is the TOTAL input tokens,
 * which INCLUDES any cache_read_input_tokens. We must subtract to avoid
 * double-counting cached tokens.
 *
 * Verification: input_tokens >= cache_read_input_tokens (always true)
 * If this assertion fails, Anthropic changed their API response format.
 *
 * @param inputTokens - Total input tokens (includes cached)
 * @param outputTokens - Number of output tokens
 * @param cacheCreationTokens - Number of tokens written to cache (first request)
 * @param cacheReadTokens - Number of tokens served from cache
 * @returns Cost in USD
 */
function calculateAnthropicCostWithCaching(
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0
): number {
  // Sanity check - cache read tokens should never exceed input tokens
  if (cacheReadTokens > inputTokens) {
    logger.warn(
      {
        inputTokens,
        cacheReadTokens,
      },
      'Unexpected: cacheReadTokens > inputTokens - Anthropic API may have changed'
    );
  }

  // Regular input tokens = total - cached (cached billed separately at discount)
  // Use Math.max to prevent negative values if API behavior changes
  const regularInputTokens = Math.max(0, inputTokens - cacheReadTokens);
  const inputCost =
    (regularInputTokens / 1_000_000) * ANTHROPIC_PRICING.INPUT_COST_PER_1M;

  // Output tokens (no caching)
  const outputCost =
    (outputTokens / 1_000_000) * ANTHROPIC_PRICING.OUTPUT_COST_PER_1M;

  // Cache creation tokens (25% premium)
  const cacheWriteCost =
    (cacheCreationTokens / 1_000_000) * ANTHROPIC_PRICING.CACHE_WRITE_COST_PER_1M;

  // Cache read tokens (90% discount)
  const cacheReadCost =
    (cacheReadTokens / 1_000_000) * ANTHROPIC_PRICING.CACHE_READ_COST_PER_1M;

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

/**
 * Anthropic Claude adapter implementation.
 * Uses Claude Sonnet 4.5 for cultural interpretation.
 */
export class AnthropicAdapter implements LLMAdapter {
  private client: Anthropic;
  private model: string;
  private timeout: number;

  /**
   * Creates an Anthropic adapter instance.
   *
   * @throws {Error} If ANTHROPIC_API_KEY environment variable not set
   */
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required. ' +
          'Set it in .env.local file. ' +
          'Get your API key from https://console.anthropic.com/'
      );
    }

    this.client = new Anthropic({ apiKey });
    this.model =
      process.env.LLM_MODEL || 'claude-sonnet-4-5-20250929';
    // Default timeout: 30 seconds (configurable via LLM_TIMEOUT_MS env var)
    this.timeout = parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);
  }

  /**
   * Interprets a message using Claude Sonnet 4.5 or optimizes outbound message.
   * Handles prompt generation, API call, response parsing, and error handling.
   * Uses prompt caching with separate system message for cost optimization.
   *
   * @param request - Interpretation request with message and culture context
   * @param mode - Interpretation mode: 'inbound' or 'outbound'
   * @returns Promise resolving to interpretation and metadata
   * @throws {LLMTimeoutError} If request exceeds 10 seconds
   * @throws {LLMRateLimitError} If rate limit exceeded (429)
   * @throws {LLMAuthError} If API key invalid (401)
   * @throws {LLMParsingError} If response cannot be parsed
   * @throws {LLMProviderError} For other API errors
   */
  async interpret(
    request: LLMInterpretationRequest,
    mode: 'inbound' | 'outbound' = 'inbound'
  ): Promise<{
    interpretation: InterpretationResponse;
    metadata: LLMMetadata;
  }> {
    const startTime = Date.now();

    // Generate dynamic prompt (excludes system message for caching)
    const dynamicPrompt =
      mode === 'inbound'
        ? generateDynamicInterpretationPrompt(
            request.message,
            request.senderCulture,
            request.receiverCulture,
            request.sameCulture
          )
        : generateDynamicOutboundPrompt(
            request.message,
            request.senderCulture,
            request.receiverCulture,
            request.sameCulture
          );

    // Log before LLM call
    logger.info(
      {
        timestamp: new Date().toISOString(),
        mode,
        culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
        characterCount: request.message.length,
        sameCulture: request.sameCulture,
        promptCaching: true,
      },
      `Calling Claude for ${mode} processing (with prompt caching)`
    );

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Call Anthropic API with prompt caching
      // System message is cached (static), user message is dynamic
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 1500,
          temperature: 0.7,
          system: [
            {
              type: 'text',
              text: CACHEABLE_SYSTEM_MESSAGE,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [
            {
              role: 'user',
              content: dynamicPrompt,
            },
          ],
        },
        {
          signal: controller.signal as AbortSignal,
        }
      );

      clearTimeout(timeoutId);

      // Extract response text
      const content = response.content[0];
      if (!content) {
        throw new LLMProviderError('Empty response from Claude', 500);
      }

      if (content.type !== 'text') {
        throw new LLMProviderError('Unexpected response type from Claude', 500, {
          contentType: content.type,
        });
      }

      const rawResponse = content.text;

      // Parse and validate response based on mode
      const interpretation = parseInterpretationResponse(
        rawResponse,
        mode,
        request.sameCulture
      );

      // Extract cache metrics from response
      const usage = response.usage;
      const cacheCreationTokens =
        (usage as { cache_creation_input_tokens?: number }).cache_creation_input_tokens || 0;
      const cacheReadTokens =
        (usage as { cache_read_input_tokens?: number }).cache_read_input_tokens || 0;

      // Calculate cost with cache-aware pricing
      const responseTimeMs = Date.now() - startTime;
      const costUsd = calculateAnthropicCostWithCaching(
        usage.input_tokens,
        usage.output_tokens,
        cacheCreationTokens,
        cacheReadTokens
      );

      const metadata: LLMMetadata = {
        costUsd,
        responseTimeMs,
        tokenCount: usage.input_tokens + usage.output_tokens,
        model: this.model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens,
        cacheCreationTokens,
      };

      // Log success with cache metrics
      logger.info(
        {
          timestamp: new Date().toISOString(),
          responseTimeMs,
          costUsd,
          tokenCount: metadata.tokenCount,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheCreationTokens,
          cacheReadTokens,
          cacheHit: cacheReadTokens > 0,
          cacheHitRate:
            usage.input_tokens > 0
              ? ((cacheReadTokens / usage.input_tokens) * 100).toFixed(1) + '%'
              : '0%',
          model: this.model,
          success: true,
        },
        'Claude interpretation successful (with cache metrics)'
      );

      return { interpretation, metadata };
    } catch (error) {
      // Handle different error types
      if (error instanceof LLMParsingError) {
        logger.error({
          timestamp: new Date().toISOString(),
          errorType: 'LLMParsingError',
          errorMessage: error.message,
          culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
          success: false,
        }, 'Claude parsing error');
        throw error;
      }

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error({
          timestamp: new Date().toISOString(),
          errorType: 'LLMTimeoutError',
          errorMessage: 'Request timed out',
          culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
          success: false,
        }, 'Claude timeout error');
        throw new LLMTimeoutError();
      }

      // Handle Anthropic API errors
      if (error instanceof Anthropic.APIError) {
        logger.error({
          timestamp: new Date().toISOString(),
          errorType: error.constructor.name,
          errorMessage: error.message,
          statusCode: error.status,
          culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
          success: false,
        }, 'Claude API error');

        if (error.status === 401) {
          throw new LLMAuthError();
        }

        if (error.status === 429) {
          const retryAfter =
            error.headers?.['retry-after'] !== undefined
              ? parseInt(error.headers['retry-after'] as string, 10)
              : undefined;
          throw new LLMRateLimitError(retryAfter);
        }

        throw new LLMProviderError(error.message, error.status);
      }

      // Generic error
      logger.error({
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
        success: false,
      }, 'Claude generic error');

      throw new LLMProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        { error }
      );
    }
  }

  /**
   * Interprets a message using Claude with streaming response.
   * Yields text chunks as they are received, then yields a final 'complete' chunk
   * with the parsed interpretation and metadata.
   * Uses prompt caching with separate system message for cost optimization.
   *
   * NOTE: Uses yield for final result (not return) because AsyncGenerator return
   * values cannot be captured with for-await loops. The consumer should check
   * chunk.type to identify the complete chunk.
   *
   * @param request - Interpretation request with message and culture context
   * @param mode - Interpretation mode: 'inbound' or 'outbound'
   * @yields StreamTextChunk for each text fragment, then StreamCompleteChunk at end
   * @throws {LLMTimeoutError} If request exceeds timeout
   * @throws {LLMProviderError} For API errors during streaming
   */
  async *interpretStream(
    request: LLMInterpretationRequest,
    mode: 'inbound' | 'outbound' = 'inbound'
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const startTime = Date.now();

    // Generate dynamic prompt (excludes system message for caching)
    const dynamicPrompt =
      mode === 'inbound'
        ? generateDynamicInterpretationPrompt(
            request.message,
            request.senderCulture,
            request.receiverCulture,
            request.sameCulture
          )
        : generateDynamicOutboundPrompt(
            request.message,
            request.senderCulture,
            request.receiverCulture,
            request.sameCulture
          );

    // Log before streaming call
    logger.info(
      {
        timestamp: new Date().toISOString(),
        mode,
        culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
        characterCount: request.message.length,
        sameCulture: request.sameCulture,
        streaming: true,
        promptCaching: true,
      },
      `Calling Claude for ${mode} processing (streaming with prompt caching)`
    );

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Call Anthropic API with streaming and prompt caching enabled
      // System message is cached (static), user message is dynamic
      const stream = this.client.messages.stream(
        {
          model: this.model,
          max_tokens: 1500,
          temperature: 0.7,
          system: [
            {
              type: 'text',
              text: CACHEABLE_SYSTEM_MESSAGE,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: dynamicPrompt }],
        },
        {
          signal: controller.signal as AbortSignal,
        }
      );

      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let cacheCreationTokens = 0;
      let cacheReadTokens = 0;

      // Yield text chunks as they arrive
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          fullText += event.delta.text;
          yield { type: 'text', text: event.delta.text };
        }

        if (event.type === 'message_delta' && event.usage) {
          outputTokens = event.usage.output_tokens;
        }

        // Extract input tokens and cache metrics from message_start event
        if (event.type === 'message_start' && event.message.usage) {
          inputTokens = event.message.usage.input_tokens;
          // Extract cache metrics from usage (Anthropic includes them in message_start)
          const usage = event.message.usage as {
            input_tokens: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
          };
          cacheCreationTokens = usage.cache_creation_input_tokens || 0;
          cacheReadTokens = usage.cache_read_input_tokens || 0;
        }
      }

      clearTimeout(timeoutId);

      // Parse final response using existing helper function (file-scoped)
      const interpretation = parseInterpretationResponse(
        fullText,
        mode,
        request.sameCulture
      );

      // Calculate cost with cache-aware pricing
      const costUsd = calculateAnthropicCostWithCaching(
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens
      );

      const metadata: LLMMetadata = {
        costUsd,
        responseTimeMs: Date.now() - startTime,
        tokenCount: inputTokens + outputTokens,
        model: this.model,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
      };

      // Log success with cache metrics
      logger.info(
        {
          timestamp: new Date().toISOString(),
          responseTimeMs: metadata.responseTimeMs,
          costUsd: metadata.costUsd,
          tokenCount: metadata.tokenCount,
          inputTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens,
          cacheHit: cacheReadTokens > 0,
          cacheHitRate:
            inputTokens > 0
              ? ((cacheReadTokens / inputTokens) * 100).toFixed(1) + '%'
              : '0%',
          model: this.model,
          streaming: true,
          success: true,
        },
        'Claude streaming interpretation successful (with cache metrics)'
      );

      // Yield complete chunk (NOT return - allows consumer to use for-await)
      yield { type: 'complete', interpretation, metadata };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(
          {
            timestamp: new Date().toISOString(),
            errorType: 'LLMTimeoutError',
            errorMessage: 'Streaming request timed out',
            culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
            streaming: true,
            success: false,
          },
          'Claude streaming timeout error'
        );
        throw new LLMTimeoutError();
      }

      // Handle Anthropic API errors
      if (error instanceof Anthropic.APIError) {
        logger.error(
          {
            timestamp: new Date().toISOString(),
            errorType: error.constructor.name,
            errorMessage: error.message,
            statusCode: error.status,
            culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
            streaming: true,
            success: false,
          },
          'Claude streaming API error'
        );

        if (error.status === 401) {
          throw new LLMAuthError();
        }

        if (error.status === 429) {
          const retryAfter =
            error.headers?.['retry-after'] !== undefined
              ? parseInt(error.headers['retry-after'] as string, 10)
              : undefined;
          throw new LLMRateLimitError(retryAfter);
        }

        throw new LLMProviderError(error.message, error.status);
      }

      // Handle parsing errors
      if (error instanceof LLMParsingError) {
        logger.error(
          {
            timestamp: new Date().toISOString(),
            errorType: 'LLMParsingError',
            errorMessage: error.message,
            culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
            streaming: true,
            success: false,
          },
          'Claude streaming parsing error'
        );
        throw error;
      }

      // Generic error
      logger.error(
        {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
          streaming: true,
          success: false,
        },
        'Claude streaming generic error'
      );

      throw new LLMProviderError(
        error instanceof Error ? error.message : 'Unknown streaming error',
        500,
        { error }
      );
    }
  }
}
