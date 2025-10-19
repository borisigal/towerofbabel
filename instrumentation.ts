/**
 * Next.js 14 Instrumentation Hook
 *
 * This file is loaded once when the Next.js runtime starts.
 * Used for initializing monitoring and observability tools (Sentry).
 *
 * CRITICAL: This runs in both Node.js and Edge runtimes.
 * Must check NEXT_RUNTIME to initialize correctly.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Register function called by Next.js on runtime startup.
 *
 * Initializes Sentry with environment-specific configuration.
 */
export function register(): void {
  // Node.js runtime (API routes, Server Components)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1, // 10% performance monitoring
      profilesSampleRate: 0.1, // 10% profiling
      beforeSend(event) {
        // Don't send events in local development (unless explicitly enabled)
        if (
          process.env.NODE_ENV === 'development' &&
          !process.env.SENTRY_ENABLE_DEV
        ) {
          return null;
        }
        return event;
      },
    });
  }

  // Edge runtime (Middleware)
  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1, // 10% performance monitoring
      beforeSend(event) {
        // Don't send events in local development (unless explicitly enabled)
        if (
          process.env.NODE_ENV === 'development' &&
          !process.env.SENTRY_ENABLE_DEV
        ) {
          return null;
        }
        return event;
      },
    });
  }
}
