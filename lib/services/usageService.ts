/**
 * Usage Service
 *
 * Handles usage limit checking for different user tiers.
 * Implements tier-specific message limits:
 * - Trial: 10 messages total (lifetime)
 * - Pro: 100 messages per month (resets monthly)
 * - PAYG (Pay-As-You-Go): Unlimited (billed per message)
 *
 * CRITICAL: This service queries the DATABASE for tier and usage information.
 * NEVER use JWT app_metadata for tier checks (Risk Mitigation #1).
 *
 * @see architecture/5-api-specification.md#usage-limits-by-tier
 * @see architecture/14-critical-risk-mitigation.md#risk-1
 */

import { findUserById } from '@/lib/db/repositories/userRepository';
import { logger } from '@/lib/observability/logger';

/**
 * Result of usage limit check.
 *
 * @property allowed - Whether the request is allowed (within quota)
 * @property messagesRemaining - Number of messages remaining (undefined for PAYG)
 * @property error - Error code if not allowed
 * @property message - Human-readable error message if not allowed
 */
export interface UsageCheckResult {
  allowed: boolean;
  messagesRemaining?: number;
  error?: string;
  message?: string;
}

/**
 * Tier limits configuration.
 * Can be overridden with environment variables for flexibility.
 */
const TRIAL_LIMIT = parseInt(process.env.TRIAL_MESSAGE_LIMIT || '10', 10);
const PRO_LIMIT = parseInt(process.env.PRO_MESSAGE_LIMIT || '100', 10);

/**
 * Checks if user has available message quota based on tier and current usage.
 *
 * CRITICAL: Always queries database for tier/usage (never uses JWT app_metadata).
 * This ensures paid users get immediate access even if JWT is stale.
 *
 * **Tier-Specific Behavior:**
 * - **Trial Users:** 10 messages total (lifetime limit)
 *   - Blocked when messages_used_count >= 10
 *   - Error: 'TRIAL_LIMIT_EXCEEDED'
 *
 * - **Pro Users:** 100 messages per month (resets monthly)
 *   - Blocked when messages_used_count >= 100
 *   - Error: 'PRO_LIMIT_EXCEEDED'
 *   - Monthly reset handled by scheduled job (not implemented in this story)
 *
 * - **PAYG Users:** Unlimited messages (billed per use)
 *   - Always allowed
 *   - messagesRemaining: undefined (no limit)
 *   - Charged via Lemon Squeezy metered billing
 *
 * @param userId - Supabase Auth user UUID
 * @returns Promise resolving to usage check result
 *
 * @example
 * ```typescript
 * // In API route
 * const usageCheck = await checkUsageLimit(user.id);
 * if (!usageCheck.allowed) {
 *   return NextResponse.json(
 *     { success: false, error: { code: usageCheck.error, message: usageCheck.message }},
 *     { status: 403 }
 *   );
 * }
 * ```
 *
 * @throws {Error} If user not found in database
 */
export async function checkUsageLimit(
  userId: string
): Promise<UsageCheckResult> {
  // CRITICAL: Query database for tier and usage (NOT JWT)
  // This ensures paid users get access immediately after payment
  const userRecord = await findUserById(userId);

  if (!userRecord) {
    logger.error({ userId }, 'User not found during usage check');
    throw new Error('User not found');
  }

  const { tier, messages_used_count } = userRecord;

  logger.debug(
    {
      userId,
      tier,
      messages_used_count,
    },
    'Checking usage limit'
  );

  // PAYG users: Always allowed (unlimited)
  if (tier === 'payg') {
    return {
      allowed: true,
      messagesRemaining: undefined, // No limit
    };
  }

  // Trial users: 10 messages total
  if (tier === 'trial') {
    const remaining = TRIAL_LIMIT - messages_used_count;

    if (messages_used_count >= TRIAL_LIMIT) {
      logger.info(
        {
          userId,
          tier,
          messages_used_count,
          limit: TRIAL_LIMIT,
        },
        'Trial limit exceeded'
      );

      return {
        allowed: false,
        messagesRemaining: 0,
        error: 'TRIAL_LIMIT_EXCEEDED',
        message: `Trial limit of ${TRIAL_LIMIT} messages exceeded. Upgrade to Pro or Pay-As-You-Go to continue.`,
      };
    }

    return {
      allowed: true,
      messagesRemaining: remaining,
    };
  }

  // Pro users: 100 messages per month
  if (tier === 'pro') {
    const remaining = PRO_LIMIT - messages_used_count;

    if (messages_used_count >= PRO_LIMIT) {
      logger.info(
        {
          userId,
          tier,
          messages_used_count,
          limit: PRO_LIMIT,
        },
        'Pro monthly limit exceeded'
      );

      return {
        allowed: false,
        messagesRemaining: 0,
        error: 'PRO_LIMIT_EXCEEDED',
        message: `Pro monthly limit of ${PRO_LIMIT} messages exceeded. Upgrade to Pay-As-You-Go for unlimited messages or wait for monthly reset.`,
      };
    }

    return {
      allowed: true,
      messagesRemaining: remaining,
    };
  }

  // Unknown tier (should never happen, but handle defensively)
  logger.error(
    {
      userId,
      tier,
    },
    'Unknown user tier during usage check'
  );

  throw new Error(`Unknown user tier: ${tier}`);
}
