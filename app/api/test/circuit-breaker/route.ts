import { NextRequest, NextResponse } from 'next/server';
import { checkCostBudget, trackCost } from '@/lib/llm/costCircuitBreaker';
import { createClient } from '@/lib/auth/supabaseServer';
import { findUserById } from '@/lib/db/repositories/userRepository';
import { logger } from '@/lib/observability/logger';

/**
 * Test endpoint for circuit breaker (admin-only, non-production use)
 *
 * Tests:
 * - Add sample costs
 * - Trigger per-user limit ($1)
 * - Trigger hourly limit ($5)
 * - Trigger daily limit ($50)
 *
 * Query params:
 * - action=add-samples : Add $1 in sample costs
 * - action=trigger-user-limit : Trigger per-user limit
 * - action=trigger-hourly-limit : Trigger hourly limit
 * - action=trigger-daily-limit : Trigger daily limit (adds $50!)
 * - action=check : Check current budget status
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Admin-only check
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userRecord = await findUserById(user.id);
  if (!userRecord?.is_admin) {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Admin only' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'check';

  try {
    if (action === 'add-samples') {
      // Add $1 in sample costs (5 users x 10 calls = $1)
      logger.info('Adding sample costs...');
      const users = ['user-alice', 'user-bob', 'user-carol', 'user-dave', 'user-eve'];

      for (let i = 0; i < 10; i++) {
        for (const userId of users) {
          await trackCost(userId, 0.02);
        }
      }

      return NextResponse.json({
        success: true,
        action: 'add-samples',
        message: 'Added $1.00 in sample costs (5 users x 10 calls x $0.02)',
      });
    }

    if (action === 'trigger-user-limit') {
      // Trigger per-user limit ($1)
      logger.info('Triggering per-user limit...');
      await trackCost('test-user-limit', 0.50);
      await trackCost('test-user-limit', 0.50);
      await trackCost('test-user-limit', 0.10); // Total: $1.10 > $1.00

      const check = await checkCostBudget('test-user-limit');

      return NextResponse.json({
        success: true,
        action: 'trigger-user-limit',
        message: 'Triggered per-user daily limit',
        budgetCheck: check,
      });
    }

    if (action === 'trigger-hourly-limit') {
      // Trigger hourly limit ($5)
      logger.info('Triggering hourly limit...');
      const users = ['h1', 'h2', 'h3', 'h4'];

      for (const userId of users) {
        await trackCost(`hourly-test-${userId}`, 1.50); // 4 x $1.50 = $6.00 > $5.00
      }

      const check = await checkCostBudget('hourly-test-new');

      return NextResponse.json({
        success: true,
        action: 'trigger-hourly-limit',
        message: 'Triggered hourly limit',
        budgetCheck: check,
      });
    }

    if (action === 'trigger-daily-limit') {
      // WARNING: This adds $50 to daily costs!
      logger.warn('Triggering daily limit - adding $50+ in costs!');

      // Add costs in chunks
      for (let i = 1; i <= 34; i++) {
        await trackCost(`daily-test-${i}`, 1.50); // 34 x $1.50 = $51 > $50
      }

      const check = await checkCostBudget('daily-test-new');

      return NextResponse.json({
        success: true,
        action: 'trigger-daily-limit',
        message: 'Triggered daily limit (added $51)',
        budgetCheck: check,
      });
    }

    if (action === 'check') {
      // Just check budget status
      const check = await checkCostBudget('test-user-check');

      return NextResponse.json({
        success: true,
        action: 'check',
        budgetCheck: check,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: add-samples, trigger-user-limit, trigger-hourly-limit, trigger-daily-limit, or check',
    });

  } catch (error) {
    logger.error({ error }, 'Circuit breaker test failed');
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
