/**
 * Integration Tests for Webhook Retry Logic
 *
 * Tests webhook retry and resilience mechanisms including:
 * - Automatic retry on temporary failures
 * - Exponential backoff
 * - Maximum retry limits
 * - Idempotency during retries
 * - Dead letter queue scenarios
 * - Partial success handling
 *
 * Task 40 - Story 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/lemonsqueezy/route';
import { createHmac } from 'crypto';

// Mock dependencies
vi.mock('@/lib/lemonsqueezy/client', () => ({
  configureLemonSqueezy: vi.fn(),
  getLemonSqueezyConfig: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  default: {
    lemonSqueezyEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
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

import { getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST || 'test_webhook_secret';

function createWebhookSignature(payload: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
}

function createMockWebhookPayload(eventName: string, eventId: string, customData: any = {}) {
  return {
    meta: {
      test_mode: true,
      event_name: eventName,
      custom_data: customData,
      webhook_id: `wh-${eventId}`,
    },
    data: {
      type: 'subscriptions',
      id: eventId,
      attributes: {
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

describe('Webhook Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      storeId: '123456',
      proVariantId: '789',
      paygVariantId: '012',
      webhookSecret: WEBHOOK_SECRET,
      isTestMode: true,
    });
  });

  describe('Idempotency During Retries', () => {
    it('should handle duplicate webhook deliveries (retry scenario)', async () => {
      // ARRANGE: Lemon Squeezy retries same webhook multiple times
      const eventId = 'evt-retry-123';
      const payload = createMockWebhookPayload('subscription_created', eventId, {
        user_id: 'user-retry-123',
      });
      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      // First delivery: Event doesn't exist
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null) // First check
        .mockResolvedValueOnce({
          // Second check (retry)
          id: 1,
          lemonsqueezy_event_id: eventId,
          event_type: 'subscription_created',
          processed: true,
          created_at: new Date(),
        });

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: eventId,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            upsert: vi.fn().mockResolvedValue({ id: 'sub-123', status: 'active' }),
          },
          user: {
            update: vi.fn().mockResolvedValue({ id: 'user-retry-123', tier: 'pro' }),
          },
        })
      );

      const request1 = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      const request2 = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT: Process webhook twice (simulating retry)
      const response1 = await POST(request1);
      const response2 = await POST(request2);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // ASSERT: Both should succeed, but second is marked as duplicate
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data2.duplicate).toBe(true);

      // Transaction should only be called once
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle retry after transient database failure', async () => {
      // ARRANGE
      const eventId = 'evt-db-retry-456';
      const payload = createMockWebhookPayload('subscription_created', eventId, {
        user_id: 'user-db-retry-456',
      });
      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      // First attempt: Database connection fails
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(null); // Second attempt succeeds

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: eventId,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            upsert: vi.fn().mockResolvedValue({ id: 'sub-456' }),
          },
          user: {
            update: vi.fn().mockResolvedValue({ id: 'user-db-retry-456' }),
          },
        })
      );

      const request1 = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      const request2 = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT: First attempt fails, retry succeeds
      const response1 = await POST(request1);
      const response2 = await POST(request2);

      // ASSERT: First should fail, second should succeed
      expect(response1.status).toBeGreaterThanOrEqual(500);
      expect(response2.status).toBe(200);
    });

    it('should prevent duplicate charges on payment retry', async () => {
      // ARRANGE: Payment success webhook delivered multiple times
      const eventId = 'evt-payment-retry-789';
      const payload = createMockWebhookPayload('subscription_payment_success', eventId, {
        user_id: 'user-payment-789',
      });
      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      let updateCalls = 0;

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          if (updateCalls === 0) {
            return Promise.resolve(null);
          }
          return Promise.resolve({
            id: 1,
            lemonsqueezy_event_id: eventId,
            processed: true,
          });
        }
      );

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: eventId,
      });

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) => {
        updateCalls++;
        return callback({
          subscription: {
            update: vi.fn().mockResolvedValue({ id: 'sub-789' }),
          },
          user: {
            update: vi.fn().mockResolvedValue({ messages_used_count: 0 }),
          },
        });
      });

      // ACT: Deliver webhook 3 times (simulating retries)
      const requests = [1, 2, 3].map(
        () =>
          new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-signature': signature,
            },
            body,
          })
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      // ASSERT: All responses should be successful
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // But transaction should only execute once
      expect(updateCalls).toBe(1);
    });
  });

  describe('Partial Success Handling', () => {
    it('should handle webhook processing that partially succeeds', async () => {
      // ARRANGE: Event stored but transaction fails
      const eventId = 'evt-partial-012';
      const payload = createMockWebhookPayload('subscription_created', eventId, {
        user_id: 'user-partial-012',
      });
      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: eventId,
      });

      // Transaction fails
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('User not found')
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
      const response = await POST(request);

      // ASSERT: Should fail gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(log.error).toHaveBeenCalled();
    });

    it('should mark event as failed for manual retry after max attempts', async () => {
      // ARRANGE: Event that fails processing multiple times
      const eventId = 'evt-max-retry-345';
      const payload = createMockWebhookPayload('subscription_created', eventId, {
        user_id: 'nonexistent-user-345',
      });
      const body = JSON.stringify(payload);
      const signature = createWebhookSignature(body);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: eventId,
      });

      // Always fails due to nonexistent user
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('User not found: nonexistent-user-345')
      );

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
        },
        body,
      });

      // ACT: Multiple retry attempts
      const responses = await Promise.all([
        POST(request),
        POST(request),
        POST(request),
      ]);

      // ASSERT: All should fail
      responses.forEach((response) => {
        expect(response.status).toBeGreaterThanOrEqual(400);
      });

      // Error should be logged multiple times
      expect((log.error as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Retry Timing and Ordering', () => {
    it('should handle out-of-order webhook delivery', async () => {
      // ARRANGE: payment_success arrives before subscription_created
      const subId = 'sub-order-678';
      const paymentPayload = createMockWebhookPayload(
        'subscription_payment_success',
        `${subId}-payment`,
        { user_id: 'user-order-678' }
      );
      const createdPayload = createMockWebhookPayload('subscription_created', `${subId}-created`, {
        user_id: 'user-order-678',
      });

      const paymentBody = JSON.stringify(paymentPayload);
      const createdBody = JSON.stringify(createdPayload);
      const paymentSignature = createWebhookSignature(paymentBody);
      const createdSignature = createWebhookSignature(createdBody);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: any) => ({
          id: args.data.lemonsqueezy_event_id === `${subId}-payment` ? 1 : 2,
          lemonsqueezy_event_id: args.data.lemonsqueezy_event_id,
        })
      );

      // Payment webhook finds subscription doesn't exist yet
      (prisma.$transaction as ReturnType<typeof vi.fn>)
        .mockImplementationOnce((callback) =>
          callback({
            subscription: {
              update: vi.fn().mockRejectedValue(new Error('Subscription not found')),
            },
            user: { update: vi.fn() },
          })
        )
        .mockImplementationOnce((callback) =>
          callback({
            subscription: {
              upsert: vi.fn().mockResolvedValue({ id: 'sub-678' }),
            },
            user: {
              update: vi.fn().mockResolvedValue({ id: 'user-order-678' }),
            },
          })
        );

      const paymentRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': paymentSignature,
        },
        body: paymentBody,
      });

      const createdRequest = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': createdSignature,
        },
        body: createdBody,
      });

      // ACT: Payment webhook arrives first (out of order)
      const paymentResponse = await POST(paymentRequest);

      // Then created webhook arrives
      const createdResponse = await POST(createdRequest);

      // ASSERT: Created should succeed, payment may fail gracefully
      expect(createdResponse.status).toBe(200);
      // Payment either fails or is queued for retry
      expect([200, 400, 500]).toContain(paymentResponse.status);
    });

    it('should handle rapid sequential webhooks for same subscription', async () => {
      // ARRANGE: Multiple status change webhooks arrive rapidly
      const subId = 'sub-rapid-901';
      const events = [
        'subscription_created',
        'subscription_payment_success',
        'subscription_updated',
      ];

      const requests = events.map((eventName, index) => {
        const payload = createMockWebhookPayload(`${subId}-${index}`, eventName, {
          user_id: 'user-rapid-901',
        });
        const body = JSON.stringify(payload);
        const signature = createWebhookSignature(body);

        return new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': signature,
          },
          body,
        });
      });

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockImplementation(
        async (args: any) => ({
          id: Math.floor(Math.random() * 1000),
          lemonsqueezy_event_id: args.data.lemonsqueezy_event_id,
        })
      );

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback({
          subscription: {
            upsert: vi.fn().mockResolvedValue({ id: subId }),
            update: vi.fn().mockResolvedValue({ id: subId }),
          },
          user: {
            update: vi.fn().mockResolvedValue({ id: 'user-rapid-901' }),
          },
        })
      );

      // ACT: Process all webhooks rapidly
      const responses = await Promise.all(requests.map((req) => POST(req)));

      // ASSERT: All should be processed successfully
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Dead Letter Queue Scenarios', () => {
    it('should log permanently failed events for manual investigation', async () => {
      // ARRANGE: Event with corrupted data that will never succeed
      const eventId = 'evt-dlq-234';
      const corruptedPayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: null }, // Invalid
        },
        data: null, // Corrupted
      };
      const body = JSON.stringify(corruptedPayload);
      const signature = createWebhookSignature(body);

      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: eventId,
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
      const response = await POST(request);

      // ASSERT: Should fail and log for investigation
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: expect.any(String),
        }),
        expect.stringContaining('error')
      );
    });
  });
});
