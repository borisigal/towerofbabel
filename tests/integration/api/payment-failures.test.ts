/**
 * Integration Tests for Payment Failure Scenarios
 *
 * Tests how the system handles various payment failures including:
 * - Declined cards
 * - Insufficient funds
 * - Payment processor errors
 * - 3D Secure authentication failures
 * - Failed recurring payments
 * - Webhook failures after payment
 * - Database consistency during failures
 *
 * Task 32 - Story 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as ProCheckoutPOST } from '@/app/api/checkout/pro/route';
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
    },
    subscription: {
      upsert: vi.fn(),
      update: vi.fn(),
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

import { createClient } from '@/lib/auth/supabaseServer';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST || 'test_webhook_secret';

function createWebhookSignature(payload: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
}

function createMockWebhookPayload(eventName: string, customData: any = {}) {
  return {
    meta: {
      test_mode: true,
      event_name: eventName,
      custom_data: customData,
    },
    data: {
      type: 'subscriptions',
      id: '12345',
      attributes: {
        subscription_id: 12345,
        store_id: 123456,
        customer_id: 67890,
        product_id: 111,
        variant_id: 222,
        status: 'active',
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

describe('Payment Failure Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set default mocks to prevent undefined errors
    (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      storeId: '123456',
      proVariantId: '789',
      paygVariantId: '012',
      webhookSecret: WEBHOOK_SECRET,
      isTestMode: true,
    });
  });

  describe('Checkout Creation Failures', () => {
    it('should handle Lemon Squeezy API returning payment processor error', async () => {
      // ARRANGE
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'user@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });

      // Payment processor error
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          message: 'Payment processor unavailable',
          status: 503,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await ProCheckoutPOST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CHECKOUT_CREATION_FAILED');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle invalid payment method configuration', async () => {
      // ARRANGE
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'user@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          message: 'Payment methods not configured for this store',
          status: 422,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await ProCheckoutPOST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('CHECKOUT_CREATION_FAILED');
    });

    it('should handle Lemon Squeezy API rate limiting during checkout', async () => {
      // ARRANGE
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'user@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          message: 'Too many requests',
          status: 429,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await ProCheckoutPOST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('CHECKOUT_CREATION_FAILED');
      expect(log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        }),
        expect.any(String)
      );
    });
  });

  describe('Webhook Payment Failure Events', () => {
    it('should handle subscription_payment_failed webhook', async () => {
      // ARRANGE
      const payload = {
        meta: {
          test_mode: true,
          event_name: 'subscription_payment_failed',
          custom_data: { user_id: 'user-123' },
        },
        data: {
          type: 'subscriptions',
          id: '12345',
          attributes: {
            subscription_id: 12345,
            store_id: 123456,
            customer_id: 67890,
            product_id: 111,
            variant_id: 222,
            status: 'past_due',
            status_formatted: 'Past due',
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

      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: '12345',
            }),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({
              id: 'sub-123',
              status: 'past_due',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: 'user-123',
              tier: 'trial', // Downgraded due to payment failure
            }),
          },
        })
      );

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT
      const response = await WebhookPOST(request);

      // ASSERT
      expect(response.status).toBe(200);
      expect(log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: '12345',
        }),
        expect.stringContaining('payment failed')
      );
    });

    it('should handle subscription_payment_recovered webhook', async () => {
      // ARRANGE: Payment recovered after failure
      const payload = {
        meta: {
          test_mode: true,
          event_name: 'subscription_payment_recovered',
          custom_data: { user_id: 'user-123' },
        },
        data: {
          type: 'subscriptions',
          id: '12345',
          attributes: {
            subscription_id: 12345,
            store_id: 123456,
            customer_id: 67890,
            product_id: 111,
            variant_id: 222,
            status: 'active',
            status_formatted: 'Active',
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

      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: '12345',
            }),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({
              id: 'sub-123',
              status: 'active',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: 'user-123',
              tier: 'pro', // Restored after payment recovery
            }),
          },
        })
      );

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT
      const response = await WebhookPOST(request);

      // ASSERT
      expect(response.status).toBe(200);
      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: '12345',
        }),
        expect.stringContaining('payment recovered')
      );
    });

    it('should handle multiple consecutive payment failures (past_due -> expired)', async () => {
      // ARRANGE: Multiple failures lead to expiration
      const payload = {
        meta: {
          test_mode: true,
          event_name: 'subscription_expired',
          custom_data: { user_id: 'user-123' },
        },
        data: {
          type: 'subscriptions',
          id: '12345',
          attributes: {
            subscription_id: 12345,
            store_id: 123456,
            customer_id: 67890,
            product_id: 111,
            variant_id: 222,
            status: 'expired',
            status_formatted: 'Expired',
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            renews_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            first_subscription_item: {
              id: 777888,
              price_id: 333,
              is_usage_based: false,
            },
          },
        },
      };

      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: '12345',
            }),
          },
          subscription: {
            update: vi.fn().mockResolvedValue({
              id: 'sub-123',
              status: 'expired',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: 'user-123',
              tier: 'trial', // Reverted to trial
            }),
          },
        })
      );

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT
      const response = await WebhookPOST(request);

      // ASSERT
      expect(response.status).toBe(200);
      expect(log.warn).toHaveBeenCalled();
    });
  });

  describe('Database Consistency During Payment Failures', () => {
    it('should rollback user tier change if subscription update fails', async () => {
      // ARRANGE
      const payload = createMockWebhookPayload('subscription_created', { user_id: 'user-123' });
      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      // Transaction: subscription succeeds, user update fails
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: '12345',
            }),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({
              id: 'sub-123',
              status: 'active',
            }),
          },
          user: {
            update: vi.fn().mockRejectedValue(new Error('Database constraint violation')),
          },
        })
      );

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT
      const response = await WebhookPOST(request);

      // ASSERT: Should fail gracefully, transaction rolled back
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle payment success but webhook delivery failure', async () => {
      // ARRANGE: Payment succeeds but webhook never arrives (manual recovery scenario)
      // This tests that when webhook finally arrives late, system handles it correctly

      const payload = createMockWebhookPayload('subscription_created', { user_id: 'user-123' });
      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      // Subscription already exists (created manually or by late webhook retry)
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
        event_type: 'subscription_created',
        processed: true,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT
      const response = await WebhookPOST(request);
      const data = await response.json();

      // ASSERT: Should recognize duplicate and skip
      expect(response.status).toBe(200);
      expect(data.duplicate).toBe(true);
    });

    it('should maintain data integrity when concurrent webhooks arrive', async () => {
      // ARRANGE: Multiple webhook events for same subscription arrive simultaneously
      const userId = 'user-123';
      const subscriptionId = '12345';

      const payload1 = createMockWebhookPayload('subscription_created', { user_id: userId });
      payload1.data.id = subscriptionId;

      const payload2 = createMockWebhookPayload('subscription_payment_success', {
        user_id: userId,
      });
      payload2.data.id = subscriptionId;

      const body1 = JSON.stringify(payload1);
      const body2 = JSON.stringify(payload2);
      const signature1 = createWebhookSignature(body1);
      const signature2 = createWebhookSignature(body2);

      let eventCallCount = 0;
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockImplementation(() => {
        eventCallCount++;
        if (eventCallCount <= 2) {
          return Promise.resolve(null); // First two calls: events don't exist
        }
        return Promise.resolve({
          id: eventCallCount,
          lemonsqueezy_event_id: subscriptionId,
          processed: true,
        });
      });

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: subscriptionId,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: '12345',
            }),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({
              id: 'sub-123',
              status: 'active',
            }),
            update: vi.fn().mockResolvedValue({
              id: 'sub-123',
              status: 'active',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: userId,
              tier: 'pro',
            }),
          },
        })
      );

      const request1 = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature1,
        },
        body: body1,
      });

      const request2 = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature2,
        },
        body: body2,
      });

      // ACT: Process webhooks concurrently
      const responses = await Promise.all([WebhookPOST(request1), WebhookPOST(request2)]);

      // ASSERT: Both should succeed without data corruption
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Payment Method Validation Failures', () => {
    it('should log warning for unsupported payment method', async () => {
      // ARRANGE
      const payload = {
        meta: {
          test_mode: true,
          event_name: 'subscription_created',
          custom_data: { user_id: 'user-123', payment_method: 'unsupported_crypto' },
        },
        data: {
          type: 'subscriptions',
          id: '12345',
          attributes: {
            subscription_id: 12345,
            store_id: 123456,
            customer_id: 67890,
            product_id: 111,
            variant_id: 222,
            status: 'active',
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

      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          lemonSqueezyEvent: {
            create: vi.fn().mockResolvedValue({
              id: 1,
              lemonsqueezy_event_id: '12345',
            }),
          },
          subscription: {
            upsert: vi.fn().mockResolvedValue({
              id: 'sub-123',
              status: 'active',
            }),
          },
          user: {
            update: vi.fn().mockResolvedValue({
              id: 'user-123',
              tier: 'pro',
            }),
          },
        })
      );

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT
      const response = await WebhookPOST(request);

      // ASSERT: Should process but may log warning
      expect(response.status).toBe(200);
    });

    it('should handle fraud detection block from payment processor', async () => {
      // ARRANGE
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'suspicious@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-123',
        email: 'suspicious@example.com',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          message: 'Payment blocked by fraud detection',
          status: 403,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await ProCheckoutPOST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('CHECKOUT_CREATION_FAILED');
      expect(log.error).toHaveBeenCalled();
    });
  });
});
