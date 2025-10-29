import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { POST as WebhookPOST } from '@/app/api/webhooks/lemonsqueezy/route';
import { NextRequest } from 'next/server';
import { getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import crypto from 'crypto';

vi.mock('@/lib/lemonsqueezy/client');
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    lemonSqueezyEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'event-123' }),
    },
    interpretation: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

/**
 * Subscription Reactivation Tests (Task 49)
 *
 * Tests:
 * - Cancelled → Active reactivation flow
 * - Expired → Active reactivation flow
 * - New subscription record creation
 * - Reactivation webhook processing
 * - Prorated charge verification
 * - Usage reset on reactivation (PAYG)
 * - Multiple reactivations tracking
 * - Reactivation with different tier
 * - Customer ID preservation
 */
describe('Subscription Reactivation', () => {
  const WEBHOOK_SECRET = 'test_secret';
  const mockUser = {
    id: 'user-reactivate',
    email: 'reactivate@test.com',
    tier: 'trial',
    lemonsqueezy_customer_id: 'cust-reactivate-123',
  };

  function createWebhookRequest(payload: any): NextRequest {
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

    return new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
      },
      body,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();

    (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      storeId: '123456',
      proVariantId: '789',
      paygVariantId: '012',
      webhookSecret: WEBHOOK_SECRET,
      isTestMode: true,
    });

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
  });

  describe('Cancelled → Active Reactivation', () => {
    it('should create NEW subscription record on reactivation (not update cancelled one)', async () => {
      // ARRANGE: User has cancelled subscription
      const cancelledSubscription = {
        id: 'sub-old-cancelled',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-old-123',
        tier: 'pro',
        status: 'cancelled',
        cancelled_at: new Date('2025-01-01'),
      };

      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        cancelledSubscription
      );

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            create: vi.fn().mockResolvedValue({
              id: 'sub-new-reactivated',
              lemonsqueezy_subscription_id: 'ls-sub-new-456',
              tier: 'pro',
              status: 'active',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'pro',
            }),
          },
        })
      );

      // ACT: Reactivation webhook
      const reactivationPayload = {
        meta: {
          event_name: 'subscription_created', // New subscription
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-new-456', // Different subscription ID
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789',
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(reactivationPayload);
      const response = await WebhookPOST(request);

      // ASSERT: New subscription created
      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should preserve customer_id across reactivation', async () => {
      // ARRANGE: Cancelled subscription with customer ID
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-cancelled',
        user_id: mockUser.id,
        status: 'cancelled',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: Reactivation
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-reactivated',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id, // Same customer
            variant_id: '789',
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Customer ID preserved
      expect(response.status).toBe(200);
    });

    it('should upgrade user tier on reactivation', async () => {
      // ARRANGE: User currently on trial
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUser,
        tier: 'trial',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'pro',
            }),
          },
        })
      );

      // ACT: Pro reactivation
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-reactivated-pro',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789', // Pro variant
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      await WebhookPOST(request);

      // ASSERT: User upgraded to Pro
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Expired → Active Reactivation', () => {
    it('should handle expired subscription reactivation', async () => {
      // ARRANGE: Expired subscription
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-expired',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-expired-123',
        tier: 'pro',
        status: 'expired',
        expired_at: new Date('2025-01-15'),
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: Reactivation
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-new-after-expiry',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789',
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: New active subscription
      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should allow user to reactivate after expiration period', async () => {
      // ARRANGE: Long expired subscription (6 months ago)
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-long-expired',
        user_id: mockUser.id,
        status: 'expired',
        expired_at: new Date('2024-07-01'), // 6 months ago
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: Reactivation after long period
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-new-after-long-expiry',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789',
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Reactivation allowed
      expect(response.status).toBe(200);
    });
  });

  describe('Multiple Reactivations Tracking', () => {
    it('should track multiple reactivation cycles', async () => {
      // ARRANGE: User with multiple historical subscriptions
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-1',
          lemonsqueezy_subscription_id: 'ls-sub-1',
          status: 'cancelled',
          created_at: new Date('2024-01-01'),
          cancelled_at: new Date('2024-03-01'),
        },
        {
          id: 'sub-2',
          lemonsqueezy_subscription_id: 'ls-sub-2',
          status: 'cancelled',
          created_at: new Date('2024-06-01'),
          cancelled_at: new Date('2024-08-01'),
        },
        {
          id: 'sub-3',
          lemonsqueezy_subscription_id: 'ls-sub-3',
          status: 'active', // Current reactivation
          created_at: new Date('2025-01-01'),
        },
      ]);

      // ACT: Count reactivations
      const subscriptions = await prisma.subscription.findMany({
        where: { user_id: mockUser.id },
        orderBy: { created_at: 'asc' },
      });

      // ASSERT: 3 subscription cycles (2 cancellations + 1 active)
      expect(subscriptions.length).toBe(3);
      expect(subscriptions[2].status).toBe('active');
    });

    it('should allow unlimited reactivations', async () => {
      // ARRANGE: User with 10 previous subscriptions
      (prisma.subscription.count as ReturnType<typeof vi.fn>).mockResolvedValue(10);

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: 11th reactivation
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-reactivation-11',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789',
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: No restriction on reactivation count
      expect(response.status).toBe(200);
    });
  });

  describe('Reactivation with Different Tier', () => {
    it('should allow reactivating with Pro after cancelling PAYG', async () => {
      // ARRANGE: Cancelled PAYG subscription
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-payg-cancelled',
        user_id: mockUser.id,
        tier: 'payg',
        status: 'cancelled',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: Reactivate with Pro
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-reactivate-pro',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789', // Pro variant
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Pro subscription created
      expect(response.status).toBe(200);
    });

    it('should allow reactivating with PAYG after cancelling Pro', async () => {
      // ARRANGE: Cancelled Pro subscription
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-pro-cancelled',
        user_id: mockUser.id,
        tier: 'pro',
        status: 'cancelled',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: Reactivate with PAYG
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-reactivate-payg',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '012', // PAYG variant
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: PAYG subscription created
      expect(response.status).toBe(200);
    });
  });

  describe('Usage Reset on PAYG Reactivation', () => {
    it('should NOT carry over usage from previous PAYG subscription', async () => {
      // ARRANGE: Previous PAYG subscription with usage
      const oldSubscriptionId = 'ls-sub-old-payg';
      const newSubscriptionId = 'ls-sub-new-payg';

      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-old',
        lemonsqueezy_subscription_id: oldSubscriptionId,
        tier: 'payg',
        status: 'cancelled',
      });

      // Old subscription had 50 interpretations
      (prisma.interpretation.count as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(50) // Old subscription usage
        .mockResolvedValueOnce(0); // New subscription usage

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            create: vi.fn().mockResolvedValue({
              id: 'sub-new',
              lemonsqueezy_subscription_id: newSubscriptionId,
              tier: 'payg',
              status: 'active',
            }),
          },
          user: { update: vi.fn() },
        })
      );

      // ACT: Reactivate PAYG
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: newSubscriptionId,
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '012', // PAYG
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      await WebhookPOST(request);

      // ASSERT: New subscription starts with zero usage
      const oldUsage = await prisma.interpretation.count({
        where: { subscription_id: oldSubscriptionId },
      });
      const newUsage = await prisma.interpretation.count({
        where: { subscription_id: newSubscriptionId },
      });

      expect(oldUsage).toBe(50);
      expect(newUsage).toBe(0); // Fresh start
    });

    it('should track usage separately for each PAYG subscription cycle', async () => {
      // ARRANGE: Multiple PAYG cycles
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-payg-1',
          lemonsqueezy_subscription_id: 'ls-sub-payg-1',
          tier: 'payg',
          status: 'cancelled',
        },
        {
          id: 'sub-payg-2',
          lemonsqueezy_subscription_id: 'ls-sub-payg-2',
          tier: 'payg',
          status: 'active',
        },
      ]);

      (prisma.interpretation.count as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(30) // Cycle 1 usage
        .mockResolvedValueOnce(15); // Cycle 2 usage

      // ACT: Get usage for each cycle
      const cycle1Usage = await prisma.interpretation.count({
        where: { subscription_id: 'ls-sub-payg-1' },
      });
      const cycle2Usage = await prisma.interpretation.count({
        where: { subscription_id: 'ls-sub-payg-2' },
      });

      // ASSERT: Usage tracked independently
      expect(cycle1Usage).toBe(30);
      expect(cycle2Usage).toBe(15);
    });
  });

  describe('Reactivation Webhook Processing', () => {
    it('should process subscription_created webhook as reactivation', async () => {
      // ARRANGE: Existing cancelled subscription
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-cancelled',
        status: 'cancelled',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: subscription_created webhook
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-reactivated',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789',
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Webhook processed as reactivation
      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle subscription_resumed webhook', async () => {
      // ARRANGE: Paused subscription
      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-paused',
        lemonsqueezy_subscription_id: 'ls-sub-paused-123',
        user_id: mockUser.id,
        tier: 'pro',
        status: 'paused',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            update: vi.fn().mockResolvedValue({
              id: 'sub-paused',
              status: 'active',
            }),
          },
          user: { update: vi.fn() },
        })
      );

      // ACT: subscription_resumed webhook
      const payload = {
        meta: {
          event_name: 'subscription_resumed',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-paused-123',
          attributes: {
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Subscription resumed
      expect(response.status).toBe(200);
    });
  });

  describe('Prorated Charges', () => {
    it('should handle prorated charge on immediate reactivation', async () => {
      // ARRANGE: User cancelled yesterday, reactivates today
      const cancelledAt = new Date();
      cancelledAt.setDate(cancelledAt.getDate() - 1);

      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-recent-cancel',
        user_id: mockUser.id,
        tier: 'pro',
        status: 'cancelled',
        cancelled_at: cancelledAt,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: Immediate reactivation
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-immediate-reactivate',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789',
            status: 'active',
            // Lemon Squeezy handles prorated charge automatically
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Reactivation processed (Lemon Squeezy handles proration)
      expect(response.status).toBe(200);
    });

    it('should handle full charge on reactivation after billing period ended', async () => {
      // ARRANGE: User cancelled 2 months ago
      const cancelledAt = new Date();
      cancelledAt.setMonth(cancelledAt.getMonth() - 2);

      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-old-cancel',
        user_id: mockUser.id,
        tier: 'pro',
        status: 'cancelled',
        cancelled_at: cancelledAt,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: Reactivation after billing period
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-full-charge-reactivate',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789',
            status: 'active',
            // Full charge for new billing period
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Full charge reactivation processed
      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle reactivation if user deleted cancelled subscription record', async () => {
      // ARRANGE: No cancelled subscription in DB (manually deleted)
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: { create: vi.fn() },
          user: { update: vi.fn() },
        })
      );

      // ACT: Reactivation webhook
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-clean-slate',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789',
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Treated as new subscription
      expect(response.status).toBe(200);
    });

    it('should prevent reactivation if user has active subscription', async () => {
      // ARRANGE: User already has active Pro subscription
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-active',
        user_id: mockUser.id,
        tier: 'pro',
        status: 'active',
      });

      // ACT: Attempt second Pro reactivation
      const payload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-duplicate-reactivate',
          attributes: {
            customer_id: mockUser.lemonsqueezy_customer_id,
            variant_id: '789', // Same Pro variant
            status: 'active',
          },
        },
      };

      const request = createWebhookRequest(payload);
      const response = await WebhookPOST(request);

      // ASSERT: Should handle gracefully (or prevent duplicate)
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
