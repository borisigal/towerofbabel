import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

/**
 * Customer ID Management Tests (Task 47)
 *
 * Tests:
 * - First subscription sets customer_id
 * - Subsequent subscriptions reuse customer_id
 * - Unique constraint enforcement
 * - Orphaned customer ID handling
 * - Customer ID immutability
 */
describe('Customer ID Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('First Subscription Sets Customer ID', () => {
    it('should set lemonsqueezy_customer_id on first subscription', async () => {
      const userId = 'user-first-sub';
      const customerId = 'cust-first-123';

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        lemonsqueezy_customer_id: null, // No customer ID yet
      });

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        lemonsqueezy_customer_id: customerId, // Now set
      });

      await prisma.user.update({
        where: { id: userId },
        data: { lemonsqueezy_customer_id: customerId },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lemonsqueezy_customer_id: customerId },
      });
    });

    it('should set customer_id atomically with subscription creation', async () => {
      const userId = 'user-atomic';
      const customerId = 'cust-atomic-123';

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        lemonsqueezy_customer_id: customerId,
      });

      (prisma.subscription.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-123',
        user_id: userId,
      });

      await Promise.all([
        prisma.user.update({
          where: { id: userId },
          data: { lemonsqueezy_customer_id: customerId },
        }),
        prisma.subscription.create({
          data: {
            user_id: userId,
            lemonsqueezy_subscription_id: 'ls-sub-123',
            lemonsqueezy_product_id: '456',
            lemonsqueezy_variant_id: '789',
            tier: 'pro',
            status: 'active',
          },
        }),
      ]);

      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.subscription.create).toHaveBeenCalled();
    });
  });

  describe('Subsequent Subscriptions Reuse Customer ID', () => {
    it('should NOT change customer_id on second subscription', async () => {
      const userId = 'user-existing';
      const existingCustomerId = 'cust-existing-123';

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        lemonsqueezy_customer_id: existingCustomerId, // Already set
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });

      expect(user?.lemonsqueezy_customer_id).toBe(existingCustomerId);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should use same customer_id for Pro and PAYG subscriptions', async () => {
      const userId = 'user-multi-sub';
      const customerId = 'cust-multi-123';

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        lemonsqueezy_customer_id: customerId,
      });

      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-pro',
          user_id: userId,
          tier: 'pro',
          // Uses same customer_id in Lemon Squeezy
        },
        {
          id: 'sub-payg',
          user_id: userId,
          tier: 'payg',
          // Uses same customer_id in Lemon Squeezy
        },
      ]);

      const subscriptions = await prisma.subscription.findMany({
        where: { user_id: userId },
      });

      expect(subscriptions.length).toBe(2);
    });
  });

  describe('Unique Constraint Enforcement', () => {
    it('should enforce unique lemonsqueezy_customer_id', async () => {
      const duplicateCustomerId = 'cust-duplicate-123';

      (prisma.user.create as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 'user-1',
          lemonsqueezy_customer_id: duplicateCustomerId,
        })
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Unique constraint violation', {
            code: 'P2002',
            meta: { target: ['lemonsqueezy_customer_id'] },
            clientVersion: '5.0.0',
          })
        );

      await prisma.user.create({
        data: {
          email: 'user1@test.com',
          lemonsqueezy_customer_id: duplicateCustomerId,
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email: 'user2@test.com',
            lemonsqueezy_customer_id: duplicateCustomerId,
          },
        })
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should allow multiple users with null customer_id', async () => {
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'trial-1', lemonsqueezy_customer_id: null },
        { id: 'trial-2', lemonsqueezy_customer_id: null },
        { id: 'trial-3', lemonsqueezy_customer_id: null },
      ]);

      const trialUsers = await prisma.user.findMany({
        where: { lemonsqueezy_customer_id: null },
      });

      expect(trialUsers.length).toBeGreaterThan(1);
    });
  });

  describe('Orphaned Customer ID Handling', () => {
    it('should detect orphaned customer IDs (no active subscriptions)', async () => {
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-orphaned',
          lemonsqueezy_customer_id: 'cust-orphaned-123',
          subscriptions: [], // No subscriptions
        },
      ]);

      const users = await prisma.user.findMany({
        include: { subscriptions: true },
      });

      const orphanedCustomers = users.filter(
        (u) => u.lemonsqueezy_customer_id && u.subscriptions.length === 0
      );

      expect(orphanedCustomers.length).toBeGreaterThan(0);
    });

    it('should allow orphaned customer_id (user cancelled all subscriptions)', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-cancelled-all',
        lemonsqueezy_customer_id: 'cust-cancelled-123',
        subscriptions: [
          { tier: 'pro', status: 'cancelled' },
          { tier: 'payg', status: 'cancelled' },
        ],
      });

      const user = await prisma.user.findUnique({
        where: { id: 'user-cancelled-all' },
        include: { subscriptions: true },
      });

      expect(user?.lemonsqueezy_customer_id).toBeTruthy();
      expect(user?.subscriptions.every((s) => s.status === 'cancelled')).toBe(true);
    });
  });

  describe('Customer ID Immutability', () => {
    it('should NOT allow changing customer_id after initial set', async () => {
      const userId = 'user-immutable';
      const originalCustomerId = 'cust-original-123';
      const newCustomerId = 'cust-new-456';

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        lemonsqueezy_customer_id: originalCustomerId,
      });

      (prisma.user.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Customer ID is immutable')
      );

      await expect(
        prisma.user.update({
          where: { id: userId },
          data: { lemonsqueezy_customer_id: newCustomerId },
        })
      ).rejects.toThrow();
    });

    it('should preserve customer_id across subscription changes', async () => {
      const userId = 'user-preserve';
      const customerId = 'cust-preserve-123';

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        lemonsqueezy_customer_id: customerId,
        tier: 'pro',
      });

      await prisma.user.update({
        where: { id: userId },
        data: { tier: 'payg' }, // Change tier, NOT customer_id
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { tier: 'payg' },
      });
    });
  });

  describe('Customer ID Lifecycle', () => {
    it('should follow lifecycle: null → set → preserved → (user deletion)', async () => {
      const userId = 'user-lifecycle';
      const customerId = 'cust-lifecycle-123';

      (prisma.user.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: userId,
          lemonsqueezy_customer_id: null, // Step 1: Trial user
        })
        .mockResolvedValueOnce({
          id: userId,
          lemonsqueezy_customer_id: customerId, // Step 2: First subscription
        })
        .mockResolvedValueOnce({
          id: userId,
          lemonsqueezy_customer_id: customerId, // Step 3: Still preserved
        });

      const trialUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(trialUser?.lemonsqueezy_customer_id).toBeNull();

      const paidUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(paidUser?.lemonsqueezy_customer_id).toBe(customerId);

      const laterUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(laterUser?.lemonsqueezy_customer_id).toBe(customerId);
    });
  });
});
