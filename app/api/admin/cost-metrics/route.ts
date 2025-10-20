import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { findUserById } from '@/lib/db/repositories/userRepository';
import { kv } from '@/lib/kv/client';
import { logger } from '@/lib/observability/logger';

/**
 * Admin-only endpoint to monitor LLM cost metrics.
 *
 * Returns current cost metrics across all 3 protection layers:
 * - Daily cost (all users combined)
 * - Hourly cost (all users combined)
 * - Top 10 users by daily cost (for abuse detection)
 *
 * CRITICAL: Requires admin authentication (is_admin flag from database).
 *
 * @returns JSON response with cost metrics
 *
 * @example
 * ```bash
 * # Local testing (requires admin login)
 * curl http://localhost:3000/api/admin/cost-metrics
 *
 * # Expected response:
 * {
 *   "success": true,
 *   "daily": { "current": 12.34, "limit": 50, "percentage": 24.68 },
 *   "hourly": { "current": 0.85, "limit": 5, "percentage": 17 },
 *   "topUsers": [
 *     { "userId": "user-abc", "cost": 0.75 },
 *     { "userId": "user-xyz", "cost": 0.45 }
 *   ]
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
      'Non-admin user attempted to access cost metrics endpoint'
    );
    return NextResponse.json(
      { success: false, error: 'Forbidden - Admin only' },
      { status: 403 }
    );
  }

  // 3. COST METRICS LOGIC
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentHour = new Date().getHours().toString().padStart(2, '0'); // HH

    // Fetch current daily cost
    const dailyCost = parseFloat(
      (await kv.get(`cost:daily:${today}`)) || '0'
    );
    const dailyLimit = parseFloat(process.env.COST_LIMIT_DAILY || '50');
    const dailyPercentage = parseFloat(
      ((dailyCost / dailyLimit) * 100).toFixed(2)
    );

    // Fetch current hourly cost
    const hourlyCost = parseFloat(
      (await kv.get(`cost:hourly:${today}:${currentHour}`)) || '0'
    );
    const hourlyLimit = parseFloat(process.env.COST_LIMIT_HOURLY || '5');
    const hourlyPercentage = parseFloat(
      ((hourlyCost / hourlyLimit) * 100).toFixed(2)
    );

    // Fetch top 10 users by daily cost
    const userCostKeys = await kv.keys(`cost:user:*:${today}`);
    const userCosts: Array<{ userId: string; cost: number }> = [];

    for (const key of userCostKeys) {
      const cost = parseFloat((await kv.get(key)) || '0');
      const keyParts = key.split(':');
      const userId = keyParts[2] || 'unknown'; // Extract userId from "cost:user:abc:2025-10-19"
      if (keyParts[2]) {
        userCosts.push({ userId, cost });
      }
    }

    // Sort by cost descending, take top 10
    const topUsers = userCosts.sort((a, b) => b.cost - a.cost).slice(0, 10);

    logger.info(
      {
        userId: user.id,
        dailyCost,
        hourlyCost,
        topUsersCount: topUsers.length,
      },
      'Admin cost metrics retrieved'
    );

    return NextResponse.json({
      success: true,
      daily: {
        current: dailyCost,
        limit: dailyLimit,
        percentage: dailyPercentage,
      },
      hourly: {
        current: hourlyCost,
        limit: hourlyLimit,
        percentage: hourlyPercentage,
      },
      topUsers,
    });
  } catch (error) {
    logger.error(
      {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      },
      'Cost metrics retrieval failed'
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve cost metrics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
