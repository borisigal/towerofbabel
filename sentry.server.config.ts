/**
 * Sentry Server-Side Configuration
 *
 * Initializes Sentry for server-side runtime (API routes, Server Components, Server Actions).
 *
 * CRITICAL: Uses SENTRY_DSN (server-only).
 * Should NOT be exposed to client.
 *
 * Features:
 * - Error tracking for API routes and Server Components
 * - Performance monitoring (10% sample rate)
 * - Profiling (10% sample rate)
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Profiling
  profilesSampleRate: 0.1, // 10% of transactions

  // Don't send events in local development (unless explicitly enabled)
  beforeSend(event) {
    if (
      process.env.NODE_ENV === 'development' &&
      !process.env.SENTRY_ENABLE_DEV
    ) {
      return null;
    }
    return event;
  },
});
