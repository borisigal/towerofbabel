/**
 * Integration Tests for /api/user/usage Endpoint (Story 3.2 - Task 15)
 *
 * Tests full request/response cycle including:
 * - Authentication
 * - Rate limiting
 * - Database query (database-as-source-of-truth)
 * - Tier-specific response data
 * - Error handling
 *
 * Verifies AC#10 from Story 3.2.
 *
 * @see app/api/user/usage/route.ts
 * @see docs/stories/3.2.story.md#task-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/user/usage/route';

// Mock all dependencies
vi.mock('@/lib/auth/supabaseServer', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/middleware/rateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/db/repositories/userRepository', () => ({
  findUserById: vi.fn(),
}));

vi.mock('@/lib/observability/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked modules
import { createClient } from '@/lib/auth/supabaseServer';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import { findUserById } from '@/lib/db/repositories/userRepository';

describe('/api/user/usage GET endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user not authenticated', async () => {
      // Mock authentication failure
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should proceed if user is authenticated', async () => {
      // Mock successful authentication
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      // Mock rate limit allowed
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() / 1000 + 3600,
      });

      // Mock user record
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Mock authentication
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);
    });

    it('should return 429 if rate limit exceeded', async () => {
      // Mock rate limit exceeded
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('RATE_LIMITED');

      // Should have rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should proceed if within rate limit', async () => {
      // Mock rate limit allowed
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() / 1000 + 3600,
      });

      // Mock user record
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Database Query (Database-as-source-of-truth - AC#10)', () => {
    beforeEach(() => {
      // Mock authentication
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      // Mock rate limit allowed
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() / 1000 + 3600,
      });
    });

    it('should query database for user record', async () => {
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      await GET(request);

      // Should call findUserById with correct user ID
      expect(findUserById).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 if user not found in database', async () => {
      vi.mocked(findUserById).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Trial User Response', () => {
    beforeEach(() => {
      // Mock authentication
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      // Mock rate limit allowed
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() / 1000 + 3600,
      });
    });

    it('should return trial user usage with correct limit', async () => {
      const trialStartDate = new Date('2025-01-01');
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Trial User',
        tier: 'trial',
        messages_used_count: 7,
        messages_reset_date: null,
        trial_start_date: trialStartDate,
        is_admin: false,
        created_at: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.tier).toBe('trial');
      expect(data.data.messages_used).toBe(7);
      expect(data.data.messages_limit).toBe(10); // Trial limit
      expect(data.data.trial_end_date).toBeTruthy();
      expect(data.data.reset_date).toBeNull();
    });

    it('should calculate trial_end_date as 14 days from start', async () => {
      const trialStartDate = new Date('2025-01-01T00:00:00Z');
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Trial User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: trialStartDate,
        is_admin: false,
        created_at: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      const data = await response.json();
      const expectedEndDate = new Date('2025-01-15T00:00:00Z');

      expect(new Date(data.data.trial_end_date).toISOString()).toBe(
        expectedEndDate.toISOString()
      );
    });
  });

  describe('Pro User Response', () => {
    beforeEach(() => {
      // Mock authentication
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      // Mock rate limit allowed
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() / 1000 + 3600,
      });
    });

    it('should return pro user usage with correct limit', async () => {
      const resetDate = new Date('2025-02-01');
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 45,
        messages_reset_date: resetDate,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.tier).toBe('pro');
      expect(data.data.messages_used).toBe(45);
      expect(data.data.messages_limit).toBe(100); // Pro limit
      expect(data.data.trial_end_date).toBeNull();
      expect(data.data.reset_date).toBeTruthy();
    });
  });

  describe('PAYG User Response', () => {
    beforeEach(() => {
      // Mock authentication
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      // Mock rate limit allowed
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() / 1000 + 3600,
      });
    });

    it('should return PAYG user usage with null limit', async () => {
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'PAYG User',
        tier: 'payg',
        messages_used_count: 25,
        messages_reset_date: null,
        trial_start_date: null,
        is_admin: false,
        created_at: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.tier).toBe('payg');
      expect(data.data.messages_used).toBe(25);
      expect(data.data.messages_limit).toBeNull(); // No limit for PAYG
      expect(data.data.trial_end_date).toBeNull();
      expect(data.data.reset_date).toBeNull();
    });
  });

  describe('Response Headers', () => {
    beforeEach(() => {
      // Mock authentication
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      // Mock user record
      vi.mocked(findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });
    });

    it('should include rate limit headers in successful response', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() / 1000 + 3600,
      });

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock authentication
      vi.mocked(createClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any);

      // Mock rate limit allowed
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() / 1000 + 3600,
      });
    });

    it('should return 500 if database query fails', async () => {
      vi.mocked(findUserById).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/user/usage');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
