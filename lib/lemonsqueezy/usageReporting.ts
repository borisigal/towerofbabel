import { createUsageRecord } from '@lemonsqueezy/lemonsqueezy.js';
import prisma from '@/lib/db/prisma';
import { configureLemonSqueezy } from './client';
import { log } from '@/lib/observability/logger';

/**
 * Report usage for a PAYG user interpretation to Lemon Squeezy.
 *
 * CRITICAL: Uses interpretation ID as idempotency key to prevent double charging.
 * Non-blocking: Errors are logged but don't prevent interpretation from succeeding.
 *
 * @param userId - User ID who performed interpretation
 * @param interpretationId - Unique interpretation ID (used as idempotency key)
 * @param quantity - Number of units to report (default: 1 interpretation)
 * @returns Promise that resolves to true if reporting succeeded, false otherwise
 */
export async function reportInterpretationUsage(
  userId: string,
  interpretationId: string,
  quantity: number = 1
): Promise<boolean> {
  try {
    // 1. Check if usage already reported (idempotency check)
    const interpretation = await prisma.interpretation.findUnique({
      where: { id: interpretationId },
      select: { usage_reported: true, user_id: true }
    });

    if (!interpretation) {
      log.error('Interpretation not found for usage reporting', {
        interpretationId,
        userId
      });
      return false;
    }

    if (interpretation.usage_reported) {
      // Already reported, skip (idempotent behavior)
      log.info('Usage already reported for interpretation', {
        interpretationId,
        userId
      });
      return true;
    }

    // 2. Get user and check if they're on PAYG tier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true
      }
    });

    // 3. Only report usage for PAYG tier users
    if (!user || user.tier !== 'payg') {
      // Not PAYG user, skip usage reporting but mark as reported
      await prisma.interpretation.update({
        where: { id: interpretationId },
        data: { usage_reported: true }
      });
      return true;
    }

    // 4. Check for active PAYG subscription
    if (!user.subscription || user.subscription.status !== 'active') {
      log.warn('PAYG user has no active subscription for usage reporting', {
        userId,
        interpretationId,
        subscriptionStatus: user.subscription?.status || 'none'
      });
      // Mark as reported even though we can't report (prevents retry loops)
      await prisma.interpretation.update({
        where: { id: interpretationId },
        data: { usage_reported: true }
      });
      return false;
    }

    // 5. Check for subscription_item_id (required for usage reporting)
    if (!user.subscription.lemonsqueezy_subscription_item_id) {
      log.error('PAYG user subscription missing subscription_item_id', {
        userId,
        interpretationId,
        subscriptionId: user.subscription.lemonsqueezy_subscription_id
      });
      // Mark as reported to prevent retry loops
      await prisma.interpretation.update({
        where: { id: interpretationId },
        data: { usage_reported: true }
      });
      return false;
    }

    // 6. Configure Lemon Squeezy
    configureLemonSqueezy();

    // 7. Report usage to Lemon Squeezy
    // NOTE: Lemon Squeezy API does NOT support idempotency keys, so we handle it at app level
    const result = await createUsageRecord({
      subscriptionItemId: user.subscription.lemonsqueezy_subscription_item_id,
      quantity,
      action: 'increment' as const,  // Add to existing usage
    });

    if (result.error) {
      // Log error but don't throw - usage reporting should not block interpretations
      log.error('Usage reporting failed', {
        userId,
        interpretationId,
        subscriptionId: user.subscription.lemonsqueezy_subscription_id,
        error: result.error
      });
      return false;
    }

    // 8. Mark interpretation as reported (prevent duplicates)
    await prisma.interpretation.update({
      where: { id: interpretationId },
      data: { usage_reported: true }
    });

    // 9. Success
    log.info('Usage reported to Lemon Squeezy', {
      userId,
      interpretationId,
      subscriptionId: user.subscription.lemonsqueezy_subscription_id,
      quantity,
      usageRecordId: result.data?.data.id
    });

    return true;

  } catch (error) {
    // Non-blocking error handling - log but don't throw
    log.error('Usage reporting exception', {
      userId,
      interpretationId,
      error
    });
    return false;
  }
}

/**
 * Get current usage for a PAYG subscription (for reconciliation)
 *
 * @param _subscriptionId - Lemon Squeezy subscription ID (unused - placeholder for future implementation)
 * @returns Current usage count or null if error
 */
export async function getSubscriptionUsage(_subscriptionId: string): Promise<number | null> {
  try {
    configureLemonSqueezy();

    // Note: This would require implementing the getSubscriptionItem and related calls
    // from Lemon Squeezy API to fetch current usage. For now, returning null.
    // This would be used by the reconciliation cron job (Task 54).

    log.warn('getSubscriptionUsage not fully implemented', {
      message: 'Requires Lemon Squeezy API integration',
      subscriptionId: _subscriptionId
    });
    return null;

  } catch (error) {
    log.error('Error fetching subscription usage', {
      subscriptionId: _subscriptionId,
      error
    });
    return null;
  }
}