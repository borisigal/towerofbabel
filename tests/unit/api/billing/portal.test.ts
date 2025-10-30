/**
 * Unit Tests for Billing Portal API Endpoint
 *
 * Tests POST /api/billing/portal endpoint that generates Lemon Squeezy Customer Portal URLs.
 * Validates authentication, authorization, rate limiting, and error handling.
 *
 * Story 3.5 - Task 11
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/billing/portal/route';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@/lib/auth/supabaseServer', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

// Mock database repositories
vi.mock('@/lib/db/repositories/userRepository', () => ({
  findUserWithBilling: vi.fn(),
}));

// Mock Lemon Squeezy client
vi.mock('@/lib/lemonsqueezy/client', () => ({
  getCustomerPortalUrl: vi.fn(),
}));

// Mock rate limiting
vi.mock('@/lib/middleware/rateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { createClient } from '@/lib/auth/supabaseServer';
import { findUserWithBilling } from '@/lib/db/repositories/userRepository';
import { getCustomerPortalUrl } from '@/lib/lemonsqueezy/client';
import { checkRateLimit } from '@/lib/middleware/rateLimit';

describe('POST /api/billing/portal', () => {
  const mockUserId = 'user-123';
  const mockCustomerId = 'customer-456';
  const mockPortalUrl = 'https://lemonsqueezy.com/portal/xyz';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should return portal URL for authenticated user with customer ID', async () => {
      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // Mock rate limiting (allowed)
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      // Mock database query
      vi.mocked(findUserWithBilling).mockResolvedValue({
        id: mockUserId,
        email: 'user@example.com',
        name: 'Test User',
        tier: 'pro',
        messages_used_count: 50,
        messages_reset_date: new Date(),
        lemonsqueezy_customer_id: mockCustomerId,
        subscription: {
          id: 'sub-123',
          status: 'active',
          tier: 'pro',
          renews_at: new Date(),
          ends_at: null,
          created_at: new Date(),
        },
      });

      // Mock Lemon Squeezy API
      vi.mocked(getCustomerPortalUrl).mockResolvedValue(mockPortalUrl);

      // Create request
      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      // Execute
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.portalUrl).toBe(mockPortalUrl);
      expect(getCustomerPortalUrl).toHaveBeenCalledWith(mockCustomerId);
    });
  });

  describe('Authentication Failures', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Mock authentication failure
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // Mock rate limiting (exceeded)
      const resetTime = Math.floor(Date.now() / 1000) + 3600;
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        limit: 10,
        remaining: 0,
        reset: resetTime,
      });

      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('RATE_LIMITED');

      // Check rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe(resetTime.toString());
    });
  });

  describe('Authorization Failures', () => {
    it('should return 404 when user not found in database', async () => {
      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // Mock rate limiting (allowed)
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      // Mock database query - user not found
      vi.mocked(findUserWithBilling).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 403 when user has no customer ID (trial user)', async () => {
      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // Mock rate limiting (allowed)
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      // Mock database query - trial user with no customer ID
      vi.mocked(findUserWithBilling).mockResolvedValue({
        id: mockUserId,
        email: 'trial@example.com',
        name: 'Trial User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        lemonsqueezy_customer_id: null, // No customer ID
        subscription: null,
      });

      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NO_BILLING_INFO');
      expect(data.error.message).toContain('No billing information yet');
    });
  });

  describe('Lemon Squeezy API Failures', () => {
    it('should return 500 when Lemon Squeezy API fails', async () => {
      // Mock authentication
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // Mock rate limiting (allowed)
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      // Mock database query
      vi.mocked(findUserWithBilling).mockResolvedValue({
        id: mockUserId,
        email: 'user@example.com',
        name: 'Test User',
        tier: 'pro',
        messages_used_count: 50,
        messages_reset_date: new Date(),
        lemonsqueezy_customer_id: mockCustomerId,
        subscription: {
          id: 'sub-123',
          status: 'active',
          tier: 'pro',
          renews_at: new Date(),
          ends_at: null,
          created_at: new Date(),
        },
      });

      // Mock Lemon Squeezy API failure
      vi.mocked(getCustomerPortalUrl).mockRejectedValue(
        new Error('Lemon Squeezy API error')
      );

      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PORTAL_ERROR');
    });
  });
});
