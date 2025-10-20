import { NextResponse } from 'next/server';
import { getUserCount } from '@/lib/db/repositories/userRepository';
import { kv } from '@/lib/kv/client';
import { logger } from '@/lib/observability/logger';
import { checkCostBudget } from '@/lib/llm/costCircuitBreaker';

/**
 * Health check endpoint for verifying application status.
 * Returns current status, timestamp, database connection state,
 * KV (Redis) connection state, Sentry monitoring status, and cost circuit breaker status.
 *
 * Tests:
 * - Database connectivity (simple count query)
 * - Vercel KV connectivity (set/get test key)
 * - Sentry configuration (checks DSN environment variable)
 * - Cost circuit breaker functionality (test budget check)
 *
 * CRITICAL: Always returns 200 OK even if dependencies are down.
 * This allows monitoring to detect issues without marking entire app as unhealthy.
 *
 * @returns JSON response with health status information
 */
export async function GET(): Promise<NextResponse> {
  let databaseStatus = 'disconnected';
  let kvStatus = 'disconnected';
  let sentryStatus = 'not_configured';
  let costCircuitBreakerStatus = 'operational';

  // 1. DATABASE HEALTH CHECK
  try {
    // Test database connection with simple count query
    // Wrapped in circuit breaker via repository pattern
    await getUserCount();
    databaseStatus = 'connected';
  } catch (error) {
    // Log error but don't fail health check
    // Health check passing means API is up, even if DB is down
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Database health check failed'
    );
  }

  // 2. VERCEL KV HEALTH CHECK
  try {
    // Set test key with 10 second TTL
    await kv.set('health:check', 'ok', { ex: 10 });
    // Get test key to verify connectivity
    const value = await kv.get<string>('health:check');
    kvStatus = value === 'ok' ? 'connected' : 'disconnected';
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'KV health check failed'
    );
    // kvStatus remains 'disconnected', but health check still returns 200 OK
  }

  // 3. SENTRY HEALTH CHECK
  // Just check if DSN is configured (can't test actual connection without sending event)
  sentryStatus = process.env.SENTRY_DSN ? 'active' : 'not_configured';

  // 4. COST CIRCUIT BREAKER HEALTH CHECK
  try {
    const costCheck = await checkCostBudget('health-check-test');
    if (!costCheck.allowed) {
      costCircuitBreakerStatus = `triggered-${costCheck.layer}`;
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Cost circuit breaker health check failed'
    );
    costCircuitBreakerStatus = 'error';
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: databaseStatus,
    kv: kvStatus,
    sentry: sentryStatus,
    costCircuitBreaker: costCircuitBreakerStatus,
  });
}
