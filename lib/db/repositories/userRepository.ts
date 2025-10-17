/**
 * User Repository
 *
 * ALL database access for User model MUST go through these repository functions.
 * Direct Prisma calls in API routes are FORBIDDEN.
 *
 * Repository Pattern Benefits:
 * - Centralized database access (easy to test and mock)
 * - Circuit breaker protection on all queries
 * - Consistent query optimization (explicit select clauses)
 * - Future database migration made easier
 *
 * CRITICAL: All queries use explicit `select` clauses to fetch only needed columns.
 * This reduces query time and releases database connections faster.
 *
 * @see architecture/16-coding-standards.md#repository-pattern-mandatory
 */

import prisma from '@/lib/db/prisma';
import { executeWithCircuitBreaker } from '@/lib/db/connectionMonitor';

/**
 * Finds a user by ID with optimized field selection.
 *
 * Returns user tier and usage information needed for authorization checks.
 * CRITICAL: This is the source of truth for tier/usage (NOT JWT app_metadata).
 *
 * @param userId - User UUID (matches Supabase Auth user ID)
 * @returns User record with tier and usage fields, or null if not found
 *
 * @example
 * ```typescript
 * const user = await findUserById('user-123');
 * if (!user) {
 *   return error('User not found');
 * }
 * if (user.tier === 'trial' && user.messages_used_count >= 10) {
 *   return error('Trial limit exceeded');
 * }
 * ```
 */
export async function findUserById(userId: string) {
  return executeWithCircuitBreaker(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        messages_used_count: true,
        messages_reset_date: true,
        is_admin: true,
        created_at: true,
      },
    })
  );
}

/**
 * Finds a user by email with optimized field selection.
 *
 * Used during authentication flow to check if user exists.
 *
 * @param email - User email address
 * @returns User record or null if not found
 */
export async function findUserByEmail(email: string) {
  return executeWithCircuitBreaker(() =>
    prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        messages_used_count: true,
        created_at: true,
      },
    })
  );
}

/**
 * Creates a new user with default trial tier.
 *
 * Called during user sign-up after Supabase Auth account is created.
 * User ID must match Supabase Auth UUID for proper authorization.
 *
 * @param data - User creation data
 * @returns Created user record
 *
 * @example
 * ```typescript
 * const { data: { user } } = await supabase.auth.signUp({ email, password });
 * const userRecord = await createUser({
 *   id: user.id,
 *   email: user.email,
 *   name: user.user_metadata.name
 * });
 * ```
 */
export async function createUser(data: {
  id: string;
  email: string;
  name?: string;
}) {
  return executeWithCircuitBreaker(() =>
    prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        tier: 'trial',
        messages_used_count: 0,
        messages_reset_date: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        messages_used_count: true,
      },
    })
  );
}

/**
 * Increments user message usage count.
 *
 * Called after each successful interpretation.
 * Used for tier limit enforcement (trial: 10, pro: 100/month).
 *
 * @param userId - User UUID
 * @returns Updated user record with new message count
 */
export async function incrementUserUsage(userId: string) {
  return executeWithCircuitBreaker(() =>
    prisma.user.update({
      where: { id: userId },
      data: {
        messages_used_count: {
          increment: 1,
        },
      },
      select: {
        messages_used_count: true,
        tier: true,
      },
    })
  );
}

/**
 * Updates user tier (e.g., trial → pro).
 *
 * Called by Lemon Squeezy webhook handler when subscription is activated.
 * Immediately updates database (JWT will be stale for up to 1 hour, but database is source of truth).
 *
 * @param userId - User UUID
 * @param tier - New tier value ("trial" | "payg" | "pro")
 * @returns Updated user record
 */
export async function updateUserTier(
  userId: string,
  tier: 'trial' | 'payg' | 'pro'
) {
  return executeWithCircuitBreaker(() =>
    prisma.user.update({
      where: { id: userId },
      data: { tier },
      select: {
        id: true,
        tier: true,
        messages_used_count: true,
      },
    })
  );
}

/**
 * Resets user message count (monthly reset for Pro users).
 *
 * Called by scheduled job on the 1st of each month for Pro tier users.
 *
 * @param userId - User UUID
 * @returns Updated user record
 */
export async function resetUserUsage(userId: string) {
  return executeWithCircuitBreaker(() =>
    prisma.user.update({
      where: { id: userId },
      data: {
        messages_used_count: 0,
        messages_reset_date: new Date(),
      },
      select: {
        id: true,
        messages_used_count: true,
        messages_reset_date: true,
      },
    })
  );
}

/**
 * Links user to Lemon Squeezy customer ID.
 *
 * Called when user makes first payment.
 * Enables subscription management and payment tracking.
 *
 * @param userId - User UUID
 * @param lemonSqueezyCustomerId - Lemon Squeezy customer ID
 * @returns Updated user record
 */
export async function linkLemonSqueezyCustomer(
  userId: string,
  lemonSqueezyCustomerId: string
) {
  return executeWithCircuitBreaker(() =>
    prisma.user.update({
      where: { id: userId },
      data: {
        lemonsqueezy_customer_id: lemonSqueezyCustomerId,
      },
      select: {
        id: true,
        lemonsqueezy_customer_id: true,
      },
    })
  );
}

/**
 * Gets user count (for admin monitoring).
 *
 * Simple count query used by health-check and admin endpoints.
 *
 * @returns Total number of users
 */
export async function getUserCount() {
  return executeWithCircuitBreaker(() => prisma.user.count());
}
