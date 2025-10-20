/**
 * LLM Cost Protection Circuit Breaker
 *
 * CRITICAL: This module implements 3-layer cost protection to prevent runaway LLM API costs
 * from destroying the 80% gross margin goal. All LLM API calls MUST check cost budget BEFORE
 * making requests and track costs AFTER receiving responses.
 *
 * **3-Layer Protection Architecture:**
 *
 * - **Layer 1 - Daily Limit:** Prevents total daily cost overruns across all users ($50/day default)
 * - **Layer 2 - Hourly Limit:** Catches sudden cost spikes like coordinated attacks ($5/hour default)
 * - **Layer 3 - Per-User Daily Limit:** Prevents individual user abuse ($1/user/day default)
 *
 * **Fail-Open Behavior:**
 * When Redis (Vercel KV) is unavailable, the circuit breaker fails open (allows requests)
 * instead of blocking users. This prioritizes user experience over temporary cost risk.
 *
 * **Risk Mitigation:**
 * - Attack scenario: 10 accounts × 10 messages = 100 interpretations × $0.02 = $200 loss in 1 hour
 * - Solution: Multi-layer cost limits prevent this scenario from day 1
 *
 * @module lib/llm/costCircuitBreaker
 * @see /lib/llm/README.md for integration documentation
 */

import { kv } from '@/lib/kv/client';
import { logger } from '@/lib/observability/logger';
import * as Sentry from '@sentry/nextjs';

/**
 * Result of cost budget check.
 *
 * @property allowed - Whether the request is allowed (within budget)
 * @property reason - Human-readable reason for denial (if not allowed)
 * @property layer - Which layer triggered the circuit breaker ('daily', 'hourly', or 'user')
 * @property currentCost - Current cost at the triggered layer
 * @property limit - Limit at the triggered layer
 */
export interface CostCheckResult {
  allowed: boolean;
  reason?: string;
  layer?: 'daily' | 'hourly' | 'user';
  currentCost?: number;
  limit?: number;
}

/**
 * Cost limit configuration from environment variables.
 * Falls back to safe defaults if not configured.
 */
const COST_LIMIT_DAILY = parseFloat(process.env.COST_LIMIT_DAILY || '50');
const COST_LIMIT_HOURLY = parseFloat(process.env.COST_LIMIT_HOURLY || '5');
const COST_LIMIT_USER_DAILY = parseFloat(
  process.env.COST_LIMIT_USER_DAILY || '1'
);

/**
 * Check if a request is within cost budget across all 3 protection layers.
 *
 * **3-Layer Protection:**
 * 1. Daily Limit: Prevents total daily cost overruns across all users
 * 2. Hourly Limit: Catches sudden cost spikes (e.g., coordinated attacks)
 * 3. Per-User Daily Limit: Prevents individual user abuse
 *
 * **Fail-Open Behavior:**
 * If Redis is unavailable, returns `{ allowed: true }` to prevent blocking users.
 * Temporary cost risk is acceptable vs. complete service outage.
 *
 * @param userId - User ID to check budget for
 * @returns Promise resolving to cost check result
 *
 * @example
 * ```typescript
 * const costCheck = await checkCostBudget(user.id);
 * if (!costCheck.allowed) {
 *   return NextResponse.json({ error: 'SERVICE_OVERLOADED' }, { status: 503 });
 * }
 * ```
 */
