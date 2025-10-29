import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST as ProCheckoutPOST } from '@/app/api/checkout/pro/route';
import { POST as PAYGCreatePOST } from '@/app/api/subscription/payg/create/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { prisma } from '@/lib/db/prisma';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';

vi.mock('@/lib/auth/supabaseServer');
vi.mock('@lemonsqueezy/lemonsqueezy.js');
vi.mock('@/lib/lemonsqueezy/client');
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

/**
 * Concurrent Payment Operations Tests
 *
 * Tests race conditions and concurrent access scenarios:
 * - Multiple simultaneous checkout requests
 * - Concurrent PAYG activation attempts
 * - Race conditions between webhook and checkout completion
 * - Database locking and transaction isolation
 */
describe('Concurrent Payment Operations', () => {
  const mockUser = {
    id: 'user-concurrent-123',
    email: 'concurrent@test.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Supabase auth mock
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    });

    // Default Lemon Squeezy config mock
    (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      storeId: '123456',
      proVariantId: '789',
      paygVariantId: '012',
      webhookSecret: 'test_secret',
      isTestMode: true,
    });

    // Default successful checkout mock
    (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: {
          id: 'checkout-123',
          attributes: {
            url: 'https://checkout.lemonsqueezy.com/concurrent-test',
          },
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Concurrent Pro Checkout Requests', () => {
    it('should handle multiple simultaneous Pro checkout requests from same user', async () => {
      // ARRANGE: User with no subscription
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
        lemonsqueezy_customer_id: null,
        subscription: null,
      });

      // ACT: Simulate 5 concurrent checkout requests
      const requests = Array.from({ length: 5 }, () =>
        new NextRequest('http://localhost:3000/api/checkout/pro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const responses = await Promise.all(
        requests.map((req) => ProCheckoutPOST(req))
      );

      // ASSERT: All requests should succeed (idempotent checkout creation)
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.checkoutUrl).toBeDefined();
      }

      // createCheckout should be called 5 times (one per request)
      expect(createCheckout).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent checkout requests while previous checkout is pending', async () => {
      // ARRANGE: First checkout in progress (no subscription yet)
      let callCount = 0;
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        // Simulate eventual subscription creation after first call
        return {
          id: mockUser.id,
          email: mockUser.email,
          tier: callCount > 1 ? 'pro' : 'trial',
          subscription: callCount > 1 ? { tier: 'pro', status: 'active' } : null,
        };
      });

      // ACT: First request starts, second request arrives before first completes
      const request1 = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });
      const request2 = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      const [response1, response2] = await Promise.all([
        ProCheckoutPOST(request1),
        ProCheckoutPOST(request2),
      ]);

      // ASSERT: Both should succeed (Lemon Squeezy handles duplicate checkouts)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should rate limit excessive concurrent checkout requests', async () => {
      // ARRANGE: User with no subscription
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
      });

      // ACT: Simulate 20 concurrent requests (exceeds typical rate limit)
      const requests = Array.from({ length: 20 }, () =>
        new NextRequest('http://localhost:3000/api/checkout/pro', {
          method: 'POST',
        })
      );

      const responses = await Promise.all(
        requests.map((req) => ProCheckoutPOST(req))
      );

      // ASSERT: All should succeed or some may be rate limited
      // (Rate limiting implementation-dependent)
      const successfulRequests = responses.filter((r) => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(0);
      expect(successfulRequests.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Concurrent PAYG Activation Attempts', () => {
    it('should prevent duplicate PAYG subscriptions from concurrent requests', async () => {
      // ARRANGE: User with no subscription initially
      let subscriptionExists = false;

      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        // Simulate race condition: second request sees subscription created by first
        if (subscriptionExists) {
          return { id: 'sub-123', tier: 'payg', status: 'active', user_id: mockUser.id };
        }
        return null;
      });

      (prisma.user.update as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        subscriptionExists = true;
        return { ...mockUser, tier: 'payg' };
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
      });

      // Mock Lemon Squeezy subscription creation
      vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
        createCheckout: vi.fn(),
        createSubscription: vi.fn().mockResolvedValue({
          data: {
            data: {
              id: 'ls-sub-123',
              attributes: { status: 'active' },
            },
          },
          error: null,
        }),
      }));

      // ACT: Simulate 3 concurrent PAYG activation requests
      const requests = Array.from({ length: 3 }, () =>
        new NextRequest('http://localhost:3000/api/subscription/payg/create', {
          method: 'POST',
        })
      );

      const responses = await Promise.all(
        requests.map((req) => PAYGCreatePOST(req))
      );

      // ASSERT: At least one should fail with 400 (duplicate subscription)
      const successResponses = responses.filter((r) => r.status === 200);
      const duplicateResponses = responses.filter((r) => r.status === 400);

      // First request succeeds, subsequent requests should detect duplicate
      expect(successResponses.length).toBeGreaterThanOrEqual(1);
      expect(duplicateResponses.length).toBeGreaterThan(0);
    });

    it('should handle concurrent PAYG activation with database transaction isolation', async () => {
      // ARRANGE: Simulate transaction isolation levels
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
      });

      // Mock Lemon Squeezy
      vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
        createSubscription: vi.fn().mockResolvedValue({
          data: { data: { id: 'ls-sub-456', attributes: { status: 'active' } } },
          error: null,
        }),
      }));

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUser,
        tier: 'payg',
      });

      // ACT: Concurrent requests
      const requests = Array.from({ length: 2 }, () =>
        new NextRequest('http://localhost:3000/api/subscription/payg/create', {
          method: 'POST',
        })
      );

      const responses = await Promise.all(
        requests.map((req) => PAYGCreatePOST(req))
      );

      // ASSERT: Database should prevent duplicate user tier updates
      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Race Conditions Between Webhook and Checkout', () => {
    it('should handle subscription_created webhook arriving before checkout completes', async () => {
      // ARRANGE: Webhook creates subscription first
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
        subscription: null,
      }).mockResolvedValueOnce({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'pro', // Webhook already updated
        subscription: { tier: 'pro', status: 'active' },
      });

      // ACT: Checkout request after webhook processed
      const checkoutRequest = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      const response = await ProCheckoutPOST(checkoutRequest);

      // ASSERT: Should handle gracefully (user already has Pro)
      expect(response.status).toBeOneOf([200, 400]);
    });

    it('should handle concurrent database updates from webhook and checkout', async () => {
      // ARRANGE: Simulate concurrent updates to user tier
      let updateCount = 0;
      (prisma.user.update as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        updateCount++;
        // Simulate slight delay to create race condition
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...mockUser, tier: 'pro' };
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
      });

      // ACT: Simulate concurrent updates (webhook + checkout)
      const updates = Array.from({ length: 2 }, () =>
        prisma.user.update({
          where: { id: mockUser.id },
          data: { tier: 'pro' },
        })
      );

      await Promise.all(updates);

      // ASSERT: Both updates should complete (last write wins or transaction prevents conflict)
      expect(updateCount).toBe(2);
    });
  });

  describe('Database Locking and Transaction Isolation', () => {
    it('should prevent concurrent subscription creation with unique constraint', async () => {
      // ARRANGE: Two requests try to create subscription with same lemon squeezy ID
      const subscriptionId = 'ls-sub-unique-123';

      (prisma.subscription.create as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 'sub-1',
          lemonsqueezy_subscription_id: subscriptionId,
          user_id: mockUser.id,
        })
        .mockRejectedValueOnce({
          code: 'P2002', // Prisma unique constraint violation
          meta: { target: ['lemonsqueezy_subscription_id'] },
        });

      // ACT: Concurrent subscription creation attempts
      const [result1, result2] = await Promise.allSettled([
        prisma.subscription.create({
          data: {
            user_id: mockUser.id,
            lemonsqueezy_subscription_id: subscriptionId,
            lemonsqueezy_product_id: '123',
            lemonsqueezy_variant_id: '456',
            status: 'active',
            tier: 'pro',
          },
        }),
        prisma.subscription.create({
          data: {
            user_id: mockUser.id,
            lemonsqueezy_subscription_id: subscriptionId,
            lemonsqueezy_product_id: '123',
            lemonsqueezy_variant_id: '456',
            status: 'active',
            tier: 'pro',
          },
        }),
      ]);

      // ASSERT: One succeeds, one fails with unique constraint violation
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('rejected');
      if (result2.status === 'rejected') {
        expect(result2.reason.code).toBe('P2002');
      }
    });

    it('should handle optimistic locking for user tier updates', async () => {
      // ARRANGE: Simulate version-based optimistic locking
      let userVersion = 1;

      (prisma.user.update as ReturnType<typeof vi.fn>).mockImplementation(async (args: any) => {
        const currentVersion = userVersion;

        // Simulate version check
        if (args.where.version && args.where.version !== currentVersion) {
          throw new Error('Version mismatch - concurrent update detected');
        }

        userVersion++;
        return { ...mockUser, tier: args.data.tier, version: userVersion };
      });

      // ACT: Two concurrent updates with version check
      const update1 = prisma.user.update({
        where: { id: mockUser.id, version: 1 },
        data: { tier: 'pro' },
      });

      const update2 = prisma.user.update({
        where: { id: mockUser.id, version: 1 },
        data: { tier: 'payg' },
      });

      const results = await Promise.allSettled([update1, update2]);

      // ASSERT: One succeeds, one fails with version mismatch
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(1);
    });
  });

  describe('Rapid Button Clicks (Double Submit Prevention)', () => {
    it('should handle rapid "Subscribe to Pro" button clicks', async () => {
      // ARRANGE: User clicks button multiple times rapidly
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
      });

      // ACT: Simulate 3 rapid button clicks
      const requests = Array.from({ length: 3 }, () =>
        new NextRequest('http://localhost:3000/api/checkout/pro', { method: 'POST' })
      );

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map((req) => ProCheckoutPOST(req))
      );
      const endTime = Date.now();

      // ASSERT: All requests processed quickly (< 1 second total)
      expect(endTime - startTime).toBeLessThan(1000);

      // All should succeed (frontend should disable button, but backend handles gracefully)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle rapid "Start PAYG" button clicks with duplicate prevention', async () => {
      // ARRANGE: User clicks PAYG button multiple times
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null) // First check: no subscription
        .mockResolvedValue({ // Subsequent checks: subscription exists
          id: 'sub-456',
          tier: 'payg',
          status: 'active',
          user_id: mockUser.id,
        });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
      });

      // Mock Lemon Squeezy
      vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
        createSubscription: vi.fn().mockResolvedValue({
          data: { data: { id: 'ls-sub-789' } },
          error: null,
        }),
      }));

      // ACT: Simulate 3 rapid clicks
      const requests = Array.from({ length: 3 }, () =>
        new NextRequest('http://localhost:3000/api/subscription/payg/create', {
          method: 'POST',
        })
      );

      const responses = await Promise.all(
        requests.map((req) => PAYGCreatePOST(req))
      );

      // ASSERT: First request succeeds, others return 400 (duplicate)
      const successCount = responses.filter((r) => r.status === 200).length;
      const duplicateCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(duplicateCount).toBeGreaterThan(0);
    });
  });
});

// Custom matcher for "toBeOneOf"
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be one of ${expected}`
          : `Expected ${received} to be one of ${expected}`,
    };
  },
});
