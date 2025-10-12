import { NextResponse } from 'next/server';

/**
 * Health check endpoint for verifying application status.
 * Returns current status, timestamp, and database connection state.
 *
 * Database status will be updated to 'connected' in Story 1.3 when
 * Prisma and PostgreSQL are configured.
 *
 * @returns JSON response with health status information
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'pending', // Will be updated to 'connected' in Story 1.3
  });
}