export async function checkCostBudget(
  userId: string
): Promise<CostCheckResult> {
  try {
    // Generate date/time keys for Redis lookups
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentHour = new Date().getHours().toString().padStart(2, '0'); // HH

    // LAYER 1: Daily Limit Check ($50/day default)
    const dailyCostKey = `cost:daily:${today}`;
    const dailyCost = parseFloat((await kv.get(dailyCostKey)) || '0');

    // Check for 80% threshold warning
    if (dailyCost >= COST_LIMIT_DAILY * 0.8 && dailyCost < COST_LIMIT_DAILY) {
      Sentry.captureMessage('Daily cost limit warning - 80% threshold', {
        level: 'warning',
        tags: { circuit_breaker: 'daily', threshold: '80%' },
        extra: {
          currentCost: dailyCost,
          limit: COST_LIMIT_DAILY,
          percentage: ((dailyCost / COST_LIMIT_DAILY) * 100).toFixed(2),
        },
      });
    }

    // Check if limit exceeded
    if (dailyCost >= COST_LIMIT_DAILY) {
      logger.warn(
        {
          dailyCost,
          limit: COST_LIMIT_DAILY,
        },
        'Daily cost limit exceeded'
      );

      // Send Sentry alert for circuit breaker trigger
      Sentry.captureMessage('Cost circuit breaker triggered', {
        level: 'error',
        tags: { circuit_breaker: 'daily', triggered: true },
        extra: {
          userId,
          layer: 'daily',
          currentCost: dailyCost,
          limit: COST_LIMIT_DAILY,
        },
      });

      return {
        allowed: false,
        reason: 'Daily cost limit exceeded',
        layer: 'daily',
        currentCost: dailyCost,
        limit: COST_LIMIT_DAILY,
      };
    }

    // LAYER 2: Hourly Limit Check ($5/hour default)
    const hourlyCostKey = `cost:hourly:${today}:${currentHour}`;
    const hourlyCost = parseFloat((await kv.get(hourlyCostKey)) || '0');

    // Check for 80% threshold warning
    if (hourlyCost >= COST_LIMIT_HOURLY * 0.8 && hourlyCost < COST_LIMIT_HOURLY) {
      Sentry.captureMessage('Hourly cost limit warning - 80% threshold', {
        level: 'warning',
        tags: { circuit_breaker: 'hourly', threshold: '80%' },
        extra: {
          currentCost: hourlyCost,
          limit: COST_LIMIT_HOURLY,
          percentage: ((hourlyCost / COST_LIMIT_HOURLY) * 100).toFixed(2),
        },
      });
    }

    // Check if limit exceeded
    if (hourlyCost >= COST_LIMIT_HOURLY) {
      logger.warn(
        {
          hourlyCost,
          limit: COST_LIMIT_HOURLY,
        },
        'Hourly cost limit exceeded'
      );

      // Send Sentry alert for circuit breaker trigger
      Sentry.captureMessage('Cost circuit breaker triggered', {
        level: 'error',
        tags: { circuit_breaker: 'hourly', triggered: true },
        extra: {
          userId,
          layer: 'hourly',
          currentCost: hourlyCost,
          limit: COST_LIMIT_HOURLY,
        },
      });

      return {
        allowed: false,
        reason: 'Hourly cost limit exceeded',
        layer: 'hourly',
        currentCost: hourlyCost,
        limit: COST_LIMIT_HOURLY,
      };
    }

    // LAYER 3: Per-User Daily Limit Check ($1/user/day default)
    const userDailyCostKey = `cost:user:${userId}:${today}`;
    const userDailyCost = parseFloat((await kv.get(userDailyCostKey)) || '0');
    if (userDailyCost >= COST_LIMIT_USER_DAILY) {
      logger.warn(
        {
          userId,
          userDailyCost,
          limit: COST_LIMIT_USER_DAILY,
        },
        'User daily cost limit exceeded'
      );

      // Send Sentry alert for circuit breaker trigger
      Sentry.captureMessage('Cost circuit breaker triggered', {
        level: 'error',
        tags: { circuit_breaker: 'user', triggered: true },
        extra: {
          userId,
          layer: 'user',
          currentCost: userDailyCost,
          limit: COST_LIMIT_USER_DAILY,
        },
      });

      return {
        allowed: false,
        reason: 'User daily cost limit exceeded',
        layer: 'user',
        currentCost: userDailyCost,
        limit: COST_LIMIT_USER_DAILY,
      };
    }

    // All limits passed - allow request
    return { allowed: true };
  } catch (error) {
    // FAIL OPEN: If Redis is down, allow request (don't block users)
    logger.error(
      {
        error,
      },
      'Cost circuit breaker failed - allowing request (fail open)'
    );
    return { allowed: true };
  }
}

/**
 * Track cost of an LLM API call across all 3 protection layers.
 *
 * **Atomic Operations:**
 * Uses `kv.incrbyfloat()` for atomic increments to prevent race conditions
 * in concurrent serverless function executions.
 *
 * **TTL Strategy:**
 * - Daily keys: 24 hours (auto-reset at midnight UTC)
 * - Hourly keys: 1 hour (auto-expire)
 * - User daily keys: 24 hours (per-user limits reset daily)
 *
 * **Fail Gracefully:**
 * If Redis is unavailable, logs error but doesn't throw to prevent blocking
 * the operation that made the LLM call.
 *
 * @param userId - User ID to track cost for
 * @param costUsd - Cost in USD to track (e.g., 0.02 for 2 cents)
 * @returns Promise that resolves when tracking is complete
 *
 * @example
 * ```typescript
 * // After successful LLM API call
 * await trackCost(user.id, result.metadata.costUsd);
 * ```
 */
export async function trackCost(
  userId: string,
  costUsd: number
): Promise<void> {
  try {
    // Generate date/time keys (same format as checkCostBudget)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentHour = new Date().getHours().toString().padStart(2, '0'); // HH

    // Increment daily cost with 24-hour TTL
    const dailyCostKey = `cost:daily:${today}`;
    await kv.incrbyfloat(dailyCostKey, costUsd);
    await kv.expire(dailyCostKey, 86400); // 24 hours TTL

    // Increment hourly cost with 1-hour TTL
    const hourlyCostKey = `cost:hourly:${today}:${currentHour}`;
    await kv.incrbyfloat(hourlyCostKey, costUsd);
    await kv.expire(hourlyCostKey, 3600); // 1 hour TTL

    // Increment per-user daily cost with 24-hour TTL
    const userDailyCostKey = `cost:user:${userId}:${today}`;
    await kv.incrbyfloat(userDailyCostKey, costUsd);
    await kv.expire(userDailyCostKey, 86400); // 24 hours TTL

    // Log cost tracking for monitoring
    logger.info(
      {
        userId,
        costUsd,
        dailyCostKey,
        hourlyCostKey,
        userDailyCostKey,
      },
      'Cost tracked'
    );
  } catch (error) {
    // FAIL GRACEFULLY: Log error but don't throw
    // Allow operation to continue even if cost tracking fails
    logger.error(
      {
        error,
        userId,
        costUsd,
      },
      'Cost tracking failed - continuing (fail gracefully)'
    );
  }
}
