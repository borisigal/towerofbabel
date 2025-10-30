/**
 * GET /api/admin/feedback/stats - Feedback Statistics API Route
 *
 * Returns aggregated feedback statistics for admin dashboard.
 * Provides overall stats (inbound/outbound positive rates) and
 * culture pair analysis (top 5 problematic pairs).
 *
 * Authentication: Required (Supabase session)
 * Authorization: Admin only (is_admin = true)
 * Query params: ?range=7d|30d|all (default: 30d)
 *
 * @see docs/stories/4.5.story.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';
import {
  getOverallStats,
  getCulturePairStats,
  type DateRangeType,
} from '@/lib/services/feedbackAnalyticsService';

/**
 * GET /api/admin/feedback/stats
 *
 * Returns aggregated feedback statistics for admin dashboard.
 *
 * Authentication: Required (Supabase session)
 * Authorization: Admin only (is_admin = true)
 * Query params: ?range=7d|30d|all (default: 30d)
 *
 * @param req - Next.js request with query params
 * @returns JSON response with overall stats and culture pair stats
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // 1. AUTHENTICATION - Check user session
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Feedback stats request - Unauthorized', {
        error: authError?.message,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // 2. AUTHORIZATION - Check admin flag from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { is_admin: true },
    });

    if (!dbUser || !dbUser.is_admin) {
      log.warn('Feedback stats request - Forbidden (non-admin)', {
        user_id: user.id,
        is_admin: dbUser?.is_admin,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        { status: 403 }
      );
    }

    // 3. PARSE QUERY PARAMS
    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get('range') || '30d';

    // Validate range parameter
    const validRanges: DateRangeType[] = ['7d', '30d', 'all'];
    const dateRange: DateRangeType = validRanges.includes(
      rangeParam as DateRangeType
    )
      ? (rangeParam as DateRangeType)
      : '30d';

    log.info('Fetching feedback stats', {
      user_id: user.id,
      dateRange,
    });

    // 4. FETCH STATISTICS
    const [overallStats, culturePairStats] = await Promise.all([
      getOverallStats(dateRange),
      getCulturePairStats(dateRange),
    ]);

    const responseTimeMs = Date.now() - startTime;

    log.info('Feedback stats fetched successfully', {
      user_id: user.id,
      dateRange,
      response_time_ms: responseTimeMs,
      total_interpretations: overallStats.total_interpretations,
      culture_pairs_count: culturePairStats.length,
    });

    // 5. RESPONSE
    return NextResponse.json(
      {
        success: true,
        data: {
          total_interpretations: overallStats.total_interpretations,
          inbound: overallStats.inbound,
          outbound: overallStats.outbound,
          culture_pairs: culturePairStats,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    log.error('Feedback stats request - Server error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: responseTimeMs,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}
