/**
 * GET /api/user/usage - User Usage Information API Route
 *
 * Returns current user's message usage, tier information, and limits.
 * Used by frontend components to display usage indicators and approaching-limit notifications.
 *
 * **Middleware Chain Order:**
 * 1. Authentication (Supabase Auth)
 * 2. Rate Limiting (IP-based, 100 req/min - more lenient than /api/interpret)
 * 3. Database Query (database-as-source-of-truth for tier/usage)
 * 4. Response (standardized format with tier-specific data)
 *
 * **Response Format:**
 * - Trial users: includes trial_end_date
 * - Pro users: includes reset_date
 * - PAYG users: messages_limit is null (unlimited)
 *
 * @see docs/stories/3.2.story.md#task-2
 * @see architecture/16-coding-standards.md#api-route-patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import { findUserById } from '@/lib/db/repositories/userRepository';
import { logger } from '@/lib/observability/logger';

/**
 * Environment variable defaults for tier limits.
 * These match the limits defined in Story 3.1.
 */
const TRIAL_MESSAGE_LIMIT = parseInt(process.env.TRIAL_MESSAGE_LIMIT || '10', 10);
const PRO_MESSAGE_LIMIT = parseInt(process.env.PRO_MESSAGE_LIMIT || '100', 10);
const TRIAL_DAYS_LIMIT = parseInt(process.env.TRIAL_DAYS_LIMIT || '14', 10);

/**
 * GET handler for /api/user/usage endpoint.
 *
 * Returns user's current usage information from database.
 * CRITICAL: Queries database (NOT JWT) for tier/usage to ensure accuracy.
 *
 * @param req - Next.js request object
 * @returns JSON response with usage data or error
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // ============================================
    // 1. AUTHENTICATION (Supabase Auth)
    // ============================================
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn({ authError }, 'Authentication failed for /api/user/usage');
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

    // ============================================
    // 2. RATE LIMITING (100 req/min per IP)
    // More lenient than /api/interpret since dashboard may poll this endpoint
    // ============================================
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(ip, 100);

    if (!rateLimit.allowed) {
      logger.info({ ip, userId: user.id }, 'Rate limit exceeded for /api/user/usage');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    // ============================================
    // 3. DATABASE QUERY (database-as-source-of-truth)
    // CRITICAL: Query database for tier/usage (NOT JWT app_metadata)
    // ============================================
    const userRecord = await findUserById(user.id);

    if (!userRecord) {
      logger.error({ userId: user.id }, 'User not found in database');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User record not found.',
          },
        },
        { status: 404 }
      );
    }

    // ============================================
    // 4. CALCULATE TIER-SPECIFIC DATA
    // ============================================

    // Calculate messages_limit based on tier
    let messagesLimit: number | null = null;
    if (userRecord.tier === 'trial') {
      messagesLimit = TRIAL_MESSAGE_LIMIT;
    } else if (userRecord.tier === 'pro') {
      messagesLimit = PRO_MESSAGE_LIMIT;
    }
    // PAYG: messagesLimit = null (unlimited)

    // Calculate trial_end_date (if applicable)
    let trialEndDate: string | null = null;
    if (userRecord.tier === 'trial' && userRecord.trial_start_date) {
      const trialStartTime = userRecord.trial_start_date.getTime();
      const trialEndTime = trialStartTime + TRIAL_DAYS_LIMIT * 24 * 60 * 60 * 1000;
      trialEndDate = new Date(trialEndTime).toISOString();
    }

    // Get reset_date for Pro users
    const resetDate = userRecord.messages_reset_date?.toISOString() || null;

    // ============================================
    // 5. LOGGING (Structured)
    // ============================================
    logger.debug(
      {
        user_id: user.id,
        tier: userRecord.tier,
        messages_used: userRecord.messages_used_count,
        messages_limit: messagesLimit,
      },
      'Usage data fetched successfully'
    );

    // ============================================
    // 6. RESPONSE (Standardized Format)
    // ============================================
    return NextResponse.json(
      {
        success: true,
        data: {
          tier: userRecord.tier,
          messages_used: userRecord.messages_used_count,
          messages_limit: messagesLimit,
          trial_end_date: trialEndDate,
          reset_date: resetDate,
        },
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
        },
      }
    );
  } catch (error) {
    // ============================================
    // 7. ERROR HANDLING
    // ============================================
    logger.error({ error }, 'Failed to fetch user usage data');

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve usage data. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}
