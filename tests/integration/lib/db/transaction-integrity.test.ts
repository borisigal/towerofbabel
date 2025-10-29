/**
 * Integration Tests for Database Transaction Integrity
 *
 * Tests database transaction handling for payment operations including:
 * - Atomic operations (all succeed or all fail)
 * - Concurrent transaction handling
 * - Rollback on partial failure
 * - Data consistency during failures
 * - Isolation levels
 * - Race condition handling
 *
 * Task 28 - Story 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import prisma from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

// Mock logger to avoid console spam
vi.mock('@/lib/observability/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Database Transaction Integrity', () => {
  // Track created test users for cleanup
  const testUserIds = [
    'test-commit-user-456',
    'test-concurrent-user-789',
    'test-tier-update-012',
    'test-constraint-user-345',
    'test-consistency-user-901',
    'test-orphan-user-234',
    'test-timeout-user-567',
    'test-complex-user-123',
  ];

  // Default required subscription fields for testing
  const defaultSubscriptionFields = {
    lemonsqueezy_product_id: 'test-product-123',
    lemonsqueezy_variant_id: 'test-variant-456',
    lemonsqueezy_customer_id: 'test-customer-789',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    try {
      // Delete subscriptions first (foreign key constraint)
      await prisma.subscription.deleteMany({
        where: {
          user_id: {
            in: testUserIds
          }
        }
      });

      // Delete users
      await prisma.user.deleteMany({
        where: {
          id: {
            in: testUserIds
          }
        }
      });
    } catch (error) {
      // Ignore cleanup errors (data might not exist)
      console.error('Cleanup error (can be ignored):', error);
    }
  });

  describe('Atomic Subscription Creation', () => {
    it('should rollback both subscription and user updates if user update fails', async () => {
      // ARRANGE: Simulate subscription creation where user update fails
      const userId = 'test-atomic-user-123';
      const subscriptionData = {
        ...defaultSubscriptionFields,
        ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: 'ls-sub-atomic-123',
        status: 'active' as const,
        tier: 'pro' as const,
        user_id: userId,
        renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // ACT & ASSERT: Transaction should fail atomically
      await expect(async () => {
        await prisma.$transaction(async (tx) => {
          // 1. Create subscription (would succeed)
          const subscription = await tx.subscription.create({
            data: subscriptionData,
          });

          // 2. Update user with invalid tier (should fail)
          await tx.user.update({
            where: { id: 'nonexistent-user-id' }, // This will fail
            data: { tier: 'pro' },
          });

          return subscription;
        });
      }).rejects.toThrow();

      // ASSERT: Subscription should not exist (rolled back)
      const subscription = await prisma.subscription.findUnique({
        where: {
                lemonsqueezy_subscription_id: 'ls-sub-atomic-123' },
      });
      expect(subscription).toBeNull();
    });

    it('should commit both operations if all succeed', async () => {
      // ARRANGE: Create user first
      const testUser = await prisma.user.create({
        data: {
          id: 'test-commit-user-456',
          email: 'commit-test@example.com',
          name: 'Commit Test User',
          tier: 'trial',
        },
      });

      const subscriptionData = {
        ...defaultSubscriptionFields,
        ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: 'ls-sub-commit-456',
        status: 'active' as const,
        tier: 'pro' as const,
        user_id: testUser.id,
        renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      // ACT: Execute transaction
      const result = await prisma.$transaction(async (tx) => {
        const subscription = await tx.subscription.create({
          data: subscriptionData,
        });

        const user = await tx.user.update({
          where: { id: testUser.id },
          data: { tier: 'pro' },
        });

        return { subscription, user };
      });

      // ASSERT: Both operations should succeed
      expect(result.subscription.tier).toBe('pro');
      expect(result.user.tier).toBe('pro');

      // Verify persistence
      const persistedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(persistedUser?.tier).toBe('pro');

      // Cleanup
      await prisma.subscription.delete({
        where: {
                lemonsqueezy_subscription_id: 'ls-sub-commit-456' },
      });
      await prisma.user.delete({ where: { id: testUser.id } });
    });
  });

  describe('Concurrent Transaction Handling', () => {
    it('should handle concurrent subscription creations for same user safely', async () => {
      // ARRANGE: Create test user
      const testUser = await prisma.user.create({
        data: {
          id: 'test-concurrent-user-789',
          email: 'concurrent@example.com',
          name: 'Concurrent Test',
          tier: 'trial',
        },
      });

      const createSubscription = async (subId: string) => {
        try {
          return await prisma.$transaction(async (tx) => {
            // Check if user already has subscription
            const existingSub = await tx.subscription.findFirst({
              where: { user_id: testUser.id },
            });

            if (existingSub) {
              throw new Error('User already has subscription');
            }

            // Create subscription
            const subscription = await tx.subscription.create({
              data: {
                ...defaultSubscriptionFields,
                ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: subId,
                status: 'active',
                tier: 'pro',
                user_id: testUser.id,
                renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });

            // Update user tier
            await tx.user.update({
              where: { id: testUser.id },
              data: { tier: 'pro' },
            });

            return subscription;
          });
        } catch (error) {
          return null;
        }
      };

      // ACT: Attempt concurrent creations
      const results = await Promise.allSettled([
        createSubscription('ls-sub-concurrent-1'),
        createSubscription('ls-sub-concurrent-2'),
        createSubscription('ls-sub-concurrent-3'),
      ]);

      // ASSERT: Only one should succeed
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value !== null);
      expect(successful.length).toBe(1);

      // Verify only one subscription exists
      const subscriptions = await prisma.subscription.findMany({
        where: { user_id: testUser.id },
      });
      expect(subscriptions.length).toBe(1);

      // Cleanup
      await prisma.subscription.deleteMany({ where: { user_id: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should handle concurrent tier updates without data corruption', async () => {
      // ARRANGE: Create user
      const testUser = await prisma.user.create({
        data: {
          id: 'test-tier-update-012',
          email: 'tier-update@example.com',
          name: 'Tier Update Test',
          tier: 'trial',
        },
      });

      const updateUserTier = async (newTier: 'trial' | 'pro' | 'payg') => {
        try {
          return await prisma.user.update({
            where: { id: testUser.id },
            data: { tier: newTier },
          });
        } catch (error) {
          return null;
        }
      };

      // ACT: Concurrent tier updates
      await Promise.all([
        updateUserTier('pro'),
        updateUserTier('payg'),
        updateUserTier('trial'),
      ]);

      // ASSERT: User should have one of the tiers (no corruption)
      const finalUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(['trial', 'pro', 'payg']).toContain(finalUser?.tier);

      // Cleanup
      await prisma.user.delete({ where: { id: testUser.id } });
    });
  });

  describe('Rollback on Constraint Violations', () => {
    it('should rollback on unique constraint violation', async () => {
      // ARRANGE: Create user and subscription
      const testUser = await prisma.user.create({
        data: {
          id: 'test-constraint-user-345',
          email: 'constraint@example.com',
          name: 'Constraint Test',
          tier: 'trial',
        },
      });

      const existingSubscription = await prisma.subscription.create({
        data: {
          ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: 'ls-sub-existing-345',
          status: 'active',
          tier: 'pro',
          user_id: testUser.id,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // ACT & ASSERT: Try to create duplicate subscription
      await expect(async () => {
        await prisma.$transaction(async (tx) => {
          // Try to create subscription with same lemonsqueezy_subscription_id
          await tx.subscription.create({
            data: {
              ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: 'ls-sub-existing-345', // Duplicate!
              status: 'active',
              tier: 'pro',
              user_id: testUser.id,
              renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          // This update should be rolled back
          await tx.user.update({
            where: { id: testUser.id },
            data: { tier: 'payg' },
          });
        });
      }).rejects.toThrow();

      // ASSERT: User tier should not have changed (rolled back)
      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.tier).toBe('trial'); // Still trial, not payg

      // Cleanup
      await prisma.subscription.delete({
        where: {
                lemonsqueezy_subscription_id: 'ls-sub-existing-345' },
      });
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should rollback on foreign key constraint violation', async () => {
      // ACT & ASSERT: Try to create subscription for nonexistent user
      await expect(async () => {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.create({
            data: {
              ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: 'ls-sub-orphan-678',
              status: 'active',
              tier: 'pro',
              user_id: 'nonexistent-user-id-678', // Foreign key violation
              renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        });
      }).rejects.toThrow();

      // ASSERT: Subscription should not exist
      const subscription = await prisma.subscription.findUnique({
        where: {
                lemonsqueezy_subscription_id: 'ls-sub-orphan-678' },
      });
      expect(subscription).toBeNull();
    });
  });

  describe('Data Consistency Checks', () => {
    it('should maintain subscription-user consistency on cancellation', async () => {
      // ARRANGE: Create user with active subscription
      const testUser = await prisma.user.create({
        data: {
          id: 'test-consistency-user-901',
          email: 'consistency@example.com',
          name: 'Consistency Test',
          tier: 'pro',
        },
      });

      const subscription = await prisma.subscription.create({
        data: {
          ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: 'ls-sub-consistency-901',
          status: 'active',
          tier: 'pro',
          user_id: testUser.id,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // ACT: Cancel subscription atomically
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'cancelled' },
        });

        await tx.user.update({
          where: { id: testUser.id },
          data: { tier: 'trial' },
        });
      });

      // ASSERT: Both should be updated consistently
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: { subscription: true },
      });

      expect(updatedUser?.tier).toBe('trial');
      expect(updatedUser?.subscription?.status).toBe('cancelled');

      // Cleanup
      await prisma.subscription.delete({
        where: {
                lemonsqueezy_subscription_id: 'ls-sub-consistency-901' },
      });
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should prevent orphaned subscriptions', async () => {
      // ARRANGE: Create user and subscription
      const testUser = await prisma.user.create({
        data: {
          id: 'test-orphan-user-234',
          email: 'orphan@example.com',
          name: 'Orphan Test',
          tier: 'pro',
        },
      });

      const subscription = await prisma.subscription.create({
        data: {
          ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: 'ls-sub-orphan-234',
          status: 'active',
          tier: 'pro',
          user_id: testUser.id,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // ACT: Delete user (should cascade delete subscription due to onDelete: Cascade)
      await prisma.user.delete({ where: { id: testUser.id } });

      // ASSERT: Both user and subscription should be deleted (cascade)
      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user).toBeNull();

      const sub = await prisma.subscription.findUnique({
        where: { lemonsqueezy_subscription_id: 'ls-sub-orphan-234' },
      });
      expect(sub).toBeNull();

      // No cleanup needed - already deleted
    });
  });

  describe('Transaction Timeout and Performance', () => {
    it('should handle long-running transactions appropriately', async () => {
      // ARRANGE: Create user
      const testUser = await prisma.user.create({
        data: {
          id: 'test-timeout-user-567',
          email: 'timeout@example.com',
          name: 'Timeout Test',
          tier: 'trial',
        },
      });

      // ACT: Execute transaction with deliberate delay
      const startTime = Date.now();

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: testUser.id },
        });

        // Simulate some processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        return user;
      });

      const duration = Date.now() - startTime;

      // ASSERT: Transaction completed
      expect(result).not.toBeNull();
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(10000); // Should complete well before timeout

      // Cleanup
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should handle multiple sequential transactions efficiently', async () => {
      // ARRANGE: Create users
      const userIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const user = await prisma.user.create({
          data: {
            id: `test-seq-user-${i}-890`,
            email: `seq${i}@example.com`,
            name: `Seq Test ${i}`,
            tier: 'trial',
          },
        });
        userIds.push(user.id);
      }

      // ACT: Execute sequential tier updates
      const startTime = Date.now();

      for (const userId of userIds) {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { tier: 'pro' },
          });
        });
      }

      const duration = Date.now() - startTime;

      // ASSERT: All should be updated
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
      });

      expect(users.every((u) => u.tier === 'pro')).toBe(true);
      expect(duration).toBeLessThan(5000); // Should be reasonably fast

      // Cleanup
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    });
  });

  describe('Nested Transaction Scenarios', () => {
    it('should handle complex multi-table updates atomically', async () => {
      // ARRANGE: Create user
      const testUser = await prisma.user.create({
        data: {
          id: 'test-complex-user-123',
          email: 'complex@example.com',
          name: 'Complex Test',
          tier: 'trial',
          messages_used_count: 50,
        },
      });

      // ACT: Complex atomic operation (subscription creation + tier upgrade + usage reset)
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create subscription
        const subscription = await tx.subscription.create({
          data: {
            ...defaultSubscriptionFields,
                lemonsqueezy_subscription_id: 'ls-sub-complex-123',
            status: 'active',
            tier: 'pro',
            user_id: testUser.id,
            renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // 2. Update user tier and reset usage
        const user = await tx.user.update({
          where: { id: testUser.id },
          data: {
            tier: 'pro',
            messages_used_count: 0,
            messages_reset_date: new Date(),
          },
        });

        return { subscription, user };
      });

      // ASSERT: All changes applied atomically
      expect(result.user.tier).toBe('pro');
      expect(result.user.messages_used_count).toBe(0);
      expect(result.subscription.status).toBe('active');

      // Verify persistence
      const verifyUser = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: { subscription: true },
      });

      expect(verifyUser?.tier).toBe('pro');
      expect(verifyUser?.messages_used_count).toBe(0);
      expect(verifyUser?.subscription?.status).toBe('active');

      // Cleanup
      await prisma.subscription.delete({
        where: {
                lemonsqueezy_subscription_id: 'ls-sub-complex-123' },
      });
      await prisma.user.delete({ where: { id: testUser.id } });
    });
  });
});
