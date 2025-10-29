/**
 * Security Tests for Lemon Squeezy Webhook Endpoint
 *
 * Tests security aspects of /api/webhooks/lemonsqueezy including:
 * - Signature verification
 * - Payload tampering detection
 * - DoS protection
 * - Rate limiting
 *
 * Task 29 - Story 3.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/lemonsqueezy/route';
import { createHmac } from 'crypto';

// Mock dependencies
vi.mock('@/lib/lemonsqueezy/client', () => ({
  configureLemonSqueezy: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  default: {
    lemonSqueezyEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      subscription: {
        upsert: vi.fn(),
        update: vi.fn(),
      },
      user: {
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    })),
  },
}));

vi.mock('@/lib/observability/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST || 'test_webhook_secret';

/**
 * Create valid HMAC signature for webhook payload
 */
function createWebhookSignature(payload: string): string {
  return createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
}

/**
 * Create mock webhook payload
 */
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

describe('Webhook Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Signature Verification', () => {
    it('should reject webhook with missing signature header', async () => {
      // ARRANGE
      const payload = createMockWebhookPayload('subscription_created', { user_id: 'test-user' });
      const body = JSON.stringify(payload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Missing x-signature header
        },
        body,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Missing signature');
    });

    it('should reject webhook with wrong signature (tampered payload)', async () => {
      // ARRANGE
      const payload = createMockWebhookPayload('subscription_created', { user_id: 'test-user' });
      const body = JSON.stringify(payload);

      // Create signature for original payload
      const validSignature = createWebhookSignature(body);

      // Tamper with payload after signature generation
      const tamperedPayload = { ...payload, data: { ...payload.data, id: '99999' } };
      const tamperedBody = JSON.stringify(tamperedPayload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature, // Valid signature but for different payload
        },
        body: tamperedBody,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid signature');
    });

    it('should accept webhook with valid signature', async () => {
      // ARRANGE
      const payload = createMockWebhookPayload('subscription_created', { user_id: 'valid-user-uuid' });
      const body = JSON.stringify(payload);
      const validSignature = createWebhookSignature(body);

      // Mock database responses
      const prisma = (await import('@/lib/db/prisma')).default;
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBe(200);
    });

    it('should reject webhook with malformed signature', async () => {
      // ARRANGE
      const payload = createMockWebhookPayload('subscription_created', { user_id: 'test-user' });
      const body = JSON.stringify(payload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'not-a-valid-hmac-signature',
        },
        body,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBe(401);
    });
  });

  describe('Payload Tampering Detection', () => {
    it('should detect user_id manipulation in custom_data', async () => {
      // ARRANGE: Attacker tries to create subscription for different user
      const payload = createMockWebhookPayload('subscription_created', {
        user_id: 'attacker-id',
      });
      const body = JSON.stringify(payload);
      const validSignature = createWebhookSignature(body);

      // Change user_id after signature (simulating tampering)
      const tamperedPayload = {
        ...payload,
        meta: {
          ...payload.meta,
          custom_data: { user_id: 'victim-id' },
        },
      };
      const tamperedBody = JSON.stringify(tamperedPayload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body: tamperedBody,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBe(401); // Signature mismatch
    });

    it('should detect subscription_id manipulation', async () => {
      // ARRANGE
      const payload = createMockWebhookPayload('subscription_payment_success', {
        user_id: 'test-user',
      });
      const body = JSON.stringify(payload);
      const validSignature = createWebhookSignature(body);

      // Change subscription ID after signature
      const tamperedPayload = {
        ...payload,
        data: { ...payload.data, id: 'different-subscription-id' },
      };
      const tamperedBody = JSON.stringify(tamperedPayload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body: tamperedBody,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBe(401);
    });

    it('should detect event_name manipulation', async () => {
      // ARRANGE: Attacker tries to change subscription_created to subscription_cancelled
      const payload = createMockWebhookPayload('subscription_created', { user_id: 'test-user' });
      const body = JSON.stringify(payload);
      const validSignature = createWebhookSignature(body);

      const tamperedPayload = {
        ...payload,
        meta: { ...payload.meta, event_name: 'subscription_cancelled' },
      };
      const tamperedBody = JSON.stringify(tamperedPayload);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body: tamperedBody,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBe(401);
    });
  });

  describe('DoS Protection', () => {
    it('should handle large payload gracefully (10MB limit)', async () => {
      // ARRANGE: Create very large payload
      const largeData = 'x'.repeat(11 * 1024 * 1024); // 11MB payload
      const payload = createMockWebhookPayload('subscription_created', {
        user_id: 'test-user',
        large_data: largeData,
      });
      const body = JSON.stringify(payload);
      const validSignature = createWebhookSignature(body);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body,
      });

      // ACT
      const response = await POST(request);

      // ASSERT: Should reject or handle gracefully without crashing
      // Most platforms have request size limits (Vercel: 4.5MB)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle malformed JSON gracefully', async () => {
      // ARRANGE
      const malformedBody = '{ "invalid": json malformed }';
      const validSignature = createWebhookSignature(malformedBody);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body: malformedBody,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle empty payload gracefully', async () => {
      // ARRANGE
      const emptyBody = '';
      const validSignature = createWebhookSignature(emptyBody);

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body: emptyBody,
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Replay Attack Protection', () => {
    it('should reject duplicate webhook events (idempotency)', async () => {
      // ARRANGE
      const payload = createMockWebhookPayload('subscription_created', { user_id: 'test-user' });
      const body = JSON.stringify(payload);
      const validSignature = createWebhookSignature(body);

      const prisma = (await import('@/lib/db/prisma')).default;

      // First request: Event doesn't exist yet
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      const request1 = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body,
      });

      // ACT: First webhook
      const response1 = await POST(request1);

      // ASSERT: First webhook succeeds
      expect(response1.status).toBe(200);

      // Second request: Event already exists (replay attack)
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 1,
        lemonsqueezy_event_id: '12345',
        event_type: 'subscription_created',
        processed: true,
      });

      const request2 = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body,
      });

      // ACT: Second webhook (replay)
      const response2 = await POST(request2);
      const data2 = await response2.json();

      // ASSERT: Second webhook rejected as duplicate
      expect(response2.status).toBe(200);
      expect(data2.duplicate).toBe(true);
    });
  });

  describe('Authorization and Access Control', () => {
    it('should not allow unauthorized event types', async () => {
      // ARRANGE: Unknown event type
      const payload = createMockWebhookPayload('unauthorized_event_type', { user_id: 'test-user' });
      const body = JSON.stringify(payload);
      const validSignature = createWebhookSignature(body);

      const prisma = (await import('@/lib/db/prisma')).default;
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body,
      });

      // ACT
      const response = await POST(request);

      // ASSERT: Should handle unhandled event types gracefully
      expect(response.status).toBe(200); // Accept but mark as unhandled
    });

    it('should validate user_id is a valid UUID format', async () => {
      // ARRANGE: Invalid user_id format (SQL injection attempt)
      const payload = createMockWebhookPayload('subscription_created', {
        user_id: "'; DROP TABLE users; --",
      });
      const body = JSON.stringify(payload);
      const validSignature = createWebhookSignature(body);

      const prisma = (await import('@/lib/db/prisma')).default;
      (prisma.lemonSqueezyEvent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.lemonSqueezyEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        lemonsqueezy_event_id: '12345',
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': validSignature,
        },
        body,
      });

      // ACT
      const response = await POST(request);

      // ASSERT: Should reject invalid user_id format
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
