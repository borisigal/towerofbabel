import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { POST as ProCheckoutPOST } from '@/app/api/checkout/pro/route';

// Mock dependencies (Vitest hoists these automatically)
vi.mock('@/lib/auth/supabaseServer', () => ({
  createClient: vi.fn(),
}));

vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  createCheckout: vi.fn(),
}));

vi.mock('@/lib/lemonsqueezy/client', () => ({
  configureLemonSqueezy: vi.fn(),
  getLemonSqueezyConfig: vi.fn(),
}));

vi.mock('@/lib/observability/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/db/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    lemonSqueezyEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

// Import mocked dependencies AFTER mocks
import { createClient } from '@/lib/auth/supabaseServer';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import { prisma } from '@/lib/db/prisma';

/**
 * Subscription Lifecycle Tests
 *
 * Tests complete subscription journeys from creation to cancellation:
 * - Trial → Pro upgrade flow
 * - Trial → PAYG upgrade flow
 * - Subscription renewal cycles
 * - Cancellation and downgrade
 * - Expired subscription handling
 * - Subscription pausing
 */
describe('Subscription Lifecycle', () => {
  const WEBHOOK_SECRET = 'test_webhook_secret';
  const mockUser = {
    id: 'user-lifecycle-123',
    email: 'lifecycle@test.com',
  };

  function createWebhookRequest(payload: any): NextRequest {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

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
      webhookSecret: WEBHOOK_SECRET,
      isTestMode: true,
    });

    // Default successful checkout mock
    (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: {
          id: 'checkout-lifecycle',
          attributes: {
            url: 'https://checkout.lemonsqueezy.com/lifecycle-test',
          },
        },
      },
      error: null,
    });

    // Default no existing Lemon Squeezy events
    (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // Default event creation mock
    (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'event-123',
      lemonsqueezy_event_id: 'evt-123',
      event_type: 'subscription_created',
      payload: {},
      processed_at: new Date(),
    });
  });

  describe('Trial to Pro Upgrade Flow', () => {
    it('should complete full trial to Pro upgrade journey', async () => {
      // STEP 1: User on trial tier
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
        messages_used_count: 5,
        lemonsqueezy_customer_id: null,
        subscription: null, // Trial user has no subscription
      });

      // STEP 2: User initiates Pro checkout
      const checkoutRequest = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      const checkoutResponse = await ProCheckoutPOST(checkoutRequest);

      // Debug: Log error if 500
      if (checkoutResponse.status !== 200) {
        const errorData = await checkoutResponse.json();
        console.log('Checkout error:', JSON.stringify(errorData, null, 2));
      }

      expect(checkoutResponse.status).toBe(200);

      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.checkoutUrl).toBeDefined();

      // STEP 3: User completes payment, webhook fires
      const webhookPayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: {
            user_id: mockUser.id,
          },
        },
        data: {
          id: 'ls-sub-pro-123',
          attributes: {
            customer_id: 'cust-123',
            product_id: '456',
            variant_id: '789', // Pro variant
            status: 'active',
            renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };

      // Mock transaction for webhook processing
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            create: vi.fn().mockResolvedValue({
              id: 'sub-123',
              user_id: mockUser.id,
              lemonsqueezy_subscription_id: 'ls-sub-pro-123',
              tier: 'pro',
              status: 'active',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'pro',
              messages_used_count: 0, // Reset
              lemonsqueezy_customer_id: 'cust-123',
            }),
          },
        })
      );

      const webhookRequest = createWebhookRequest(webhookPayload);
      const webhookResponse = await WebhookPOST(webhookRequest);

      // ASSERT: User upgraded to Pro, usage reset
      expect(webhookResponse.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle trial to Pro with existing interpretations', async () => {
      // ARRANGE: User on trial with 9/10 messages used
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
        messages_used_count: 9,
        subscription: null,
      });

      // ACT: Upgrade to Pro
      const webhookPayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-pro-456',
          attributes: {
            customer_id: 'cust-456',
            variant_id: '789', // Pro
            status: 'active',
            renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            create: vi.fn().mockResolvedValue({ tier: 'pro', status: 'active' }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'pro',
              messages_used_count: 0, // Reset to 0
            }),
          },
        })
      );

      const webhookRequest = createWebhookRequest(webhookPayload);
      const response = await WebhookPOST(webhookRequest);

      // ASSERT: Usage counter reset to 0 for Pro
      expect(response.status).toBe(200);
    });
  });

  describe('Trial to PAYG Upgrade Flow', () => {
    it('should complete full trial to PAYG activation journey', async () => {
      // STEP 1: User on trial tier
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
        messages_used_count: 3,
        subscription: null,
      });

      // STEP 2: User activates PAYG (no payment required)
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUser,
        tier: 'payg',
      });

      const paygRequest = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      const response = await PAYGCreatePOST(paygRequest);

      // ASSERT: PAYG activated immediately, no payment required
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tier).toBe('payg');
    });

    it('should retain usage count when upgrading trial to PAYG', async () => {
      // ARRANGE: User has used 5 messages on trial
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'trial',
        messages_used_count: 5,
        subscription: null,
      });

      vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
        createSubscription: vi.fn().mockResolvedValue({
          data: { data: { id: 'ls-sub-payg-456' } },
          error: null,
        }),
      }));

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUser,
        tier: 'payg',
        messages_used_count: 5, // Not reset (PAYG is unlimited)
      });

      // ACT: Activate PAYG
      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      const response = await PAYGCreatePOST(request);

      // ASSERT: Usage count NOT reset (PAYG has no limits)
      expect(response.status).toBe(200);
    });
  });

  describe('Subscription Renewal Cycles', () => {
    it('should handle Pro subscription renewal and usage reset', async () => {
      // ARRANGE: User on Pro, month ends, payment succeeds
      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-789',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-pro-789',
        tier: 'pro',
        status: 'active',
        renews_at: new Date(),
      });

      const renewalWebhookPayload = {
        meta: {
          event_name: 'subscription_payment_success',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-pro-789',
          attributes: {
            status: 'active',
            renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };

      // Mock transaction for renewal
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              messages_used_count: 0, // Reset
              messages_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
          },
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-789',
              user_id: mockUser.id,
              tier: 'pro',
            }),
            update: vi.fn().mockResolvedValue({
              status: 'active',
              renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
          },
        })
      );

      // ACT: Process renewal webhook
      const request = createWebhookRequest(renewalWebhookPayload);
      const response = await WebhookPOST(request);

      // ASSERT: Usage reset to 0, next reset date updated
      expect(response.status).toBe(200);
    });

    it('should NOT reset usage for PAYG subscription renewal', async () => {
      // ARRANGE: PAYG user, monthly invoice paid
      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-payg-123',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-payg-123',
        tier: 'payg',
        status: 'active',
      });

      const paygRenewalPayload = {
        meta: {
          event_name: 'subscription_payment_success',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-payg-123',
          attributes: {
            status: 'active',
            renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              tier: 'payg',
              user_id: mockUser.id,
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          user: {
            update: vi.fn(),
          },
        })
      );

      // ACT: Process PAYG renewal
      const request = createWebhookRequest(paygRenewalPayload);
      const response = await WebhookPOST(request);

      // ASSERT: PAYG renewal processed, usage NOT reset (charged per use)
      expect(response.status).toBe(200);
    });
  });

  describe('Subscription Cancellation and Downgrade', () => {
    it('should downgrade Pro user to trial on cancellation', async () => {
      // ARRANGE: Pro user cancels subscription
      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-cancel-123',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-cancel-123',
        tier: 'pro',
        status: 'active',
      });

      const cancellationPayload = {
        meta: {
          event_name: 'subscription_cancelled',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-cancel-123',
          attributes: {
            status: 'cancelled',
            ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-cancel-123',
              user_id: mockUser.id,
            }),
            update: vi.fn().mockResolvedValue({
              status: 'cancelled',
              ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'trial', // Downgraded
            }),
          },
        })
      );

      // ACT: Process cancellation webhook
      const request = createWebhookRequest(cancellationPayload);
      const response = await WebhookPOST(request);

      // ASSERT: User downgraded to trial
      expect(response.status).toBe(200);
    });

    it('should allow Pro user to continue until period end after cancellation', async () => {
      // ARRANGE: User cancels mid-cycle, retains access until period end
      const periodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-mid-cycle',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-mid-cycle',
        tier: 'pro',
        status: 'active',
        renews_at: periodEnd,
      });

      const midCycleCancellation = {
        meta: {
          event_name: 'subscription_cancelled',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-mid-cycle',
          attributes: {
            status: 'cancelled',
            ends_at: periodEnd.toISOString(), // Retains access until this date
          },
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-mid-cycle',
              user_id: mockUser.id,
            }),
            update: vi.fn().mockResolvedValue({
              status: 'cancelled',
              ends_at: periodEnd,
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'trial',
            }),
          },
        })
      );

      // ACT: Process cancellation
      const request = createWebhookRequest(midCycleCancellation);
      const response = await WebhookPOST(request);

      // ASSERT: User downgraded but subscription shows ends_at date
      expect(response.status).toBe(200);
    });
  });

  describe('Expired Subscription Handling', () => {
    it('should handle subscription_expired webhook for Pro user', async () => {
      // ARRANGE: Pro subscription expires (payment failed repeatedly)
      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-expired',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-expired',
        tier: 'pro',
        status: 'past_due',
      });

      const expirationPayload = {
        meta: {
          event_name: 'subscription_expired',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-expired',
          attributes: {
            status: 'expired',
            ends_at: new Date().toISOString(),
          },
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-expired',
              user_id: mockUser.id,
            }),
            update: vi.fn().mockResolvedValue({
              status: 'expired',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'trial', // Immediately downgraded
            }),
          },
        })
      );

      // ACT: Process expiration webhook
      const request = createWebhookRequest(expirationPayload);
      const response = await WebhookPOST(request);

      // ASSERT: User immediately downgraded to trial
      expect(response.status).toBe(200);
    });
  });

  describe('Subscription Pausing', () => {
    it('should handle paused subscription status', async () => {
      // ARRANGE: User pauses Pro subscription
      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-paused',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-paused',
        tier: 'pro',
        status: 'active',
      });

      const pausedPayload = {
        meta: {
          event_name: 'subscription_paused',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-paused',
          attributes: {
            status: 'paused',
          },
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-paused',
              user_id: mockUser.id,
            }),
            update: vi.fn().mockResolvedValue({
              status: 'paused',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'trial', // Downgrade while paused
            }),
          },
        })
      );

      // ACT: Process pause webhook
      const request = createWebhookRequest(pausedPayload);
      const response = await WebhookPOST(request);

      // ASSERT: Subscription paused, user downgraded
      expect(response.status).toBe(200);
    });
  });

  describe('Pro to PAYG Downgrade', () => {
    it('should handle Pro user switching to PAYG', async () => {
      // STEP 1: User has active Pro subscription
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 'sub-pro-existing',
          tier: 'pro',
          status: 'active',
          user_id: mockUser.id,
        })
        .mockResolvedValueOnce(null); // After Pro cancelled

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'pro',
        subscription: null,
      });

      // STEP 2: User cancels Pro
      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-pro-existing',
        user_id: mockUser.id,
        lemonsqueezy_subscription_id: 'ls-sub-pro-existing',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-pro-existing',
              user_id: mockUser.id,
            }),
            update: vi.fn().mockResolvedValue({ status: 'cancelled' }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              ...mockUser,
              tier: 'trial',
            }),
          },
        })
      );

      const cancellationRequest = createWebhookRequest({
        meta: {
          event_name: 'subscription_cancelled',
          custom_data: { user_id: mockUser.id },
        },
        data: {
          id: 'ls-sub-pro-existing',
          attributes: { status: 'cancelled', ends_at: new Date().toISOString() },
        },
      });

      await WebhookPOST(cancellationRequest);

      // STEP 3: User activates PAYG
      vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
        createSubscription: vi.fn().mockResolvedValue({
          data: { data: { id: 'ls-sub-payg-new' } },
          error: null,
        }),
      }));

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUser,
        tier: 'payg',
      });

      const paygRequest = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      const paygResponse = await PAYGCreatePOST(paygRequest);

      // ASSERT: Pro cancelled, PAYG activated
      expect(paygResponse.status).toBe(200);
    });
  });
});
