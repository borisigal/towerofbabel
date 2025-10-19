/**
 * Sentry Client-Side Configuration
 *
 * Initializes Sentry for browser (Client Components).
 *
 * CRITICAL: Uses NEXT_PUBLIC_SENTRY_DSN (client-accessible).
 * Sentry DSN is safe to expose (public DSN, Sentry validates events server-side).
 *
 * Features:
 * - Error tracking for Client Components
 * - Performance monitoring (10% sample rate)
 * - Session replay (10% of sessions, 100% of error sessions)
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions

  // Don't send events in local development (unless explicitly enabled)
  beforeSend(event) {
    if (
      process.env.NODE_ENV === 'development' &&
      !process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV
    ) {
      return null;
    }
    return event;
  },
});
