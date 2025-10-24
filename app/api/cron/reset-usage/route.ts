/**
 * POST /api/cron/reset-usage - Vercel Cron Job for Monthly Usage Resets
 *
 * Daily background job that resets Pro users who have reached their monthly reset date.
 * This is a BACKUP mechanism - primary reset happens on-demand during interpretation requests.
 *
 * **Purpose:**
 * - Catch Pro users who don't make requests on their reset day
 * - Centralized logging of all resets for audit trail
 * - Ensure consistent reset timing across all Pro users
 *
 * **Security:**
 * - Vercel Cron automatically adds Authorization header with CRON_SECRET
 * - Endpoint validates this header to prevent unauthorized access
 *
 * **Scheduling:**
 * - Runs daily at midnight UTC (configured in vercel.json)
 * - Queries all Pro users where messages_reset_date <= now()
 * - Resets each user and logs the operation
 *
 * @see docs/stories/3.1.story.md
 * @see https://vercel.com/docs/cron-jobs#configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { resetProUserUsage } from '@/lib/db/repositories/userRepository';
import { logger } from '@/lib/observability/logger';
import prisma from '@/lib/db/prisma';

/**
 * POST handler for cron job endpoint.
 *
 * Vercel Cron adds Authorization header automatically.
 * Format: "Authorization: Bearer <CRON_SECRET>"
 *
 * @param req - Next.js request object
 * @returns JSON response with reset count and timestamp
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // ============================================
    // 1. AUTHORIZATION - Verify Vercel Cron Secret
    // ============================================
    const authHeader = req.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      logger.warn(
        {
          authHeader: authHeader ? 'present' : 'missing',
        },
        'Unauthorized cron job attempt'
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid authorization',
          },
        },
        { status: 401 }
      );
    }

    // ============================================
    // 2. QUERY PRO USERS DUE FOR RESET
    // ============================================
    const now = new Date();

    logger.info(
      {
        timestamp: now.toISOString(),
      },
      'Cron job started - querying Pro users due for reset'
    );

    const usersToReset = await prisma.user.findMany({
      where: {
        tier: 'pro',
        messages_reset_date: {
          lte: now, // Reset date has passed
        },
      },
      select: {
        id: true,
        email: true,
        messages_used_count: true,
        messages_reset_date: true,
      },
    });

    logger.info(
      {
        count: usersToReset.length,
      },
      'Found Pro users due for reset'
    );

    // ============================================
    // 3. RESET EACH USER
    // ============================================
    let resetCount = 0;
    const errors: { userId: string; error: string }[] = [];

    for (const user of usersToReset) {
      try {
        await resetProUserUsage(user.id);
        resetCount++;

        logger.info(
          {
            userId: user.id,
            email: user.email,
            old_messages_used: user.messages_used_count,
            old_reset_date: user.messages_reset_date,
          },
          'Pro user usage reset successfully'
        );
      } catch (error) {
        logger.error(
          {
            userId: user.id,
            email: user.email,
            error,
          },
          'Failed to reset Pro user usage'
        );

        errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // ============================================
    // 4. LOG AND RETURN RESULT
    // ============================================
    const durationMs = Date.now() - startTime;

    logger.info(
      {
        reset_count: resetCount,
        total_found: usersToReset.length,
        errors_count: errors.length,
        duration_ms: durationMs,
        timestamp: now.toISOString(),
      },
      'Cron job completed'
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          reset_count: resetCount,
          total_found: usersToReset.length,
          errors_count: errors.length,
          timestamp: now.toISOString(),
        },
        ...(errors.length > 0 && { errors }),
      },
      { status: 200 }
    );
  } catch (error) {
    // ============================================
    // 5. ERROR HANDLING
    // ============================================
    const durationMs = Date.now() - startTime;

    logger.error(
      {
        error,
        duration_ms: durationMs,
      },
      'Cron job failed with unexpected error'
    );

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Cron job failed',
        },
      },
      { status: 500 }
    );
  }
}
