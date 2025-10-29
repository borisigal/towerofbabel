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

import {
  findUserById,
  resetProUserUsage,
} from '@/lib/db/repositories/userRepository';
import { logger } from '@/lib/observability/logger';

/**
 * Result of usage limit check.
 *
 * @property allowed - Whether the request is allowed (within quota)
 * @property messagesRemaining - Number of messages remaining (undefined for PAYG)
 * @property error - Error code if not allowed
 * @property message - Human-readable error message if not allowed
 * @property tier - User tier
 * @property messagesUsed - Current message usage count
 * @property messagesLimit - Message limit for the tier
 * @property daysElapsed - Days since trial start (for trial users)
 * @property trialEndDate - Trial expiration date (for trial users)
 * @property resetDate - Next reset date (for Pro users)
 */
export interface UsageCheckResult {
  allowed: boolean;
  messagesRemaining?: number;
  error?: string;
  message?: string;
  tier?: string;
  messagesUsed?: number;
  messagesLimit?: number;
  daysElapsed?: number;
  trialEndDate?: string;
  resetDate?: string;
}

/**
 * Result of trial expiration check.
 *
 * @property expired - Whether the trial period has expired
 * @property daysElapsed - Number of days since trial start
 * @property trialEndDate - ISO string of when trial expires/expired
 */
interface TrialExpirationCheck {
  expired: boolean;
  daysElapsed: number;
  trialEndDate: string;
}

/**
 * Tier limits configuration.
 * Can be overridden with environment variables for flexibility.
 */
const TRIAL_MESSAGE_LIMIT = parseInt(
  process.env.TRIAL_MESSAGE_LIMIT || '10',
  10
);
const TRIAL_DAYS_LIMIT = parseInt(process.env.TRIAL_DAYS_LIMIT || '14', 10);
const PRO_MESSAGE_LIMIT = parseInt(
  process.env.PRO_MESSAGE_LIMIT || '100',
  10
);

/**
 * Checks if trial user has exceeded the 14-day trial period.
 *
 * Calculates days elapsed since trial_start_date and compares against
 * TRIAL_DAYS_LIMIT environment variable (default: 14 days).
 *
 * @param user - User record with trial_start_date field
 * @returns Trial expiration check result with expired flag and days elapsed
 *
 * @example
 * ```typescript
 * const expirationCheck = checkTrialExpired(user);
 * if (expirationCheck.expired) {
 *   return error('TRIAL_EXPIRED', `Trial expired ${expirationCheck.daysElapsed} days ago`);
 * }
 * ```
 */
function checkTrialExpired(user: {
  trial_start_date: Date;
}): TrialExpirationCheck {
  const now = Date.now();
  const trialStartMs = user.trial_start_date.getTime();
  const msElapsed = now - trialStartMs;
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));

  // Calculate trial end date (trial_start_date + TRIAL_DAYS_LIMIT days)
  const trialEndMs = trialStartMs + TRIAL_DAYS_LIMIT * 24 * 60 * 60 * 1000;
  const trialEndDate = new Date(trialEndMs).toISOString();

  return {
    expired: daysElapsed > TRIAL_DAYS_LIMIT,
    daysElapsed,
    trialEndDate,
  };
}

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

  // Trial users: Check BOTH time limit (14 days) AND message limit (10 messages)
  if (tier === 'trial') {
    // Check trial expiration FIRST (time-based check)
    const expirationCheck = checkTrialExpired({
      trial_start_date: userRecord.trial_start_date || new Date(),
    });

    if (expirationCheck.expired) {
      logger.info(
        {
          userId,
          tier,
          days_elapsed: expirationCheck.daysElapsed,
          trial_end_date: expirationCheck.trialEndDate,
        },
        'Trial period expired'
      );

      return {
        allowed: false,
        messagesRemaining: 0,
        error: 'TRIAL_EXPIRED',
        message: `Trial period expired (${TRIAL_DAYS_LIMIT} days)`,
        tier: 'trial',
        daysElapsed: expirationCheck.daysElapsed,
        trialEndDate: expirationCheck.trialEndDate,
      };
    }

    // Check message limit SECOND
    const remaining = TRIAL_MESSAGE_LIMIT - messages_used_count;

    if (messages_used_count >= TRIAL_MESSAGE_LIMIT) {
      logger.info(
        {
          userId,
          tier,
          messages_used_count,
          limit: TRIAL_MESSAGE_LIMIT,
        },
        'Trial limit exceeded'
      );

      return {
        allowed: false,
        messagesRemaining: 0,
        error: 'TRIAL_LIMIT_EXCEEDED',
        message: `Trial limit of ${TRIAL_MESSAGE_LIMIT} messages exceeded`,
        tier: 'trial',
        messagesUsed: messages_used_count,
        messagesLimit: TRIAL_MESSAGE_LIMIT,
      };
    }

    return {
      allowed: true,
      messagesRemaining: remaining,
    };
  }

  // Pro users: 100 messages per month with automatic reset
  if (tier === 'pro') {
    // Check if reset is needed FIRST (automatic reset on-demand)
    if (
      userRecord.messages_reset_date &&
      Date.now() > userRecord.messages_reset_date.getTime()
    ) {
      logger.info(
        {
          userId,
          tier,
          old_messages_used: messages_used_count,
          reset_date: userRecord.messages_reset_date,
        },
        'Auto-resetting Pro user usage (reset date reached)'
      );

      // Reset usage and update reset date to next month
      await resetProUserUsage(userId);

      // After reset, user has full quota available
      return {
        allowed: true,
        messagesRemaining: PRO_MESSAGE_LIMIT,
      };
    }

    // Check message limit SECOND
    const remaining = PRO_MESSAGE_LIMIT - messages_used_count;

    if (messages_used_count >= PRO_MESSAGE_LIMIT) {
      logger.info(
        {
          userId,
          tier,
          messages_used_count,
          limit: PRO_MESSAGE_LIMIT,
          reset_date: userRecord.messages_reset_date,
        },
        'Pro monthly limit exceeded'
      );

      return {
        allowed: false,
        messagesRemaining: 0,
        error: 'PRO_LIMIT_EXCEEDED',
        message: `Pro monthly limit of ${PRO_MESSAGE_LIMIT} messages exceeded`,
        tier: 'pro',
        messagesUsed: messages_used_count,
        messagesLimit: PRO_MESSAGE_LIMIT,
        resetDate: userRecord.messages_reset_date?.toISOString(),
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
