/**
 * Integration Tests for /api/webhooks/lemonsqueezy Endpoint
 *
 * Tests the Lemon Squeezy webhook processing including:
 * - Signature verification (HMAC SHA-256)
 * - Event type handling (subscription_created, subscription_payment_success, subscription_cancelled)
 * - Idempotency (duplicate event detection)
 * - Database updates (user tier, subscription records)
 *
 * Story 3.4 - Task 20
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/lemonsqueezy/route';
import { createHmac } from 'crypto';

// Mock all dependencies
vi.mock('@/lib/lemonsqueezy/client', () => ({
  getLemonSqueezyConfig: vi.fn(),
}));

vi.mock('@/lib/lemonsqueezy/webhookHandlers', () => ({
  handleSubscriptionCreated: vi.fn(),
  handleSubscriptionPaymentSuccess: vi.fn(),
  handleSubscriptionCancelled: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  default: {
    lemonSqueezyEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      lemonSqueezyEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      user: {
        update: vi.fn(),
      },
      subscription: {
        upsert: vi.fn(),
        update: vi.fn(),
      },
    })),
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
import {
  handleSubscriptionCreated,
  handleSubscriptionPaymentSuccess,
  handleSubscriptionCancelled,
} from '@/lib/lemonsqueezy/webhookHandlers';
import prisma from '@/lib/db/prisma';

/**
 * Helper function to create a valid webhook signature
 */
function createWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Helper function to create a mock webhook payload
 */
