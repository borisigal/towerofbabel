/**
 * Structured Logger using Pino
 *
 * Provides production-grade structured logging for TowerOfBabel.
 * Used throughout the application for tracking LLM costs, database operations,
 * authentication events, and error tracking.
 *
 * Features:
 * - Structured JSON logging (queryable in Vercel logs)
 * - Pretty-printing in development
 * - Automatic timestamp inclusion
 * - Context-aware log levels
 *
 * @see architecture/3-tech-stack.md#logging
 */

import pino from 'pino';

/**
 * Logger instance configured for environment-specific output.
 *
 * Development: Pretty-printed colored logs for easy reading
 * Production: Structured JSON logs for querying in Vercel
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Type-safe logging utilities for common use cases
 */
export const log = {
  /**
   * Log informational messages (normal operation)
   */
  info: (message: string, context?: Record<string, unknown>) =>
    logger.info(context, message),

  /**
   * Log warning messages (potential issues, degraded performance)
   */
  warn: (message: string, context?: Record<string, unknown>) =>
    logger.warn(context, message),

  /**
   * Log error messages (failures, exceptions)
   */
  error: (message: string, context?: Record<string, unknown>) =>
    logger.error(context, message),

  /**
   * Log debug messages (detailed information for troubleshooting)
   */
  debug: (message: string, context?: Record<string, unknown>) =>
    logger.debug(context, message),
};
