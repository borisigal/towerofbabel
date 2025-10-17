import { NextResponse } from 'next/server';
import { getUserCount } from '@/lib/db/repositories/userRepository';
import { logger } from '@/lib/observability/logger';

/**
 * Health check endpoint for verifying application status.
 * Returns current status, timestamp, and database connection state.
 *
 * Tests database connectivity by executing a simple count query.
 * If database is unreachable, returns 'disconnected' but maintains
 * 200 status code (health check itself is successful, just DB is down).
 *
 * @returns JSON response with health status information
 */
export async function GET(): Promise<NextResponse> {
  let databaseStatus = 'disconnected';

  try {
    // Test database connection with simple count query
    // Wrapped in circuit breaker via repository pattern
    await getUserCount();
    databaseStatus = 'connected';
  } catch (error) {
    // Log error but don't fail health check
    // Health check passing means API is up, even if DB is down
    logger.error({
      error: error instanceof Error ? error.message : String(error),
    }, 'Database health check failed');
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  });
}