function createMockWebhookPayload(eventName: string, subscriptionId: string = '123456'): Record<string, any> {
  return {
    meta: {
      test_mode: true,
      event_name: eventName,
      custom_data: {
        user_id: 'test-user-123',
      },
    },
    data: {
      type: 'subscriptions',
      id: subscriptionId,
      attributes: {
        store_id: 12345,
        customer_id: 67890,
        order_id: 111222,
        product_id: 333444,
        variant_id: 555666,
        product_name: 'Tower of Babel Pro',
        variant_name: 'Pro Subscription',
        user_email: 'test@example.com',
        status: 'active',
        status_formatted: 'Active',
        card_brand: 'visa',
        card_last_four: '4242',
        pause: null,
        cancelled: false,
        trial_ends_at: null,
        billing_anchor: 1,
        first_subscription_item: {
          id: 777888,
          subscription_id: parseInt(subscriptionId),
          price_id: 999000,
          quantity: 1,
          is_usage_based: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        urls: {
          update_payment_method: 'https://example.com/update',
          customer_portal: 'https://example.com/portal',
        },
        renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ends_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        test_mode: true,
      },
    },
  };
}

describe('POST /api/webhooks/lemonsqueezy', () => {
  const mockWebhookSecret = 'test_webhook_secret_12345';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Lemon Squeezy config
    (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      webhookSecret: mockWebhookSecret,
      isTestMode: true,
    });
  });

  describe('Signature Verification', () => {
    it('should return 401 for missing signature header', async () => {
      // ARRANGE: Create webhook payload without signature
      const payload = createMockWebhookPayload('subscription_created');
      const payloadString = JSON.stringify(payload);

      // Create request WITHOUT X-Signature header
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Should reject with 401
      expect(response.status).toBe(401);
      expect(data.error).toContain('signature');
    });

    it('should return 401 for invalid signature', async () => {
      // ARRANGE: Create webhook payload with INVALID signature
      const payload = createMockWebhookPayload('subscription_created');
      const payloadString = JSON.stringify(payload);
      const invalidSignature = 'invalid_signature_12345';

      // Create request with invalid signature
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': invalidSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);

      // ASSERT: Should reject with 401
      expect(response.status).toBe(401);
    });

    it('should accept valid signature', async () => {
      // ARRANGE: Create webhook payload with VALID signature
      const payload = createMockWebhookPayload('subscription_created');
      const payloadString = JSON.stringify(payload);
      const validSignature = createWebhookSignature(payloadString, mockWebhookSecret);

      // Mock idempotency check (event not processed yet)
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'event-123',
        event_id: `evt_${payload.meta.event_name}_${payload.data.id}`,
        event_name: payload.meta.event_name,
        payload: payload,
        processed_at: new Date(),
      });

      // Mock subscription handler
      (handleSubscriptionCreated as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Create request with valid signature
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': validSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);

      // ASSERT: Should accept with 200
      expect(response.status).toBe(200);
    });
  });

  describe('Event Type Handling', () => {
    it('should process subscription_created event', async () => {
      // ARRANGE: Create subscription_created webhook
      const payload = createMockWebhookPayload('subscription_created');
      const payloadString = JSON.stringify(payload);
      const validSignature = createWebhookSignature(payloadString, mockWebhookSecret);

      // Mock idempotency check
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'event-123',
        event_id: `evt_subscription_created_${payload.data.id}`,
        event_name: 'subscription_created',
        payload: payload,
        processed_at: new Date(),
      });

      // Mock subscription handler
      (handleSubscriptionCreated as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Create request
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': validSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);

      // ASSERT: Should call subscription_created handler
      expect(response.status).toBe(200);
      // Handler is called with payload.data and transaction object
      expect(handleSubscriptionCreated).toHaveBeenCalledWith(payload.data, expect.anything());
      expect(handleSubscriptionPaymentSuccess).not.toHaveBeenCalled();
      expect(handleSubscriptionCancelled).not.toHaveBeenCalled();
    });

    it('should process subscription_payment_success event', async () => {
      // ARRANGE: Create subscription_payment_success webhook
      const payload = createMockWebhookPayload('subscription_payment_success');
      const payloadString = JSON.stringify(payload);
      const validSignature = createWebhookSignature(payloadString, mockWebhookSecret);

      // Mock idempotency check
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'event-123',
        event_id: `evt_subscription_payment_success_${payload.data.id}`,
        event_name: 'subscription_payment_success',
        payload: payload,
        processed_at: new Date(),
      });

      // Mock payment handler
      (handleSubscriptionPaymentSuccess as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Create request
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': validSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);

      // ASSERT: Should call subscription_payment_success handler
      expect(response.status).toBe(200);
      // Handler is called with payload.data and transaction object
      expect(handleSubscriptionPaymentSuccess).toHaveBeenCalledWith(payload.data, expect.anything());
      expect(handleSubscriptionCreated).not.toHaveBeenCalled();
      expect(handleSubscriptionCancelled).not.toHaveBeenCalled();
    });

    it('should process subscription_cancelled event', async () => {
      // ARRANGE: Create subscription_cancelled webhook
      const payload = createMockWebhookPayload('subscription_cancelled');
      payload.data.attributes.cancelled = true;
      payload.data.attributes.status = 'cancelled';

      const payloadString = JSON.stringify(payload);
      const validSignature = createWebhookSignature(payloadString, mockWebhookSecret);

      // Mock idempotency check
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'event-123',
        event_id: `evt_subscription_cancelled_${payload.data.id}`,
        event_name: 'subscription_cancelled',
        payload: payload,
        processed_at: new Date(),
      });

      // Mock cancellation handler
      (handleSubscriptionCancelled as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Create request
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': validSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);

      // ASSERT: Should call subscription_cancelled handler
      expect(response.status).toBe(200);
      // Handler is called with payload.data and transaction object
      expect(handleSubscriptionCancelled).toHaveBeenCalledWith(payload.data, expect.anything());
      expect(handleSubscriptionCreated).not.toHaveBeenCalled();
      expect(handleSubscriptionPaymentSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency', () => {
    it('should skip duplicate events', async () => {
      // ARRANGE: Create webhook that was already processed
      const payload = createMockWebhookPayload('subscription_created', '999888');
      const payloadString = JSON.stringify(payload);
      const validSignature = createWebhookSignature(payloadString, mockWebhookSecret);

      // Mock idempotency check - event ALREADY EXISTS
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'event-existing',
        event_id: `evt_subscription_created_999888`,
        event_name: 'subscription_created',
        payload: payload,
        processed_at: new Date(Date.now() - 60000),  // Processed 1 minute ago
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': validSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Should return 200 but not process event
      expect(response.status).toBe(200);
      expect(data.duplicate).toBe(true);
      expect(data.received).toBe(true);

      // Handlers should NOT be called for duplicate event
      expect(handleSubscriptionCreated).not.toHaveBeenCalled();
      expect(handleSubscriptionPaymentSuccess).not.toHaveBeenCalled();
      expect(handleSubscriptionCancelled).not.toHaveBeenCalled();
    });

    it('should process new events even from same subscription', async () => {
      // ARRANGE: Create NEW event for existing subscription
      const payload1 = createMockWebhookPayload('subscription_created', '999888');
      const payload2 = createMockWebhookPayload('subscription_payment_success', '999888');

      const payloadString = JSON.stringify(payload2);
      const validSignature = createWebhookSignature(payloadString, mockWebhookSecret);

      // Mock: subscription_created was processed, but subscription_payment_success is NEW
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'event-new',
        event_id: `evt_subscription_payment_success_999888`,
        event_name: 'subscription_payment_success',
        payload: payload2,
        processed_at: new Date(),
      });

      (handleSubscriptionPaymentSuccess as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Create request
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': validSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);

      // ASSERT: Should process the new event
      expect(response.status).toBe(200);
      expect(handleSubscriptionPaymentSuccess).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if handler throws error', async () => {
      // ARRANGE: Create valid webhook but handler will fail
      const payload = createMockWebhookPayload('subscription_created');
      const payloadString = JSON.stringify(payload);
      const validSignature = createWebhookSignature(payloadString, mockWebhookSecret);

      // Mock idempotency check
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'event-123',
        event_id: `evt_subscription_created_${payload.data.id}`,
        event_name: 'subscription_created',
        payload: payload,
        processed_at: new Date(),
      });

      // Mock handler to throw error
      (handleSubscriptionCreated as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Create request
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': validSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);

      // ASSERT: Should return 500
      expect(response.status).toBe(500);
    });

    it('should handle unknown event types gracefully', async () => {
      // ARRANGE: Create webhook with unknown event type
      const payload = createMockWebhookPayload('subscription_unknown_event');
      const payloadString = JSON.stringify(payload);
      const validSignature = createWebhookSignature(payloadString, mockWebhookSecret);

      // Mock idempotency check
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'event-123',
        event_id: `evt_subscription_unknown_event_${payload.data.id}`,
        event_name: 'subscription_unknown_event',
        payload: payload,
        processed_at: new Date(),
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': validSignature,
        },
        body: payloadString,
      });

      // ACT: Call the webhook handler
      const response = await POST(request);

      // ASSERT: Should return 200 (acknowledge receipt but don't process)
      expect(response.status).toBe(200);

      // No handlers should be called
      expect(handleSubscriptionCreated).not.toHaveBeenCalled();
      expect(handleSubscriptionPaymentSuccess).not.toHaveBeenCalled();
      expect(handleSubscriptionCancelled).not.toHaveBeenCalled();
    });
  });
});
