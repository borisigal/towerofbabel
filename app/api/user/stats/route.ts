/**
 * GET /api/user/stats - User Statistics API Route
 *
 * Returns usage statistics for the authenticated user.
 * Used on the pricing page to display engagement metrics.
 *
 * @see lib/db/repositories/interpretationRepository.ts#getUserStats
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { getUserStats } from '@/lib/db/repositories/interpretationRepository';
import { logger } from '@/lib/observability/logger';

/**
 * GET handler for /api/user/stats endpoint.
 *
 * Returns user statistics including:
 * - Total usage count
 * - Interpretations count (inbound)
 * - Optimizations count (outbound)
 * - Top 3 culture pairs
 *
 * @returns JSON response with user statistics or error
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please sign in.',
          },
        },
        { status: 401 }
      );
    }

    // Fetch user statistics
    const stats = await getUserStats(user.id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch user stats');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch statistics. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}
