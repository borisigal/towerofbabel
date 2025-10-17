/**
 * Database Connection Circuit Breaker
 *
 * Implements a circuit breaker pattern to detect and handle connection pool exhaustion.
 * This is CRITICAL for preventing cascading failures when Supabase connection pool
 * (60 connections on free tier) is exhausted.
 *
 * Circuit Breaker States:
 * 1. CLOSED (normal): All operations allowed, tracks consecutive errors
 * 2. OPEN (tripped): Blocks operations after 5 consecutive connection errors
 * 3. GRADUAL RECOVERY: Successful operations decrement error counter
 *
 * Detection:
 * - Prisma error code P1001 ("Can't reach database server")
 * - Error messages containing "too many connections"
 *
 * ALL database operations MUST be wrapped with executeWithCircuitBreaker().
 *
 * @see architecture/14-critical-risk-mitigation.md#risk-2
 * @see lib/db/repositories/* for usage examples
 */

import { logger } from '@/lib/observability/logger';

/**
 * Current count of consecutive connection errors.
 * Incremented on connection failures, decremented on successes (gradual recovery).
 */
let connectionErrorCount = 0;

/**
 * Maximum consecutive connection errors before circuit breaker opens.
 * After 5 errors, all operations are blocked to prevent cascade failure.
 */
const MAX_CONNECTION_ERRORS = 5;

/**
 * Timestamp when circuit breaker was last opened.
 * Used for monitoring circuit breaker state and recovery tracking.
 */
let lastCircuitBreakerTrigger: Date | null = null;

/**
 * Wraps a database operation with connection circuit breaker protection.
 *
 * This function MUST be used for ALL Prisma database operations to prevent
 * connection pool exhaustion from causing cascading failures.
 *
 * Behavior:
 * - If circuit breaker is OPEN (>= 5 errors): Throws circuit breaker error immediately
 * - If operation succeeds: Decrements error counter (gradual recovery)
 * - If operation fails with connection error: Increments error counter
 * - After 5 consecutive errors: Opens circuit breaker
 *
 * @template T - Return type of the database operation
 * @param operation - Async function that performs a Prisma database operation
 * @returns Promise resolving to operation result
 * @throws Error if circuit breaker is open or operation fails
 *
 * @example
 * ```typescript
 * import { executeWithCircuitBreaker } from '@/lib/db/connectionMonitor';
 * import prisma from '@/lib/db/prisma';
 *
 * // Wrap all Prisma operations
 * const user = await executeWithCircuitBreaker(() =>
 *   prisma.user.findUnique({
 *     where: { id: userId },
 *     select: { tier: true, messages_used_count: true }
 *   })
 * );
 * ```
 */
export async function executeWithCircuitBreaker<T>(
  operation: () => Promise<T>
): Promise<T> {
  // Check if circuit breaker is open (too many consecutive errors)
  if (connectionErrorCount >= MAX_CONNECTION_ERRORS) {
    logger.error({
      connectionErrorCount,
      maxErrors: MAX_CONNECTION_ERRORS,
      lastTrigger: lastCircuitBreakerTrigger,
    }, 'Circuit breaker open - connection pool exhausted');

    throw new Error(
      'Database circuit breaker open - connection pool exhausted. Please try again later.'
    );
  }

  try {
    // Execute the database operation
    const result = await operation();

    // Success - decrement error counter (gradual recovery)
    if (connectionErrorCount > 0) {
      connectionErrorCount = Math.max(0, connectionErrorCount - 1);
      logger.debug({
        connectionErrorCount,
      }, 'Circuit breaker: successful operation, error count decreased');
    }

    return result;
  } catch (error: unknown) {
    // Check if this is a connection pool error
    const isConnectionError = isConnectionPoolError(error);

    if (isConnectionError) {
      connectionErrorCount++;

      logger.error({
        connectionErrorCount,
        maxErrors: MAX_CONNECTION_ERRORS,
        errorCode: getErrorCode(error),
        errorMessage: getErrorMessage(error),
      }, 'Connection pool error detected');

      // Check if we've hit the threshold to open circuit breaker
      if (connectionErrorCount >= MAX_CONNECTION_ERRORS) {
        lastCircuitBreakerTrigger = new Date();
        logger.error({
          connectionErrorCount,
          triggeredAt: lastCircuitBreakerTrigger,
        }, 'Circuit breaker OPENED - blocking database operations');
      }
    }

    // Re-throw the original error
    throw error;
  }
}

/**
 * Detects if an error is a connection pool exhaustion error.
 *
 * Checks for:
 * - Prisma error code P1001 ("Can't reach database server")
 * - Error messages containing "too many connections"
 *
 * @param error - Caught error object
 * @returns true if error indicates connection pool exhaustion
 */
function isConnectionPoolError(error: unknown): boolean {
  // Prisma errors have a 'code' property
  const errorCode = getErrorCode(error);
  if (errorCode === 'P1001') {
    return true;
  }

  // Check error message for connection-related errors
  const errorMessage = getErrorMessage(error);
  if (
    errorMessage.toLowerCase().includes('too many connections') ||
    errorMessage.toLowerCase().includes('connection pool') ||
    errorMessage.toLowerCase().includes('connection limit')
  ) {
    return true;
  }

  return false;
}

/**
 * Safely extracts error code from error object.
 *
 * @param error - Error object
 * @returns Error code string or 'UNKNOWN'
 */
function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return 'UNKNOWN';
}

/**
 * Safely extracts error message from error object.
 *
 * @param error - Error object
 * @returns Error message string or empty string
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return '';
}

/**
 * Gets current circuit breaker state for monitoring/debugging.
 *
 * Used by health-check endpoints and monitoring dashboards.
 *
 * @returns Circuit breaker state information
 */
export function getCircuitBreakerState(): {
  connectionErrorCount: number;
  isOpen: boolean;
  maxErrors: number;
  lastTrigger: Date | null;
} {
  return {
    connectionErrorCount,
    isOpen: connectionErrorCount >= MAX_CONNECTION_ERRORS,
    maxErrors: MAX_CONNECTION_ERRORS,
    lastTrigger: lastCircuitBreakerTrigger,
  };
}

/**
 * Manually resets circuit breaker (admin use only).
 *
 * Should only be called by admin endpoints after verifying database is healthy.
 * NOT for use in normal application flow.
 */
export function resetCircuitBreaker(): void {
  const previousCount = connectionErrorCount;
  connectionErrorCount = 0;
  lastCircuitBreakerTrigger = null;

  logger.info({
    previousErrorCount: previousCount,
  }, 'Circuit breaker manually reset');
}

/**
 * Logs connection pool metrics (called every 5 minutes by monitoring service).
 *
 * Used for proactive monitoring and alerting on connection pool health.
 * Will be integrated with monitoring dashboard in Story 1.5B.
 */
export function logConnectionMetrics(): void {
  logger.info({
    connectionErrorCount,
    isCircuitBreakerOpen: connectionErrorCount >= MAX_CONNECTION_ERRORS,
    lastCircuitBreakerTrigger,
  }, 'Connection pool metrics');
}
