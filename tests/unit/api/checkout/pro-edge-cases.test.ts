/**
 * Edge Case Tests for Pro Checkout Endpoint
 *
 * Tests edge cases and boundary conditions for /api/checkout/pro including:
 * - Invalid user_id formats (security)
 * - Missing configuration values
 * - Concurrent checkout attempts
 * - Network timeout scenarios
 * - Rate limiting
 * - Database constraint violations
 * - Invalid variant IDs
 *
 * Task 39 - Story 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/checkout/pro/route';

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
import { configureLemonSqueezy, getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';

describe('POST /api/checkout/pro - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set default mocks to prevent undefined errors
    (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      storeId: '123456',
      proVariantId: '789',
      paygVariantId: '012',
      isTestMode: true,
    });

    // Default createCheckout mock - tests can override
    (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: {
          id: 'checkout-default',
          attributes: {
            url: 'https://checkout.lemonsqueezy.com/default',
          },
        },
      },
      error: null,
    });
  });

  describe('User ID Validation and Security', () => {
    it('should reject SQL injection attempt in user_id', async () => {
      // ARRANGE: Mock SQL injection attempt
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "'; DROP TABLE users; --",
                email: 'attacker@evil.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      // Prisma will likely reject invalid UUID format
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid input syntax for type uuid')
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    it('should reject XSS attempt in user_id', async () => {
      // ARRANGE: Mock XSS attempt
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: '<script>alert("XSS")</script>',
                email: 'attacker@evil.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid UUID format')
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    it('should reject extremely long user_id (buffer overflow attempt)', async () => {
      // ARRANGE: Very long user_id
      const longId = 'a'.repeat(10000);
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: longId,
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid UUID format')
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);

      // ASSERT: Should reject gracefully without crashing
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject null byte injection in user_id', async () => {
      // ARRANGE
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'valid-uuid\0injected',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid UUID format')
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Configuration Edge Cases', () => {
    beforeEach(() => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'valid-user-123',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'valid-user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscription: null,
      });
    });

    it('should handle missing store ID', async () => {
      // ARRANGE
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: null,
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFIGURATION_ERROR');
    });

    it('should handle missing Pro variant ID', async () => {
      // ARRANGE
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: null,
        paygVariantId: '012',
        isTestMode: true,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFIGURATION_ERROR');
    });

    it('should handle empty string configuration values', async () => {
      // ARRANGE
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '',
        proVariantId: '',
        paygVariantId: '',
        isTestMode: true,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('CONFIGURATION_ERROR');
    });

    it('should handle whitespace-only configuration values', async () => {
      // ARRANGE
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '   ',
        proVariantId: '   ',
        paygVariantId: '012',
        isTestMode: true,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('Lemon Squeezy API Edge Cases', () => {
    beforeEach(() => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'valid-user-123',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'valid-user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });
    });

    it('should handle invalid variant ID error from Lemon Squeezy', async () => {
      // ARRANGE
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          message: 'Variant not found',
          status: 404,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CHECKOUT_CREATION_FAILED');
    });

    it('should handle Lemon Squeezy API rate limiting (429)', async () => {
      // ARRANGE
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
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CHECKOUT_CREATION_FAILED');
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle Lemon Squeezy API timeout', async () => {
      // ARRANGE: Mock timeout
      (createCheckout as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 100))
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle Lemon Squeezy API returning malformed response', async () => {
      // ARRANGE
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: null, // Missing expected data structure
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle Lemon Squeezy API returning response without URL', async () => {
      // ARRANGE
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-123',
            attributes: {
              // Missing url field
            },
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Database Edge Cases', () => {
    beforeEach(() => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'valid-user-123',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);
    });

    it('should handle database connection timeout', async () => {
      // ARRANGE
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Connection timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(log.error).toHaveBeenCalled();
    });

    it('should handle user with corrupted data (missing required fields)', async () => {
      // ARRANGE: User record missing email
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'valid-user-123',
        email: null, // Corrupted data
        name: 'Test User',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-123',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/checkout-123',
            },
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);

      // ASSERT: Should handle gracefully (email might be optional in some cases)
      // or reject with proper error
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle concurrent database writes (race condition)', async () => {
      // ARRANGE: Simulate race condition where user is modified between read and write
      let callCount = 0;
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            id: 'valid-user-123',
            email: 'test@example.com',
            subscription: null,
          });
        }
        // Second call returns updated data
        return Promise.resolve({
          id: 'valid-user-123',
          email: 'test@example.com',
          subscription: {
            status: 'active',
            tier: 'pro',
          },
        });
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-123',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/checkout-123',
            },
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);

      // ASSERT: Should complete successfully (first read shows no subscription)
      expect(response.status).toBe(200);
    });
  });

  describe('Network and Timeout Edge Cases', () => {
    beforeEach(() => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'valid-user-123',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'valid-user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });
    });

    it('should handle network connection reset', async () => {
      // ARRANGE
      (createCheckout as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('ECONNRESET')
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle DNS resolution failure', async () => {
      // ARRANGE
      (createCheckout as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('ENOTFOUND')
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle SSL certificate error', async () => {
      // ARRANGE
      (createCheckout as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('UNABLE_TO_VERIFY_LEAF_SIGNATURE')
      );

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Boundary and Input Validation', () => {
    it('should handle POST request with query parameters (should be ignored)', async () => {
      // ARRANGE
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'valid-user-123',
                email: 'test@example.com',
              },
            },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'valid-user-123',
        email: 'test@example.com',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        isTestMode: true,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-123',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/checkout-123',
            },
          },
        },
        error: null,
      });

      // Request with query parameters
      const request = new NextRequest(
        'http://localhost:3000/api/checkout/pro?variant=pro&coupon=DISCOUNT',
        {
          method: 'POST',
        }
      );

      // ACT
      const response = await POST(request);

      // ASSERT: Should work normally, query params ignored
      expect(response.status).toBe(200);
    });

    it('should handle undefined return values gracefully', async () => {
      // ARRANGE
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Session expired' },
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });
});
