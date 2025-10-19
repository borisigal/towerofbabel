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
 * - Sentry breadcrumbs integration (logs appear in error context)
 *
 * @see architecture/3-tech-stack.md#logging
 */

import pino from 'pino';
import * as Sentry from '@sentry/nextjs';

/**
 * Logger instance configured for environment-specific output.
 *
 * Development: Pretty-printed colored logs for easy reading
 * Production: Structured JSON logs for querying in Vercel
 *
 * Sentry Integration: All logs (info and above) create Sentry breadcrumbs
 * that appear in error context for debugging.
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
  hooks: {
    logMethod(inputArgs, method, level) {
      // Add Sentry breadcrumb for each log (info level and above)
      if (level >= 30) {
        // Pino levels: trace=10, debug=20, info=30, warn=40, error=50, fatal=60
        const message =
          typeof inputArgs[1] === 'string' ? inputArgs[1] : inputArgs[0];
        const context =
          typeof inputArgs[0] === 'object' && inputArgs[0] !== null
            ? inputArgs[0]
            : undefined;

        // Map Pino levels to Sentry levels
        let sentryLevel: 'info' | 'warning' | 'error' = 'info';
        if (level >= 50) sentryLevel = 'error';
        else if (level >= 40) sentryLevel = 'warning';

        Sentry.addBreadcrumb({
          category: 'log',
          message: String(message),
          level: sentryLevel,
          data: context,
        });
      }

      return method.apply(this, inputArgs);
    },
  },
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
