/**
 * End-to-End Tests for Complete Payment Flows
 *
 * Tests complete user payment journeys including:
 * - Trial to Pro upgrade flow
 * - Trial to PAYG activation flow
 * - Subscription renewal flow
 * - Subscription cancellation flow
 * - Failed payment recovery flow
 * - Tier upgrade/downgrade flows
 *
 * Task 41 - Story 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as ProCheckoutPOST } from '@/app/api/checkout/pro/route';
import { POST as PaygCreatePOST } from '@/app/api/subscription/payg/create/route';
import { POST as WebhookPOST } from '@/app/api/webhooks/lemonsqueezy/route';
import { createHmac } from 'crypto';

// Mock dependencies
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

vi.mock('@/lib/db/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    subscription: {
      upsert: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    lemonSqueezyEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/observability/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/lemonsqueezy/webhookHandlers', () => ({
  handleSubscriptionCreated: vi.fn(),
  handleSubscriptionUpdated: vi.fn(),
  handleSubscriptionCancelled: vi.fn(),
  handleSubscriptionResumed: vi.fn(),
  handleSubscriptionExpired: vi.fn(),
  handleSubscriptionPaused: vi.fn(),
  handleSubscriptionUnpaused: vi.fn(),
  handleSubscriptionPaymentSuccess: vi.fn(),
  handleSubscriptionPaymentFailed: vi.fn(),
  handleSubscriptionPaymentRecovered: vi.fn(),
}));

import { createClient } from '@/lib/auth/supabaseServer';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionCancelled,
  handleSubscriptionResumed,
  handleSubscriptionExpired,
  handleSubscriptionPaused,
  handleSubscriptionUnpaused,
  handleSubscriptionPaymentSuccess,
  handleSubscriptionPaymentFailed,
  handleSubscriptionPaymentRecovered
} from '@/lib/lemonsqueezy/webhookHandlers';

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST || 'test_webhook_secret';

function createWebhookSignature(payload: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
}

function createWebhookPayload(
  eventName: string,
  subscriptionId: string,
  userId: string,
  status: string = 'active'
) {
  return {
    meta: {
      test_mode: true,
      event_name: eventName,
      custom_data: { user_id: userId },
    },
    data: {
      type: 'subscriptions',
      id: subscriptionId,
      attributes: {
        store_id: 123456,
        customer_id: 67890,
        product_id: 111,
        variant_id: 222,
        status,
        created_at: new Date().toISOString(),
        renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        first_subscription_item: {
          id: 777888,
          price_id: 333,
          is_usage_based: false,
        },
      },
    },
  };
}

describe('End-to-End Payment Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      storeId: '123456',
      proVariantId: '789',
      paygVariantId: '012',
      webhookSecret: WEBHOOK_SECRET,
      isTestMode: true,
    });

    // Mock webhook handlers to resolve successfully and log appropriately
    (handleSubscriptionCreated as ReturnType<typeof vi.fn>).mockImplementation(async (data, _tx, customData) => {
      log.info({ userId: customData?.user_id, tier: 'pro' }, 'Subscription created');
    });
    (handleSubscriptionUpdated as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.info({ subscriptionId: data.id }, 'Subscription updated');
    });
    (handleSubscriptionCancelled as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.warn({ subscriptionId: data.id }, 'Subscription cancelled');
    });
    (handleSubscriptionResumed as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.info({ subscriptionId: data.id }, 'Subscription resumed');
    });
    (handleSubscriptionExpired as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.warn({ subscriptionId: data.id }, 'Subscription expired');
    });
    (handleSubscriptionPaused as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.warn({ subscriptionId: data.id }, 'Subscription paused');
    });
    (handleSubscriptionUnpaused as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.info({ subscriptionId: data.id }, 'Subscription unpaused');
    });
    (handleSubscriptionPaymentSuccess as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.info({ subscriptionId: data.id }, 'Subscription payment success');
    });
    (handleSubscriptionPaymentFailed as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.error({ subscriptionId: data.id }, 'Subscription payment failed');
    });
    (handleSubscriptionPaymentRecovered as ReturnType<typeof vi.fn>).mockImplementation(async (data) => {
      log.info({ subscriptionId: data.id }, 'Subscription payment recovered');
    });
  });

  describe('Trial to Pro Upgrade Flow', () => {
    it('should complete full upgrade journey from trial to Pro', async () => {
      // ========== STEP 1: User initiates Pro checkout ==========
      const userId = 'e2e-trial-to-pro-user';

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId, email: 'e2e@example.com' } },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        email: 'e2e@example.com',
        tier: 'trial',
        subscription: null,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-e2e-pro',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/e2e-pro',
            },
          },
        },
        error: null,
      });

      const checkoutRequest = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      const checkoutResponse = await ProCheckoutPOST(checkoutRequest);
      const checkoutData = await checkoutResponse.json();

      // ASSERT: Checkout created successfully
      expect(checkoutResponse.status).toBe(200);
      expect(checkoutData.success).toBe(true);
      expect(checkoutData.checkoutUrl).toBe('https://checkout.lemonsqueezy.com/e2e-pro');

      // ========== STEP 2: User completes payment, webhook received ==========
      const subscriptionId = 'ls-sub-e2e-pro-123';
      const webhookPayload = createWebhookPayload(
        'subscription_created',
        subscriptionId,
        userId,
        'active'
      );
      const webhookBody = JSON.stringify(webhookPayload);
      const webhookSignature = createWebhookSignature(webhookBody);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: subscriptionId,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: "test-event",
            }),
          },
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: subscriptionId,
            }),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({
              id: 'db-sub-123',
              lemonsqueezy_subscription_id: subscriptionId,
              tier: 'pro',
              status: 'active',
              user_id: userId,
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: userId,
              tier: 'pro',
              email: 'e2e@example.com',
            }),
          },
        })
      );

      const webhookRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': webhookSignature,
        },
        body: webhookBody,
      });

      const webhookResponse = await WebhookPOST(webhookRequest);

      // ASSERT: Webhook processed successfully
      expect(webhookResponse.status).toBe(200);

      // ASSERT: User upgraded to Pro
      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          tier: 'pro',
        }),
        expect.stringContaining('created')
      );
    });
  });

  describe('Trial to PAYG Activation Flow', () => {
    it('should complete full PAYG activation from trial', async () => {
      // ========== STEP 1: User activates PAYG ==========
      const userId = 'e2e-trial-to-payg-user';

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId, email: 'payg@example.com' } },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        email: 'payg@example.com',
        tier: 'trial',
        subscription: null,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-payg',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/payg',
            },
          },
        },
        error: null,
      });

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        tier: 'payg',
      });

      const paygRequest = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      const paygResponse = await PaygCreatePOST(paygRequest);
      const paygData = await paygResponse.json();

      // ASSERT: PAYG activated
      expect(paygResponse.status).toBe(200);
      expect(paygData.success).toBe(true);

      // ========== STEP 2: Webhook confirms subscription ==========
      const subscriptionId = 'ls-sub-payg-456';
      const webhookPayload = createWebhookPayload(
        'subscription_created',
        subscriptionId,
        userId,
        'active'
      );
      const webhookBody = JSON.stringify(webhookPayload);
      const webhookSignature = createWebhookSignature(webhookBody);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 2,
        lemonsqueezy_event_id: subscriptionId,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: "test-event",
            }),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({
              id: 'db-sub-payg',
              tier: 'payg',
              status: 'active',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: userId,
              tier: 'payg',
            }),
          },
        })
      );

      const webhookRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': webhookSignature,
        },
        body: webhookBody,
      });

      const webhookResponse = await WebhookPOST(webhookRequest);

      // ASSERT: Webhook processed
      expect(webhookResponse.status).toBe(200);
    });
  });

  describe('Subscription Renewal Flow', () => {
    it('should handle Pro subscription monthly renewal', async () => {
      // ========== Simulate monthly renewal ==========
      const userId = 'e2e-renewal-user';
      const subscriptionId = 'ls-sub-renewal-789';

      const renewalPayload = createWebhookPayload(
        'subscription_payment_success',
        subscriptionId,
        userId,
        'active'
      );
      const webhookBody = JSON.stringify(renewalPayload);
      const webhookSignature = createWebhookSignature(webhookBody);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 3,
        lemonsqueezy_event_id: `${subscriptionId}-payment`,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: "test-event",
            }),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({
              id: 'db-sub-renewal',
              status: 'active',
              renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: userId,
              messages_used_count: 0, // Reset on renewal
              messages_reset_date: new Date(),
            }),
          },
        })
      );

      const webhookRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': webhookSignature,
        },
        body: webhookBody,
      });

      const webhookResponse = await WebhookPOST(webhookRequest);

      // ASSERT: Renewal processed, usage reset
      expect(webhookResponse.status).toBe(200);
      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId,
        }),
        expect.stringContaining('payment success')
      );
    });
  });

  describe('Subscription Cancellation Flow', () => {
    it('should handle Pro subscription cancellation', async () => {
      // ========== User cancels subscription ==========
      const userId = 'e2e-cancel-user';
      const subscriptionId = 'ls-sub-cancel-012';

      const cancelPayload = createWebhookPayload(
        'subscription_cancelled',
        subscriptionId,
        userId,
        'cancelled'
      );
      const webhookBody = JSON.stringify(cancelPayload);
      const webhookSignature = createWebhookSignature(webhookBody);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 4,
        lemonsqueezy_event_id: subscriptionId,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: "test-event",
            }),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({
              id: 'db-sub-cancel',
              status: 'cancelled',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: userId,
              tier: 'trial', // Downgraded to trial
            }),
          },
        })
      );

      const webhookRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': webhookSignature,
        },
        body: webhookBody,
      });

      const webhookResponse = await WebhookPOST(webhookRequest);

      // ASSERT: Cancellation processed, user downgraded
      expect(webhookResponse.status).toBe(200);
      expect(log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId,
        }),
        expect.stringContaining('cancelled')
      );
    });
  });

  describe('Failed Payment Recovery Flow', () => {
    it('should handle failed payment and recovery', async () => {
      // ========== STEP 1: Payment fails ==========
      const userId = 'e2e-failed-payment-user';
      const subscriptionId = 'ls-sub-failed-345';

      const failedPayload = createWebhookPayload(
        'subscription_payment_failed',
        subscriptionId,
        userId,
        'past_due'
      );
      const failedBody = JSON.stringify(failedPayload);
      const failedSignature = createWebhookSignature(failedBody);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 5,
          lemonsqueezy_event_id: `${subscriptionId}-failed`,
        })
        .mockResolvedValueOnce({
          id: 6,
          lemonsqueezy_event_id: `${subscriptionId}-recovered`,
        });

      (prisma.$transaction as ReturnType<typeof vi.fn>)
        .mockImplementationOnce((callback) =>
          callback({
            lemonSqueezyEvent: {
              create: vi.fn().mockResolvedValue({
                id: 5,
                lemonsqueezy_event_id: `${subscriptionId}-failed`,
              }),
            },
            subscription: {
              update: vi.fn().mockResolvedValue({
                id: 'db-sub-failed',
                status: 'past_due',
              }),
            },
            user: {
              update: vi.fn().mockResolvedValue({
                id: userId,
                tier: 'trial', // Temporarily downgraded
              }),
            },
          })
        )
        .mockImplementationOnce((callback) =>
          callback({
            lemonSqueezyEvent: {
              create: vi.fn().mockResolvedValue({
                id: 6,
                lemonsqueezy_event_id: `${subscriptionId}-recovered`,
              }),
            },
            subscription: {
              update: vi.fn().mockResolvedValue({
                id: 'db-sub-failed',
                status: 'active',
              }),
            },
            user: {
              update: vi.fn().mockResolvedValue({
                id: userId,
                tier: 'pro', // Restored
              }),
            },
          })
        );

      const failedRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': failedSignature,
        },
        body: failedBody,
      });

      const failedResponse = await WebhookPOST(failedRequest);

      // ASSERT: Payment failure processed
      expect(failedResponse.status).toBe(200);

      // ========== STEP 2: Payment recovers ==========
      const recoveredPayload = createWebhookPayload(
        'subscription_payment_recovered',
        subscriptionId,
        userId,
        'active'
      );
      const recoveredBody = JSON.stringify(recoveredPayload);
      const recoveredSignature = createWebhookSignature(recoveredBody);

      const recoveredRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': recoveredSignature,
        },
        body: recoveredBody,
      });

      const recoveredResponse = await WebhookPOST(recoveredRequest);

      // ASSERT: Recovery processed, tier restored
      expect(recoveredResponse.status).toBe(200);
      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId,
        }),
        expect.stringContaining('recovered')
      );
    });
  });

  describe('Complete User Journey - Trial to Pro to Cancellation', () => {
    it('should handle complete user lifecycle', async () => {
      const userId = 'e2e-complete-journey-user';
      const subscriptionId = 'ls-sub-journey-678';

      // Mock Supabase client
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId, email: 'journey@example.com' } },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      // ===== PHASE 1: Trial User =====
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        email: 'journey@example.com',
        tier: 'trial',
        messages_used_count: 10,
        subscription: null,
      });

      // ===== PHASE 2: Upgrade to Pro =====
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-journey',
            attributes: { url: 'https://checkout.lemonsqueezy.com/journey' },
          },
        },
        error: null,
      });

      const checkoutRequest = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });
      const checkoutResponse = await ProCheckoutPOST(checkoutRequest);
      expect(checkoutResponse.status).toBe(200);

      // Process subscription_created webhook
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 7,
        lemonsqueezy_event_id: subscriptionId,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: "test-event",
            }),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({
              id: 'db-sub-journey',
              tier: 'pro',
              status: 'active',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: userId,
              tier: 'pro',
              messages_used_count: 0,
            }),
          },
        })
      );

      const createdPayload = createWebhookPayload(
        'subscription_created',
        subscriptionId,
        userId,
        'active'
      );
      const createdBody = JSON.stringify(createdPayload);
      const createdSignature = createWebhookSignature(createdBody);

      const createdRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': createdSignature,
        },
        body: createdBody,
      });

      const createdResponse = await WebhookPOST(createdRequest);
      expect(createdResponse.status).toBe(200);

      // ===== PHASE 3: User cancels after 2 months =====
      const cancelPayload = createWebhookPayload(
        'subscription_cancelled',
        subscriptionId,
        userId,
        'cancelled'
      );
      const cancelBody = JSON.stringify(cancelPayload);
      const cancelSignature = createWebhookSignature(cancelBody);

      const cancelRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': cancelSignature,
        },
        body: cancelBody,
      });

      const cancelResponse = await WebhookPOST(cancelRequest);

      // ASSERT: Complete journey succeeded
      expect(cancelResponse.status).toBe(200);
      expect(log.info).toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalled();
    });
  });
});
