/**
 * Custom error classes for LLM service layer.
 * Provides specific error types for different failure scenarios.
 */

/**
 * Base error class for all LLM-related errors.
 * Extended by specific error types for different failure modes.
 */
export class LLMError extends Error {
  /**
   * Creates an LLM error.
   *
   * @param message - Error message
   * @param context - Additional context data for debugging
   */
  constructor(
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Thrown when LLM request exceeds configured timeout.
 * Indicates network latency or provider slowdown.
 */
export class LLMTimeoutError extends LLMError {
  /**
   * Creates a timeout error.
   */
  constructor() {
    super('LLM request timed out after 10 seconds');
    this.name = 'LLMTimeoutError';
  }
}

/**
 * Thrown when LLM provider rate limit is exceeded.
 * Indicates too many requests in a short time period.
 */
export class LLMRateLimitError extends LLMError {
  /**
   * Creates a rate limit error.
   *
   * @param retryAfter - Optional number of seconds to wait before retrying
   */
  constructor(public retryAfter?: number) {
    super('LLM rate limit exceeded');
    this.name = 'LLMRateLimitError';
  }
}

/**
 * Thrown when LLM provider authentication fails.
 * Indicates invalid, expired, or missing API key.
 */
export class LLMAuthError extends LLMError {
  /**
   * Creates an authentication error.
   */
  constructor() {
    super('Invalid LLM API key');
    this.name = 'LLMAuthError';
  }
}

/**
 * Thrown when LLM response cannot be parsed as valid JSON or structure.
 * Indicates malformed response or unexpected format.
 */
export class LLMParsingError extends LLMError {
  /**
   * Creates a parsing error.
   *
   * @param message - Specific parsing failure message
   * @param context - Context data including raw response
   */
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Failed to parse LLM response: ${message}`, context);
    this.name = 'LLMParsingError';
  }
}

/**
 * Thrown for generic LLM provider errors.
 * Indicates API errors not covered by specific error types.
 */
export class LLMProviderError extends LLMError {
  /**
   * Creates a provider error.
   *
   * @param message - Error message from provider
   * @param statusCode - HTTP status code if available
   * @param context - Additional error context
   */
  constructor(
    message: string,
    public statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, context);
    this.name = 'LLMProviderError';
  }
}
