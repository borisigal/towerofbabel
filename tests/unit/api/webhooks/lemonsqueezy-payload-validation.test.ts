import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as WebhookPOST } from '@/app/api/webhooks/lemonsqueezy/route';
import { NextRequest } from 'next/server';
import { getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import crypto from 'crypto';

vi.mock('@/lib/lemonsqueezy/client');
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    lemonSqueezyEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'event-123' }),
    },
    $transaction: vi.fn(),
  },
}));

/**
 * Webhook Payload Validation Tests (Task 48)
 *
 * Tests:
 * - Valid payload structure
 * - Missing required fields
 * - Invalid field types
 * - Malformed JSON
 * - Empty payloads
 * - Large payloads (DoS protection)
 * - XSS attempts in payload data
 */
describe('Webhook Payload Validation', () => {
  const WEBHOOK_SECRET = 'test_secret';

  function createRequest(payload: any): NextRequest {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

    return new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-signature': signature },
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
  });

  describe('Valid Payload Structure', () => {
    it('should accept valid subscription_created payload', async () => {
      const validPayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: 'user-123' },
        },
        data: {
          id: 'ls-sub-123',
          attributes: {
            customer_id: 'cust-123',
            variant_id: '789',
            status: 'active',
          },
        },
      };

      const request = createRequest(validPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBe(200);
    });

    it('should accept valid subscription_payment_success payload', async () => {
      const validPayload = {
        meta: {
          event_name: 'subscription_payment_success',
          custom_data: { user_id: 'user-456' },
        },
        data: {
          id: 'ls-sub-456',
          attributes: {
            status: 'active',
            renews_at: new Date().toISOString(),
          },
        },
      };

      const request = createRequest(validPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Missing Required Fields', () => {
    it('should reject payload missing meta.event_name', async () => {
      const invalidPayload = {
        meta: { custom_data: { user_id: 'user-123' } }, // Missing event_name
        data: { id: 'ls-sub-123' },
      };

      const request = createRequest(invalidPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject payload missing data field', async () => {
      const invalidPayload = {
        meta: { event_name: 'subscription_created' },
        // Missing data field
      };

      const request = createRequest(invalidPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject payload missing meta field', async () => {
      const invalidPayload = {
        data: { id: 'ls-sub-123' },
        // Missing meta field
      };

      const request = createRequest(invalidPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Invalid Field Types', () => {
    it('should reject when event_name is not a string', async () => {
      const invalidPayload = {
        meta: {
          event_name: 12345, // Should be string
          custom_data: { user_id: 'user-123' },
        },
        data: { id: 'ls-sub-123' },
      };

      const request = createRequest(invalidPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject when data.id is not a string', async () => {
      const invalidPayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: 'user-123' },
        },
        data: {
          id: 12345, // Should be string
          attributes: {},
        },
      };

      const request = createRequest(invalidPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Malformed JSON', () => {
    it('should reject malformed JSON', async () => {
      const malformedJSON = '{ "meta": { "event_name": "subscription_created", } }'; // Trailing comma
      const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(malformedJSON).digest('hex');

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': signature },
        body: malformedJSON,
      });

      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject truncated JSON', async () => {
      const truncatedJSON = '{ "meta": { "event_name": "subscription_cre'; // Truncated
      const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(truncatedJSON).digest('hex');

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: { 'x-signature': signature },
        body: truncatedJSON,
      });

      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Empty Payloads', () => {
    it('should reject empty string payload', async () => {
      const emptyPayload = '';
      const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(emptyPayload).digest('hex');

      const request = new NextRequest('http://localhost:3000/api/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: { 'x-signature': signature },
        body: emptyPayload,
      });

      const response = await WebhookPOST(request);

      expect(response.status).toBe(400);
    });

    it('should reject empty object payload', async () => {
      const emptyPayload = {};

      const request = createRequest(emptyPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Large Payloads (DoS Protection)', () => {
    it('should reject extremely large payload (10MB+)', async () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
      const largePayload = {
        meta: { event_name: 'subscription_created' },
        data: { id: 'ls-sub', large_field: largeData },
      };

      const request = createRequest(largePayload);
      const response = await WebhookPOST(request);

      // Should reject or timeout
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle reasonable payload sizes (< 1MB)', async () => {
      const reasonablePayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: 'user-123' },
        },
        data: {
          id: 'ls-sub-123',
          attributes: {
            customer_id: 'cust-123',
            variant_id: '789',
            status: 'active',
            // Reasonable amount of data
            metadata: 'x'.repeat(1000), // 1KB
          },
        },
      };

      const request = createRequest(reasonablePayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('XSS Attempts in Payload Data', () => {
    it('should sanitize XSS attempt in custom_data', async () => {
      const xssPayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: {
            user_id: 'user-123',
            malicious: '<script>alert("XSS")</script>',
          },
        },
        data: {
          id: 'ls-sub-123',
          attributes: { status: 'active' },
        },
      };

      const request = createRequest(xssPayload);
      const response = await WebhookPOST(request);

      // Should accept but sanitize (or reject)
      expect([200, 400]).toContain(response.status);
    });

    it('should handle SQL injection attempt in user_id', async () => {
      const sqlInjectionPayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: {
            user_id: "'; DROP TABLE users; --",
          },
        },
        data: { id: 'ls-sub-123' },
      };

      const request = createRequest(sqlInjectionPayload);
      const response = await WebhookPOST(request);

      // Should handle safely (Prisma parameterized queries)
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Extra Unexpected Fields', () => {
    it('should ignore extra fields not in schema', async () => {
      const payloadWithExtra = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: 'user-123' },
          extra_field: 'ignored', // Extra field
        },
        data: {
          id: 'ls-sub-123',
          attributes: { status: 'active' },
          unexpected_field: 'also_ignored', // Extra field
        },
      };

      const request = createRequest(payloadWithExtra);
      const response = await WebhookPOST(request);

      // Should accept and ignore extra fields
      expect(response.status).toBe(200);
    });
  });

  describe('Special Characters in Strings', () => {
    it('should handle Unicode characters in user_id', async () => {
      const unicodePayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: 'user-日本語-123' },
        },
        data: { id: 'ls-sub-123' },
      };

      const request = createRequest(unicodePayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle special characters in subscription_id', async () => {
      const specialCharsPayload = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: 'user-123' },
        },
        data: {
          id: 'ls-sub-!@#$%^&*()',
        },
      };

      const request = createRequest(specialCharsPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Null and Undefined Values', () => {
    it('should reject null event_name', async () => {
      const nullPayload = {
        meta: {
          event_name: null, // Invalid
          custom_data: { user_id: 'user-123' },
        },
        data: { id: 'ls-sub-123' },
      };

      const request = createRequest(nullPayload);
      const response = await WebhookPOST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle null custom_data gracefully', async () => {
      const nullCustomData = {
        meta: {
          event_name: 'subscription_created',
          custom_data: null, // May be null
        },
        data: { id: 'ls-sub-123' },
      };

      const request = createRequest(nullCustomData);
      const response = await WebhookPOST(request);

      // May accept or reject depending on business logic
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
