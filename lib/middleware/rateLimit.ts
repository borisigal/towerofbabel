/**
 * Rate Limiting Middleware
 *
 * Implements IP-based rate limiting to prevent abuse and protect API endpoints.
 * Uses Vercel KV (Redis) for distributed rate limit tracking across serverless functions.
 *
 * **Configuration:**
 * - Default: 50 requests per hour per IP address
 * - Configurable via RATE_LIMIT_PER_HOUR environment variable
 * - TTL: 1 hour (auto-reset)
 *
 * **Response Headers:**
 * - X-RateLimit-Limit: Maximum requests per hour
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 *
 * **Fail-Open Behavior:**
 * If Redis is unavailable, allows request (prioritizes availability over strict rate limiting).
 *
 * @see architecture/5-api-specification.md#rate-limiting-configuration
 */

import { kv } from '@/lib/kv/client';
import { logger } from '@/lib/observability/logger';

/**
 * Result of rate limit check.
 *
 * @property allowed - Whether the request is allowed (within rate limit)
 * @property limit - Maximum requests per hour
 * @property remaining - Requests remaining in current window
 * @property reset - Unix timestamp (seconds) when limit resets
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limit configuration from environment variables.
 * Default: 50 requests per hour per IP address.
 */
const RATE_LIMIT_PER_HOUR = parseInt(
  process.env.RATE_LIMIT_PER_HOUR || '50',
  10
);

/**
 * Checks if an IP address is within rate limit.
 *
 * Uses sliding window algorithm with 1-hour TTL.
 * Atomic increment operations prevent race conditions in serverless environment.
 *
 * **Fail-Open Behavior:**
 * If Redis is unavailable, returns `{ allowed: true }` to prevent service outage.
 * Temporary lack of rate limiting is acceptable vs. blocking all users.
 *
 * **Rate Limit Headers:**
 * Return value includes headers to send to client:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Requests left in current window
 * - X-RateLimit-Reset: When limit resets (Unix timestamp)
 *
 * @param ip - Client IP address (from x-forwarded-for or remote address)
 * @param limit - Optional custom limit (defaults to RATE_LIMIT_PER_HOUR)
 * @returns Promise resolving to rate limit result
 *
 * @example
 * ```typescript
 * // In API route
 * const ip = req.headers.get('x-forwarded-for') || 'unknown';
 * const rateLimit = await checkRateLimit(ip);
 *
 * if (!rateLimit.allowed) {
 *   return NextResponse.json(
 *     { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }},
 *     {
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': rateLimit.limit.toString(),
 *         'X-RateLimit-Remaining': rateLimit.remaining.toString(),
 *         'X-RateLimit-Reset': rateLimit.reset.toString(),
 *       }
 *     }
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  ip: string,
  limit: number = RATE_LIMIT_PER_HOUR
): Promise<RateLimitResult> {
  try {
    // Generate Redis key for this IP address
    const key = `ratelimit:ip:${ip}`;

    // Get current request count for this IP
    // If key doesn't exist, it returns null
    const current = await kv.get<number>(key);

    // Calculate reset time (1 hour from now)
    const now = Date.now();
    const resetTime = Math.floor(now / 1000) + 3600; // Unix timestamp + 1 hour

    // If this is first request from this IP
    if (current === null) {
      // Initialize counter to 1
      await kv.set(key, 1, { ex: 3600 }); // 3600 seconds = 1 hour TTL

      logger.debug(
        {
          ip,
          current: 1,
          limit,
          remaining: limit - 1,
        },
        'Rate limit check - first request'
      );

      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        reset: resetTime,
      };
    }

    // Check if limit exceeded
    if (current >= limit) {
      logger.info(
        {
          ip,
          current,
          limit,
        },
        'Rate limit exceeded'
      );

      return {
        allowed: false,
        limit,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Increment counter (atomic operation)
    const newCount = await kv.incr(key);

    // Ensure TTL is set (in case it was lost)
    await kv.expire(key, 3600);

    const remaining = Math.max(0, limit - newCount);

    logger.debug(
      {
        ip,
        current: newCount,
        limit,
        remaining,
      },
      'Rate limit check - allowed'
    );

    return {
      allowed: true,
      limit,
      remaining,
      reset: resetTime,
    };
  } catch (error) {
    // FAIL OPEN: If Redis is down, allow request (don't block users)
    logger.error(
      {
        error,
        ip,
      },
      'Rate limit check failed - allowing request (fail open)'
    );

    // Return default values (allow request)
    const resetTime = Math.floor(Date.now() / 1000) + 3600;
    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: resetTime,
    };
  }
}

/**
 * Gets current rate limit status for an IP address without incrementing counter.
 *
 * Used for status checks or monitoring.
 * Does not affect the rate limit counter.
 *
 * @param ip - Client IP address
 * @param limit - Optional custom limit (defaults to RATE_LIMIT_PER_HOUR)
 * @returns Promise resolving to rate limit status
 */
export async function getRateLimitStatus(
  ip: string,
  limit: number = RATE_LIMIT_PER_HOUR
): Promise<RateLimitResult> {
  try {
    const key = `ratelimit:ip:${ip}`;
    const current = (await kv.get<number>(key)) || 0;
    const resetTime = Math.floor(Date.now() / 1000) + 3600;
    const remaining = Math.max(0, limit - current);

    return {
      allowed: current < limit,
      limit,
      remaining,
      reset: resetTime,
    };
  } catch (error) {
    logger.error({ error, ip }, 'Rate limit status check failed');

    const resetTime = Math.floor(Date.now() / 1000) + 3600;
    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: resetTime,
    };
  }
}
