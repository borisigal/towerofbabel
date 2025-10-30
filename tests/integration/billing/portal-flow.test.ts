/**
 * Integration Tests for Billing Portal Flow
 *
 * Tests end-to-end flow for Lemon Squeezy Customer Portal integration:
 * 1. User clicks "Manage Billing" button
 * 2. API generates portal URL
 * 3. User redirects to Lemon Squeezy
 * 4. User returns to dashboard with success notification
 *
 * Story 3.5 - Task 12
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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

import { POST } from '@/app/api/billing/portal/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { findUserWithBilling } from '@/lib/db/repositories/userRepository';
import { getCustomerPortalUrl } from '@/lib/lemonsqueezy/client';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import { log } from '@/lib/observability/logger';

describe('Billing Portal Flow - Integration Tests', () => {
  const mockUserId = 'user-123';
  const mockCustomerId = 'customer-456';
  const mockPortalUrl = 'https://lemonsqueezy.com/portal/xyz';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Portal Flow - Pro User', () => {
    it('should successfully generate portal URL for Pro user', async () => {
      // Setup - Mock authentication
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId, email: 'pro@example.com' } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // Setup - Mock rate limiting (allowed)
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      // Setup - Mock database query (Pro user with subscription)
      vi.mocked(findUserWithBilling).mockResolvedValue({
        id: mockUserId,
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 50,
        messages_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lemonsqueezy_customer_id: mockCustomerId,
        subscription: {
          id: 'sub-123',
          status: 'active',
          tier: 'pro',
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ends_at: null,
          created_at: new Date(),
        },
      });

      // Setup - Mock Lemon Squeezy API (returns portal URL)
      vi.mocked(getCustomerPortalUrl).mockResolvedValue(mockPortalUrl);

      // Execute - Call API endpoint
      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify - Success response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.portalUrl).toBe(mockPortalUrl);

      // Verify - Correct sequence of operations
      expect(createClient).toHaveBeenCalled();
      expect(checkRateLimit).toHaveBeenCalledWith('192.168.1.100', 10);
      expect(findUserWithBilling).toHaveBeenCalledWith(mockUserId);
      expect(getCustomerPortalUrl).toHaveBeenCalledWith(mockCustomerId);

      // Verify - Logging
      expect(log.info).toHaveBeenCalledWith(
        'Portal URL generated',
        expect.objectContaining({
          userId: mockUserId,
          customerId: mockCustomerId,
          tier: 'pro',
        })
      );
    });
  });

  describe('Complete Portal Flow - PAYG User', () => {
    it('should successfully generate portal URL for PAYG user', async () => {
      // Setup
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId, email: 'payg@example.com' } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(findUserWithBilling).mockResolvedValue({
        id: mockUserId,
        email: 'payg@example.com',
        name: 'PAYG User',
        tier: 'payg',
        messages_used_count: 25,
        messages_reset_date: null,
        lemonsqueezy_customer_id: mockCustomerId,
        subscription: {
          id: 'sub-456',
          status: 'active',
          tier: 'payg',
          renews_at: null,
          ends_at: null,
          created_at: new Date(),
        },
      });

      vi.mocked(getCustomerPortalUrl).mockResolvedValue(mockPortalUrl);

      // Execute
      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.portalUrl).toBe(mockPortalUrl);
      expect(getCustomerPortalUrl).toHaveBeenCalledWith(mockCustomerId);
    });
  });

  describe('Portal Flow Failures', () => {
    it('should fail when trial user attempts to access portal (no customer ID)', async () => {
      // Setup
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId, email: 'trial@example.com' } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      // Trial user with no customer ID
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

      // Execute
      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify - Access denied
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NO_BILLING_INFO');

      // Verify - Lemon Squeezy API NOT called
      expect(getCustomerPortalUrl).not.toHaveBeenCalled();

      // Verify - Warning logged
      expect(log.warn).toHaveBeenCalledWith(
        'Portal access denied - no customer ID',
        expect.objectContaining({
          userId: mockUserId,
          tier: 'trial',
        })
      );
    });

    it('should fail when rate limit exceeded', async () => {
      // Setup
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // Rate limit exceeded
      const resetTime = Math.floor(Date.now() / 1000) + 3600;
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        limit: 10,
        remaining: 0,
        reset: resetTime,
      });

      // Execute
      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify - Rate limited
      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('RATE_LIMITED');

      // Verify - Database query NOT made
      expect(findUserWithBilling).not.toHaveBeenCalled();

      // Verify - Rate limit headers present
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe(resetTime.toString());
    });

    it('should handle Lemon Squeezy API failures gracefully', async () => {
      // Setup
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      vi.mocked(findUserWithBilling).mockResolvedValue({
        id: mockUserId,
        email: 'pro@example.com',
        name: 'Pro User',
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

      // Lemon Squeezy API fails
      vi.mocked(getCustomerPortalUrl).mockRejectedValue(
        new Error('Lemon Squeezy API timeout')
      );

      // Execute
      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify - Error response
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PORTAL_ERROR');

      // Verify - Error logged
      expect(log.error).toHaveBeenCalledWith(
        'Portal URL generation failed',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });
});
