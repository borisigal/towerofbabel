import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { findUserById } from '@/lib/db/repositories/userRepository';
import { kv } from '@/lib/kv/client';
import { logger } from '@/lib/observability/logger';

/**
 * Admin-only endpoint to test Vercel KV connectivity.
 *
 * Tests:
 * 1. Sets a test key with 60 second TTL
 * 2. Retrieves the test key
 * 3. Verifies value matches
 *
 * CRITICAL: Requires admin authentication (is_admin flag from database).
 *
 * @returns JSON response with KV test results
 *
 * @example
 * ```bash
 * # Local testing (requires admin login)
 * curl http://localhost:3000/api/admin/kv-test
 *
 * # Expected response:
 * {
 *   "kv_status": "connected",
 *   "test_key_set": true,
 *   "test_key_retrieved": true,
 *   "test_value": "ok"
 * }
 * ```
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  // 1. AUTHENTICATION - Get user identity from JWT
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  // 2. AUTHORIZATION - Check is_admin flag from DATABASE
  const userRecord = await findUserById(user.id);

  if (!userRecord?.is_admin) {
    logger.warn(
      { userId: user.id },
      'Non-admin user attempted to access KV test endpoint'
    );
    return NextResponse.json(
      { success: false, error: 'Forbidden - Admin only' },
      { status: 403 }
    );
  }

  // 3. KV TEST LOGIC
  try {
    // Set test key with 60 second TTL
    await kv.set('test:health', 'ok', { ex: 60 });

    // Get test key
    const value = await kv.get<string>('test:health');

    // Verify value matches
    const testKeyRetrieved = value === 'ok';

    logger.info(
      {
        userId: user.id,
        testKeySet: true,
        testKeyRetrieved,
        testValue: value,
      },
      'Admin KV test completed'
    );

    return NextResponse.json({
      success: true,
      kv_status: testKeyRetrieved ? 'connected' : 'error',
      test_key_set: true,
      test_key_retrieved: testKeyRetrieved,
      test_value: value,
    });
  } catch (error) {
    logger.error(
      {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      },
      'KV test failed'
    );

    return NextResponse.json(
      {
        success: false,
        kv_status: 'disconnected',
        error: 'KV connection failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
