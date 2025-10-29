/**
 * Integration Tests for /api/checkout/pro Endpoint
 *
 * Tests the Pro subscription checkout flow including:
 * - Authentication
 * - Lemon Squeezy checkout session creation
 * - Response format validation
 * - Error handling
 *
 * Story 3.4 - Task 19
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/checkout/pro/route';

// Mock all dependencies
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

describe('POST /api/checkout/pro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // ARRANGE: Mock auth to return no user
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT: Call the route handler
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Should return 401
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should proceed with checkout for authenticated users', async () => {
      // ARRANGE: Mock auth to return valid user
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
      };

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      // Mock Prisma user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: 'Test User',
      });

      // Mock Lemon Squeezy config
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '345678',
        isTestMode: true,
      });

      // Mock successful checkout creation
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-123',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/checkout-123',
              status: 'draft',
            },
          },
        },
        error: null,
      });

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT: Call the route handler
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Should return 200 with checkout URL
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.checkoutUrl).toBeDefined();
      expect(data.checkoutUrl).toContain('checkout.lemonsqueezy.com');
    });
  });

  describe('Checkout Session Creation', () => {
    beforeEach(() => {
      // Setup common mocks for authenticated user
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
      };

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: 'Test User',
      });
    });

    it('should create checkout session with correct configuration', async () => {
      // ARRANGE: Mock Lemon Squeezy config
      const mockConfig = {
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '345678',
        isTestMode: true,
      };
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue(mockConfig);

      // Mock successful checkout creation
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-123',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/checkout-123',
              status: 'draft',
            },
          },
        },
        error: null,
      });

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT: Call the route handler
      const response = await POST(request);

      // ASSERT: Verify createCheckout was called with correct parameters
      expect(createCheckout).toHaveBeenCalledWith(
        mockConfig.storeId,
        mockConfig.proVariantId,
        expect.objectContaining({
          checkoutData: expect.objectContaining({
            email: 'test@example.com',
            custom: expect.objectContaining({
              user_id: 'test-user-123',
            }),
          }),
          testMode: true,
        })
      );

      expect(response.status).toBe(200);
    });

    it('should return checkout URL in response', async () => {
      // ARRANGE: Mock config
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '345678',
        isTestMode: true,
      });

      const mockCheckoutUrl = 'https://checkout.lemonsqueezy.com/buy/abc123';
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-123',
            attributes: {
              url: mockCheckoutUrl,
              status: 'draft',
            },
          },
        },
        error: null,
      });

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT: Call the route handler
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Response should include checkout URL
      expect(data.success).toBe(true);
      expect(data.checkoutUrl).toBe(mockCheckoutUrl);
      expect(data.checkoutUrl).toMatch(/^https:\/\/checkout\.lemonsqueezy\.com/);
    });

    it('should include Pro variant ID in checkout', async () => {
      // ARRANGE: Mock config with specific variant ID
      const mockConfig = {
        storeId: '123456',
        proVariantId: '999888',  // Specific Pro variant ID
        paygVariantId: '345678',
        isTestMode: true,
      };
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue(mockConfig);

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-123',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/checkout-123',
              status: 'draft',
            },
          },
        },
        error: null,
      });

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT: Call the route handler
      await POST(request);

      // ASSERT: Verify Pro variant ID was passed to createCheckout
      expect(createCheckout).toHaveBeenCalledWith(
        mockConfig.storeId,
        '999888',  // Pro variant ID
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Setup common mocks for authenticated user
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
      };

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseClient);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: 'Test User',
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '345678',
        isTestMode: true,
      });
    });

    it('should handle Lemon Squeezy API errors gracefully', async () => {
      // ARRANGE: Mock Lemon Squeezy error
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid store configuration',
          status: 422,
        },
      });

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT: Call the route handler
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Should return 500 with error details
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CHECKOUT_CREATION_FAILED');
      expect(data.error.message).toContain('checkout');
    });

    it('should handle user not found error', async () => {
      // ARRANGE: Mock Prisma to return no user
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT: Call the route handler
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Should return 404
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle missing configuration gracefully', async () => {
      // ARRANGE: Mock missing Lemon Squeezy configuration
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: null,  // Missing store ID
        proVariantId: null,  // Missing variant ID
        paygVariantId: null,
        isTestMode: true,
      });

      // Mock Lemon Squeezy error for invalid configuration
      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid store configuration',
          status: 422,
        },
      });

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/checkout/pro', {
        method: 'POST',
      });

      // ACT: Call the route handler
      const response = await POST(request);
      const data = await response.json();

      // ASSERT: Should return 500 with configuration error
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFIGURATION_ERROR');
    });
  });
});
