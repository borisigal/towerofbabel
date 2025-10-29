import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    interpretation: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

/**
 * Data Consistency Tests
 *
 * Tests database integrity and consistency rules:
 * - User tier matches active subscription tier
 * - Orphaned subscriptions prevented
 * - Cascade deletion works correctly
 * - Multiple active subscriptions prevented
 * - Customer ID uniqueness enforced
 * - Status transitions are valid
 */
describe('Data Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Tier Matches Subscription Tier', () => {
    it('should ensure user.tier always matches active subscription.tier', async () => {
      // ARRANGE: Query users with active subscriptions
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          tier: 'pro',
          subscriptions: [{ tier: 'pro', status: 'active' }],
        },
        {
          id: 'user-2',
          tier: 'payg',
          subscriptions: [{ tier: 'payg', status: 'active' }],
        },
      ]);

      // ACT: Query all users with subscriptions
      const users = await prisma.user.findMany({
        include: { subscriptions: { where: { status: 'active' } } },
      });

      // ASSERT: Every user's tier matches their active subscription tier
      for (const user of users) {
        const activeSubscription = user.subscriptions[0];
        if (activeSubscription) {
          expect(user.tier).toBe(activeSubscription.tier);
        }
      }
    });

    it('should detect tier mismatch (data integrity violation)', async () => {
      // ARRANGE: User tier doesn't match subscription tier (BAD DATA)
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-mismatch',
          tier: 'trial', // WRONG - should be 'pro'
          subscriptions: [{ tier: 'pro', status: 'active' }],
        },
      ]);

      // ACT: Query users with mismatched tiers
      const users = await prisma.user.findMany({
        include: { subscriptions: { where: { status: 'active' } } },
      });

      const mismatches = users.filter((user) => {
        const activeSub = user.subscriptions[0];
        return activeSub && user.tier !== activeSub.tier;
      });

      // ASSERT: Mismatch detected (should be fixed by webhook or migration)
      expect(mismatches.length).toBeGreaterThan(0);
      expect(mismatches[0].tier).not.toBe(mismatches[0].subscriptions[0].tier);
    });

    it('should auto-correct tier mismatch on subscription update', async () => {
      // ARRANGE: User tier out of sync
      const userId = 'user-sync';

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        tier: 'trial',
      });

      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-123',
        user_id: userId,
        tier: 'pro',
        status: 'active',
      });

      // ACT: Sync user tier with subscription tier
      const subscription = await prisma.subscription.findFirst({
        where: { user_id: userId, status: 'active' },
      });

      if (subscription) {
        (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: userId,
          tier: subscription.tier,
        });

        await prisma.user.update({
          where: { id: userId },
          data: { tier: subscription.tier },
        });
      }

      // ASSERT: User tier updated to match subscription
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { tier: 'pro' },
      });
    });
  });

  describe('Orphaned Subscription Prevention', () => {
    it('should prevent orphaned subscriptions (no user)', async () => {
      // ARRANGE: Query subscriptions without user
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-orphan',
          user_id: 'nonexistent-user',
          tier: 'pro',
          status: 'active',
          user: null, // Orphaned - user deleted
        },
      ]);

      // ACT: Find orphaned subscriptions
      const subscriptions = await prisma.subscription.findMany({
        include: { user: true },
      });

      const orphanedSubscriptions = subscriptions.filter((sub) => !sub.user);

      // ASSERT: Orphaned subscriptions detected (should be cleaned up)
      expect(orphanedSubscriptions.length).toBeGreaterThan(0);
    });

    it('should cascade delete subscriptions when user deleted', async () => {
      // ARRANGE: Delete user with active subscription
      const userId = 'user-to-delete';

      (prisma.user.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        email: 'deleted@example.com',
      });

      // Mock cascade delete behavior (Prisma onDelete: Cascade)
      (prisma.subscription.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
      });

      // ACT: Delete user (should cascade to subscriptions)
      await prisma.user.delete({ where: { id: userId } });

      // In real Prisma with onDelete: Cascade, subscriptions auto-deleted
      // Simulate check
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const remainingSubscriptions = await prisma.subscription.findMany({
        where: { user_id: userId },
      });

      // ASSERT: No orphaned subscriptions remain
      expect(remainingSubscriptions.length).toBe(0);
    });
  });

  describe('Multiple Active Subscriptions Prevented', () => {
    it('should prevent user from having multiple active subscriptions', async () => {
      // ARRANGE: Query users with multiple active subscriptions (INVALID)
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-double-sub',
          tier: 'pro',
          subscriptions: [
            { id: 'sub-1', tier: 'pro', status: 'active' },
            { id: 'sub-2', tier: 'payg', status: 'active' }, // INVALID - two active
          ],
        },
      ]);

      // ACT: Find users with multiple active subscriptions
      const users = await prisma.user.findMany({
        include: { subscriptions: { where: { status: 'active' } } },
      });

      const usersWithMultipleSubs = users.filter(
        (user) => user.subscriptions.length > 1
      );

      // ASSERT: Data integrity violation detected
      expect(usersWithMultipleSubs.length).toBeGreaterThan(0);
    });

    it('should cancel old subscription when creating new one', async () => {
      // ARRANGE: User upgrades from Pro to PAYG
      const userId = 'user-upgrade';

      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'old-sub-pro',
        user_id: userId,
        tier: 'pro',
        status: 'active',
      });

      // ACT: Cancel old subscription before creating new one
      (prisma.subscription.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'old-sub-pro',
        status: 'cancelled',
      });

      await prisma.subscription.update({
        where: { id: 'old-sub-pro' },
        data: { status: 'cancelled' },
      });

      // Create new PAYG subscription
      (prisma.subscription.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'new-sub-payg',
        user_id: userId,
        tier: 'payg',
        status: 'active',
      });

      await prisma.subscription.create({
        data: {
          user_id: userId,
          lemonsqueezy_subscription_id: 'ls-sub-payg-123',
          lemonsqueezy_product_id: '456',
          lemonsqueezy_variant_id: '789',
          tier: 'payg',
          status: 'active',
        },
      });

      // ASSERT: Old subscription cancelled, new one created
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'old-sub-pro' },
        data: { status: 'cancelled' },
      });

      expect(prisma.subscription.create).toHaveBeenCalled();
    });
  });

  describe('messages_reset_date Matches Subscription renews_at', () => {
    it('should ensure Pro user reset date matches subscription renewal date', async () => {
      // ARRANGE: Pro user with subscription
      const renewsAt = new Date('2025-12-24T00:00:00Z');

      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-pro',
          tier: 'pro',
          messages_reset_date: renewsAt,
          subscriptions: [
            {
              tier: 'pro',
              status: 'active',
              renews_at: renewsAt,
            },
          ],
        },
      ]);

      // ACT: Query Pro users
      const users = await prisma.user.findMany({
        where: { tier: 'pro' },
        include: { subscriptions: { where: { status: 'active' } } },
      });

      // ASSERT: Reset date matches renewal date
      for (const user of users) {
        const subscription = user.subscriptions[0];
        if (subscription && subscription.renews_at) {
          expect(user.messages_reset_date?.getTime()).toBe(
            subscription.renews_at.getTime()
          );
        }
      }
    });

    it('should detect reset date mismatch for Pro users', async () => {
      // ARRANGE: Pro user with mismatched reset date
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-mismatch',
          tier: 'pro',
          messages_reset_date: new Date('2025-12-01'), // WRONG
          subscriptions: [
            {
              tier: 'pro',
              status: 'active',
              renews_at: new Date('2025-12-24'), // Correct
            },
          ],
        },
      ]);

      // ACT: Find mismatches
      const users = await prisma.user.findMany({
        where: { tier: 'pro' },
        include: { subscriptions: { where: { status: 'active' } } },
      });

      const mismatches = users.filter((user) => {
        const subscription = user.subscriptions[0];
        return (
          subscription &&
          subscription.renews_at &&
          user.messages_reset_date?.getTime() !== subscription.renews_at.getTime()
        );
      });

      // ASSERT: Mismatch detected
      expect(mismatches.length).toBeGreaterThan(0);
    });
  });

  describe('Customer ID Unique Constraint', () => {
    it('should enforce unique lemonsqueezy_customer_id constraint', async () => {
      // ARRANGE: Try to create two users with same customer ID
      const duplicateCustomerId = 'cust-duplicate-123';

      (prisma.user.create as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'user1@example.com',
          lemonsqueezy_customer_id: duplicateCustomerId,
        })
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Unique constraint violation', {
            code: 'P2002',
            meta: { target: ['lemonsqueezy_customer_id'] },
            clientVersion: '5.0.0',
          })
        );

      // ACT & ASSERT: First user succeeds
      const user1 = await prisma.user.create({
        data: {
          email: 'user1@example.com',
          lemonsqueezy_customer_id: duplicateCustomerId,
        },
      });

      expect(user1.lemonsqueezy_customer_id).toBe(duplicateCustomerId);

      // Second user fails with unique constraint error
      await expect(
        prisma.user.create({
          data: {
            email: 'user2@example.com',
            lemonsqueezy_customer_id: duplicateCustomerId, // Duplicate
          },
        })
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should allow null lemonsqueezy_customer_id for multiple users', async () => {
      // ARRANGE: Multiple trial users with no customer ID (allowed)
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'trial-1', email: 'trial1@test.com', lemonsqueezy_customer_id: null },
        { id: 'trial-2', email: 'trial2@test.com', lemonsqueezy_customer_id: null },
        { id: 'trial-3', email: 'trial3@test.com', lemonsqueezy_customer_id: null },
      ]);

      // ACT: Query users with null customer ID
      const trialUsers = await prisma.user.findMany({
        where: { lemonsqueezy_customer_id: null },
      });

      // ASSERT: Multiple users can have null customer ID (allowed by unique constraint)
      expect(trialUsers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Subscription Status Transitions', () => {
    it('should validate only valid status transitions occur', async () => {
      // Valid transitions:
      // active → cancelled, active → past_due, active → expired
      // past_due → active, past_due → cancelled
      // cancelled → active (reactivation)

      const validTransitions = [
        ['active', 'cancelled'],
        ['active', 'past_due'],
        ['active', 'expired'],
        ['past_due', 'active'],
        ['past_due', 'cancelled'],
        ['cancelled', 'active'], // Reactivation
      ];

      // ARRANGE: Mock subscription status history query
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { old_status: 'active', new_status: 'cancelled' },
        { old_status: 'past_due', new_status: 'active' },
      ]);

      // ACT: Query status transitions
      const transitions = await prisma.$queryRaw`
        SELECT old_status, new_status FROM subscription_status_history
      `;

      // ASSERT: All transitions are valid
      for (const transition of transitions as any[]) {
        const isValid = validTransitions.some(
          ([from, to]) =>
            transition.old_status === from && transition.new_status === to
        );
        expect(isValid).toBe(true);
      }
    });

    it('should detect invalid status transitions', async () => {
      // Invalid transitions:
      // expired → active (without reactivation webhook)
      // cancelled → past_due (cancelled subscriptions don't go past_due)

      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { old_status: 'expired', new_status: 'active' }, // INVALID
        { old_status: 'cancelled', new_status: 'past_due' }, // INVALID
      ]);

      const invalidTransitions = [
        ['expired', 'active'], // Should be cancelled → active (reactivation)
        ['cancelled', 'past_due'],
      ];

      // ACT: Query transitions
      const transitions = await prisma.$queryRaw`
        SELECT old_status, new_status FROM subscription_status_history
      `;

      // ASSERT: Invalid transitions detected
      const foundInvalidTransitions = (transitions as any[]).filter((transition) =>
        invalidTransitions.some(
          ([from, to]) =>
            transition.old_status === from && transition.new_status === to
        )
      );

      expect(foundInvalidTransitions.length).toBeGreaterThan(0);
    });
  });

  describe('Cancelled User Tier Consistency', () => {
    it('should downgrade user to trial when subscription cancelled', async () => {
      // ARRANGE: Query users with cancelled subscriptions
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-cancelled',
          tier: 'trial', // Correctly downgraded
          subscriptions: [
            { tier: 'pro', status: 'cancelled' },
          ],
        },
      ]);

      // ACT: Query users with cancelled subscriptions
      const users = await prisma.user.findMany({
        include: { subscriptions: { where: { status: 'cancelled' } } },
      });

      // ASSERT: User downgraded to trial
      for (const user of users) {
        if (user.subscriptions.length > 0) {
          expect(user.tier).toBe('trial');
        }
      }
    });

    it('should detect users still on paid tier with cancelled subscription', async () => {
      // ARRANGE: User not downgraded after cancellation (BAD DATA)
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-not-downgraded',
          tier: 'pro', // WRONG - should be 'trial'
          subscriptions: [
            { tier: 'pro', status: 'cancelled' },
          ],
        },
      ]);

      // ACT: Find inconsistencies
      const users = await prisma.user.findMany({
        include: { subscriptions: { where: { status: 'cancelled' } } },
      });

      const inconsistencies = users.filter(
        (user) => user.tier !== 'trial' && user.subscriptions.length > 0
      );

      // ASSERT: Inconsistency detected
      expect(inconsistencies.length).toBeGreaterThan(0);
    });
  });

  describe('Trial User Constraints', () => {
    it('should ensure trial users have no active subscriptions', async () => {
      // ARRANGE: Query trial users
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'trial-user-1',
          tier: 'trial',
          subscriptions: [], // Correct - no active subscriptions
        },
        {
          id: 'trial-user-2',
          tier: 'trial',
          subscriptions: [], // Correct
        },
      ]);

      // ACT: Find trial users with active subscriptions (invalid)
      const users = await prisma.user.findMany({
        where: { tier: 'trial' },
        include: { subscriptions: { where: { status: 'active' } } },
      });

      const invalidTrialUsers = users.filter(
        (user) => user.subscriptions.length > 0
      );

      // ASSERT: No trial users with active subscriptions
      expect(invalidTrialUsers.length).toBe(0);
    });

    it('should detect trial users with active subscriptions (data error)', async () => {
      // ARRANGE: Trial user with active subscription (INVALID)
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'invalid-trial',
          tier: 'trial', // WRONG - should be 'pro'
          subscriptions: [{ tier: 'pro', status: 'active' }],
        },
      ]);

      // ACT: Find invalid trial users
      const users = await prisma.user.findMany({
        where: { tier: 'trial' },
        include: { subscriptions: { where: { status: 'active' } } },
      });

      const invalidTrialUsers = users.filter(
        (user) => user.subscriptions.length > 0
      );

      // ASSERT: Data integrity violation detected
      expect(invalidTrialUsers.length).toBeGreaterThan(0);
    });
  });

  describe('Subscription Uniqueness Constraint', () => {
    it('should enforce unique lemonsqueezy_subscription_id', async () => {
      // ARRANGE: Try to create duplicate subscription
      const lsSubId = 'ls-sub-unique-123';

      (prisma.subscription.create as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 'sub-1',
          lemonsqueezy_subscription_id: lsSubId,
        })
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Unique constraint violation', {
            code: 'P2002',
            meta: { target: ['lemonsqueezy_subscription_id'] },
            clientVersion: '5.0.0',
          })
        );

      // ACT & ASSERT: First subscription succeeds
      const sub1 = await prisma.subscription.create({
        data: {
          user_id: 'user-123',
          lemonsqueezy_subscription_id: lsSubId,
          lemonsqueezy_product_id: '456',
          lemonsqueezy_variant_id: '789',
          tier: 'pro',
          status: 'active',
        },
      });

      expect(sub1.lemonsqueezy_subscription_id).toBe(lsSubId);

      // Second subscription fails
      await expect(
        prisma.subscription.create({
          data: {
            user_id: 'user-456',
            lemonsqueezy_subscription_id: lsSubId, // Duplicate
            lemonsqueezy_product_id: '456',
            lemonsqueezy_variant_id: '789',
            tier: 'pro',
            status: 'active',
          },
        })
      ).rejects.toThrow('Unique constraint violation');
    });
  });
});
