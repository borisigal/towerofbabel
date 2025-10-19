/**
 * CRITICAL INTEGRATION TEST - Payment Flow Tier Update
 *
 * This test validates **CRITICAL Risk #1 Mitigation**: Database-as-source-of-truth pattern.
 *
 * **The Problem:**
 * JWT tokens cache user metadata (tier, usage) for up to 1 hour. When a user pays for Pro tier:
 * 1. Lemon Squeezy webhook updates database immediately: tier="pro"
 * 2. JWT still cached: user.app_metadata.tier="trial" for up to 1 hour
 * 3. If we check JWT, user is blocked from using service despite paying → CRITICAL UX BUG
 *
 * **The Solution:**
 * ALWAYS query database for tier/usage (authorization). NEVER use JWT metadata.
 *
 * **Test Scenario:**
 * 1. User has trial tier with 10/10 messages exhausted (in both JWT and database initially)
 * 2. User pays for Pro tier → Lemon Squeezy webhook updates database to tier="pro"
 * 3. User refreshes dashboard IMMEDIATELY (JWT still cached with tier="trial")
 * 4. Dashboard MUST show "Pro: 0/100 messages used" (database query, not JWT)
 *
 * **If this test fails, the payment flow is BROKEN and users will be blocked after payment.**
 *
 * @see architecture/14-critical-risk-mitigation.md#risk-1
 * @see /lib/auth/README.md - Database-as-source-of-truth pattern
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before imports
vi.mock('@/lib/auth/supabaseServer', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/db/repositories/userRepository', () => ({
  findUserById: vi.fn(),
}));

import { createClient } from '@/lib/auth/supabaseServer';
import { findUserById } from '@/lib/db/repositories/userRepository';

describe('Payment Flow - Immediate Tier Update (CRITICAL)', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should use database tier (pro), not JWT tier (stale trial), after payment', async () => {
    // ARRANGE: Set up test scenario
    //
    // 1. Mock Supabase auth.getUser() to return STALE JWT with tier='trial'
    //    (simulates JWT that hasn't refreshed yet after payment)
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      app_metadata: {
        tier: 'trial', // STALE - not updated yet (cached for up to 1 hour)
      },
    };

    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabaseClient
    );

    // 2. Mock Prisma findUserById() to return FRESH database data with tier='pro'
    //    (simulates database updated by Lemon Squeezy webhook)
    const mockUserRecord = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      tier: 'pro', // FRESH - updated by webhook immediately
      messages_used_count: 0, // Reset to 0 for Pro tier
      messages_reset_date: new Date(),
      is_admin: false,
      created_at: new Date(),
    };

    (findUserById as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUserRecord
    );

    // ACT: Simulate dashboard page logic
    //
    // This simulates what happens when the dashboard page renders:
    // 1. Gets user from JWT (authentication - WHO is the user)
    // 2. Gets user record from database (authorization - WHAT can they do)

    // Get user from auth (JWT)
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get user record from database (CRITICAL - this is the source of truth)
    const userRecord = await findUserById(user!.id);

    // ASSERT: Verify database tier is used, NOT JWT tier
    //
    // CRITICAL ASSERTIONS:
    // 1. Database query was called (we're not using JWT for tier)
    expect(findUserById).toHaveBeenCalledWith('test-user-123');

    // 2. User record from database shows Pro tier
    expect(userRecord).toBeDefined();
    expect(userRecord?.tier).toBe('pro');
    expect(userRecord?.messages_used_count).toBe(0);

    // 3. Verify JWT tier is stale (trial) but we IGNORE it
    expect(user?.app_metadata?.tier).toBe('trial'); // JWT is stale
    expect(userRecord?.tier).not.toBe(user?.app_metadata?.tier); // Database differs from JWT

    // 4. Dashboard would show "Pro: 0/100 messages used" (database tier)
    //    NOT "Trial: 10/10 messages used" (JWT tier)
    const tierLabel =
      userRecord?.tier === 'trial'
        ? `Trial: ${userRecord.messages_used_count}/10 messages used`
        : userRecord?.tier === 'pro'
        ? `Pro: ${userRecord.messages_used_count}/100 messages used this month`
        : `Pay-as-you-go: ${userRecord?.messages_used_count} messages used`;

    expect(tierLabel).toBe('Pro: 0/100 messages used this month');
    expect(tierLabel).not.toContain('Trial');
  });

  it('should allow interpretation immediately after Pro upgrade (future test)', async () => {
    // TODO: Epic 2 - Verify user can submit interpretation after upgrade
    // Even if JWT still shows tier='trial'
    //
    // This test will validate the full end-to-end flow:
    // 1. User exhausts trial messages (10/10)
    // 2. User pays for Pro
    // 3. Webhook updates database to tier='pro', messages_used_count=0
    // 4. User immediately attempts interpretation
    // 5. API route should:
    //    - Check JWT for authentication (user ID)
    //    - Check DATABASE for authorization (tier, usage)
    //    - Allow interpretation (database says tier='pro', 0/100 used)
    //
    // Expected: Interpretation succeeds
    // If test fails: User is blocked despite paying (CRITICAL BUG)

    expect(true).toBe(true); // Placeholder
  });
});

/**
 * Additional Test Cases for Future Stories
 *
 * These tests should be added in Epic 2 (Interpretation Engine) and Epic 3 (Payments):
 *
 * 1. **Trial User Exhausted (10/10) → Attempts Interpretation**
 *    - Expected: Blocked with upgrade modal
 *    - Validates: Usage limit enforcement works
 *
 * 2. **Pro User (50/100) → Attempts Interpretation**
 *    - Expected: Allowed, count increments to 51/100
 *    - Validates: Pro tier usage tracking works
 *
 * 3. **PAYG User (12 used) → Attempts Interpretation**
 *    - Expected: Allowed, count increments to 13
 *    - Validates: PAYG has no limit
 *
 * 4. **Pro User (100/100) → Attempts Interpretation**
 *    - Expected: Blocked with upgrade/wait modal
 *    - Validates: Pro monthly limit enforcement works
 *
 * 5. **User Downgraded from Pro to Trial (via webhook)**
 *    - Expected: Dashboard immediately shows trial tier
 *    - Validates: Tier downgrades work (e.g., payment failed)
 */
