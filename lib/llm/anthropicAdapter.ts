/**
 * Anthropic Claude adapter for LLM interpretation service.
 * Implements the LLMAdapter interface using Claude Sonnet 4.5 API.
 */

import Anthropic from '@anthropic-ai/sdk';
import { generateInterpretationPrompt } from './prompts';
import {
  LLMAdapter,
  LLMInterpretationRequest,
  LLMInterpretationResponse,
  LLMMetadata,
  LLMEmotion,
} from './types';
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
 * Used for cost calculation per interpretation.
 */
const ANTHROPIC_PRICING = {
  INPUT_COST_PER_1M: 3.0, // $3.00 per 1M input tokens
  OUTPUT_COST_PER_1M: 15.0, // $15.00 per 1M output tokens
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
 * Handles markdown code blocks and validates structure.
 *
 * @param rawResponse - Raw text response from Claude
 * @param sameCulture - Whether interpretation is same-culture (affects validation)
 * @returns Validated interpretation response
 * @throws {LLMParsingError} If response cannot be parsed or is invalid
 */
function parseInterpretationResponse(
  rawResponse: string,
  sameCulture: boolean
): LLMInterpretationResponse {
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

  // Step 4: Validate required fields
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

  // Step 5: Validate emotions
  const emotions: LLMEmotion[] = (parsed.emotions as unknown[]).map(
    (emotion: unknown, index: number) => {
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
    }
  );

  // Step 6: Return validated response (ensure only top 3 emotions)
  return {
    bottomLine: parsed.bottomLine,
    culturalContext: parsed.culturalContext,
    emotions: emotions.slice(0, 3),
  };
}

/**
 * Calculates cost of Anthropic API call based on token usage.
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
function calculateAnthropicCost(
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost =
    (inputTokens / 1_000_000) * ANTHROPIC_PRICING.INPUT_COST_PER_1M;
  const outputCost =
    (outputTokens / 1_000_000) * ANTHROPIC_PRICING.OUTPUT_COST_PER_1M;

  return inputCost + outputCost;
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
   * Interprets a message using Claude Sonnet 4.5.
   * Handles prompt generation, API call, response parsing, and error handling.
   *
   * @param request - Interpretation request with message and culture context
   * @returns Promise resolving to interpretation and metadata
   * @throws {LLMTimeoutError} If request exceeds 10 seconds
   * @throws {LLMRateLimitError} If rate limit exceeded (429)
   * @throws {LLMAuthError} If API key invalid (401)
   * @throws {LLMParsingError} If response cannot be parsed
   * @throws {LLMProviderError} For other API errors
   */
  async interpret(request: LLMInterpretationRequest): Promise<{
    interpretation: LLMInterpretationResponse;
    metadata: LLMMetadata;
  }> {
    const startTime = Date.now();

    // Generate prompt
    const prompt = generateInterpretationPrompt(
      request.message,
      request.senderCulture,
      request.receiverCulture,
      request.sameCulture
    );

    // Log before LLM call
    logger.info({
      timestamp: new Date().toISOString(),
      culturePair: `${request.senderCulture} → ${request.receiverCulture}`,
      characterCount: request.message.length,
      sameCulture: request.sameCulture,
    }, 'Calling Claude for interpretation');

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Call Anthropic API
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 1500,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt,
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

      // Parse and validate response
      const interpretation = parseInterpretationResponse(
        rawResponse,
        request.sameCulture
      );

      // Calculate cost and metadata
      const responseTimeMs = Date.now() - startTime;
      const costUsd = calculateAnthropicCost(
        response.usage.input_tokens,
        response.usage.output_tokens
      );

      const metadata: LLMMetadata = {
        costUsd,
        responseTimeMs,
        tokenCount: response.usage.input_tokens + response.usage.output_tokens,
        model: this.model,
      };

      // Log success
      logger.info({
        timestamp: new Date().toISOString(),
        responseTimeMs,
        costUsd,
        tokenCount: metadata.tokenCount,
        model: this.model,
        success: true,
      }, 'Claude interpretation successful');

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
}
