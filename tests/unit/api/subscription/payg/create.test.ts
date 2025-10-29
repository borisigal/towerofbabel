/**
 * Unit Tests for PAYG Subscription Endpoint
 *
 * Tests /api/subscription/payg/create endpoint including:
 * - Authentication checks
 * - Duplicate subscription prevention
 * - Lemon Squeezy API interaction
 * - Error handling
 *
 * Task 27 - Story 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/subscription/payg/create/route';

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

describe('POST /api/subscription/payg/create', () => {
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

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should proceed with subscription creation for authenticated users', async () => {
      // ARRANGE
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
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '345678',
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

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUser.id,
        tier: 'payg',
      });

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Duplicate Subscription Prevention', () => {
    beforeEach(() => {
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
    });

    it('should return 400 if user already has active PAYG subscription', async () => {
      // ARRANGE: User has existing active PAYG subscription
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
        subscription: {
          lemonsqueezy_subscription_id: 'existing-sub-123',
          status: 'active',
          tier: 'payg',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_SUBSCRIPTION');
      expect(data.error.message).toContain('already has active PAYG subscription');
    });

    it('should allow PAYG subscription if user has cancelled subscription', async () => {
      // ARRANGE: User has cancelled PAYG subscription
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
        subscription: {
          lemonsqueezy_subscription_id: 'cancelled-sub-123',
          status: 'cancelled',
          tier: 'payg',
        },
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '345678',
        isTestMode: true,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-456',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/checkout-456',
            },
          },
        },
        error: null,
      });

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-user-123',
        tier: 'payg',
      });

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow PAYG subscription if user has no subscription', async () => {
      // ARRANGE: User has no subscription
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
        subscription: null,
      });

      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '345678',
        isTestMode: true,
      });

      (createCheckout as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'checkout-789',
            attributes: {
              url: 'https://checkout.lemonsqueezy.com/checkout-789',
            },
          },
        },
        error: null,
      });

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-user-123',
        tier: 'payg',
      });

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);

      // ASSERT
      expect(response.status).toBe(200);
    });
  });

  describe('Lemon Squeezy Integration', () => {
    beforeEach(() => {
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
        subscription: null,
      });
    });

    it('should create checkout with correct PAYG variant ID', async () => {
      // ARRANGE
      const mockConfig = {
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '999888', // Specific PAYG variant ID
        isTestMode: true,
      };
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue(mockConfig);

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

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-user-123',
        tier: 'payg',
      });

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      await POST(request);

      // ASSERT: Verify PAYG variant ID was used
      expect(createCheckout).toHaveBeenCalledWith(
        mockConfig.storeId,
        '999888', // PAYG variant ID
        expect.any(Object)
      );
    });

    it('should update user tier to payg immediately', async () => {
      // ARRANGE
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: '123456',
        proVariantId: '789012',
        paygVariantId: '345678',
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

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'test-user-123',
        tier: 'payg',
      });

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      await POST(request);

      // ASSERT
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-123' },
        data: {
          tier: 'payg',
          lemonsqueezy_customer_id: undefined,
        },
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
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
        subscription: null,
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
          message: 'Invalid variant configuration',
          status: 422,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SUBSCRIPTION_CREATION_FAILED');
    });

    it('should handle user not found error', async () => {
      // ARRANGE
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle database update failures', async () => {
      // ARRANGE
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

      // Mock database error
      (prisma.user.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
        method: 'POST',
      });

      // ACT
      const response = await POST(request);
      const data = await response.json();

      // ASSERT
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should handle configuration errors', async () => {
      // ARRANGE: Mock missing configuration
      (getLemonSqueezyConfig as ReturnType<typeof vi.fn>).mockReturnValue({
        storeId: null,
        proVariantId: null,
        paygVariantId: null,
        isTestMode: true,
      });

      const request = new NextRequest('http://localhost:3000/api/subscription/payg/create', {
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
  });
});
