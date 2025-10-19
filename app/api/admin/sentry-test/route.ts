import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { findUserById } from '@/lib/db/repositories/userRepository';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/observability/logger';

/**
 * Admin-only endpoint to test Sentry error tracking.
 *
 * Tests:
 * 1. Triggers intentional test error
 * 2. Captures error with Sentry with tags and context
 * 3. Returns success (error is captured, not thrown)
 *
 * CRITICAL: Requires admin authentication (is_admin flag from database).
 * TESTING ONLY: This endpoint intentionally generates errors for validation.
 *
 * @returns JSON response confirming error was sent to Sentry
 *
 * @example
 * ```bash
 * # Local testing (requires admin login)
 * curl http://localhost:3000/api/admin/sentry-test
 *
 * # Expected response:
 * {
 *   "sentry_status": "error_captured",
 *   "message": "Test error sent to Sentry. Check Sentry dashboard."
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
      'Non-admin user attempted to access Sentry test endpoint'
    );
    return NextResponse.json(
      { success: false, error: 'Forbidden - Admin only' },
      { status: 403 }
    );
  }

  // 3. SENTRY TEST LOGIC
  try {
    // Intentionally throw test error
    throw new Error('Sentry test error - this is intentional for validation');
  } catch (error) {
    // Capture error with Sentry (with tags and context)
    Sentry.captureException(error, {
      tags: {
        test: true,
        story: '1.5B',
        endpoint: '/api/admin/sentry-test',
      },
      extra: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        userId: user.id,
        userEmail: userRecord.email,
      },
    });

    logger.info(
      { userId: user.id },
      'Admin Sentry test completed - test error captured'
    );

    // Return success (error was captured, not thrown to client)
    return NextResponse.json({
      success: true,
      sentry_status: 'error_captured',
      message: 'Test error sent to Sentry. Check Sentry dashboard.',
      instructions:
        'Go to https://sentry.io and verify the error appears with tags: test=true, story=1.5B',
    });
  }
}
