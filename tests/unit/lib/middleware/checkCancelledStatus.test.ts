/**
 * CRITICAL Security Tests for Cancelled User Access Control
 *
 * Tests the checkCancelledStatus middleware that BLOCKS cancelled users from dashboard access.
 * This is FINANCIALLY SENSITIVE - cancelled users must not have ANY access to paid features.
 *
 * Story 3.5 - Task 13 (CRITICAL SECURITY)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkCancelledStatus } from '@/lib/middleware/checkCancelledStatus';

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
  findUserById: vi.fn(),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  log: {
    warn: vi.fn(),
  },
}));

import { createClient } from '@/lib/auth/supabaseServer';
import { findUserById } from '@/lib/db/repositories/userRepository';
import { redirect } from 'next/navigation';
import { log } from '@/lib/observability/logger';

describe('checkCancelledStatus - CRITICAL Security Tests', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CRITICAL: Cancelled User Access Control', () => {
    it('should BLOCK cancelled users and redirect to subscription-required', async () => {
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

      // Mock database query - CANCELLED user
      vi.mocked(findUserById).mockResolvedValue({
        id: mockUserId,
        email: 'cancelled@example.com',
        name: 'Cancelled User',
        tier: 'cancelled', // CRITICAL: This user should be BLOCKED
        messages_used_count: 0,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      // Execute - should throw redirect error
      await expect(checkCancelledStatus()).rejects.toThrow('REDIRECT:/subscription-required');

      // Verify redirect was called
      expect(redirect).toHaveBeenCalledWith('/subscription-required');

      // Verify security audit log
      expect(log.warn).toHaveBeenCalledWith(
        'Cancelled user attempted dashboard access',
        expect.objectContaining({
          userId: mockUserId,
          tier: 'cancelled',
          security: 'access_denied',
        })
      );
    });

    it('should BLOCK cancelled users even if they have valid auth token', async () => {
      // CRITICAL: JWT might still be valid, but database says cancelled
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: mockUserId,
                app_metadata: { tier: 'pro' }, // JWT says "pro" (stale data)
              },
            },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // Database-as-source-of-truth: tier is 'cancelled'
      vi.mocked(findUserById).mockResolvedValue({
        id: mockUserId,
        email: 'cancelled@example.com',
        name: 'Cancelled User',
        tier: 'cancelled', // Database says CANCELLED
        messages_used_count: 0,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      // Execute - should BLOCK based on database, not JWT
      await expect(checkCancelledStatus()).rejects.toThrow('REDIRECT:/subscription-required');

      expect(redirect).toHaveBeenCalledWith('/subscription-required');
      expect(log.warn).toHaveBeenCalled();
    });
  });

  describe('ALLOW: Valid Users', () => {
    it('should ALLOW trial users', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      vi.mocked(findUserById).mockResolvedValue({
        id: mockUserId,
        email: 'trial@example.com',
        name: 'Trial User',
        tier: 'trial', // Valid tier
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      // Execute - should NOT redirect
      await expect(checkCancelledStatus()).resolves.toBeUndefined();

      // Verify NO redirect
      expect(redirect).not.toHaveBeenCalled();
      expect(log.warn).not.toHaveBeenCalled();
    });

    it('should ALLOW payg users', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      vi.mocked(findUserById).mockResolvedValue({
        id: mockUserId,
        email: 'payg@example.com',
        name: 'PAYG User',
        tier: 'payg', // Valid tier
        messages_used_count: 50,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      await expect(checkCancelledStatus()).resolves.toBeUndefined();

      expect(redirect).not.toHaveBeenCalled();
      expect(log.warn).not.toHaveBeenCalled();
    });

    it('should ALLOW pro users', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      vi.mocked(findUserById).mockResolvedValue({
        id: mockUserId,
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro', // Valid tier
        messages_used_count: 75,
        messages_reset_date: new Date(),
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      await expect(checkCancelledStatus()).resolves.toBeUndefined();

      expect(redirect).not.toHaveBeenCalled();
      expect(log.warn).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should redirect to sign-in when not authenticated', async () => {
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

      await expect(checkCancelledStatus()).rejects.toThrow('REDIRECT:/sign-in');

      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });

    it('should redirect to sign-in when user not found in database', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      // User exists in auth but not in database
      vi.mocked(findUserById).mockResolvedValue(null);

      await expect(checkCancelledStatus()).rejects.toThrow('REDIRECT:/sign-in');

      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('Security Audit Logging', () => {
    it('should log all cancelled user access attempts with security context', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: mockUserId } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      vi.mocked(findUserById).mockResolvedValue({
        id: mockUserId,
        email: 'cancelled@example.com',
        name: 'Cancelled User',
        tier: 'cancelled',
        messages_used_count: 0,
        messages_reset_date: null,
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      await expect(checkCancelledStatus()).rejects.toThrow('REDIRECT:/subscription-required');

      // Verify security audit log contains all required fields
      expect(log.warn).toHaveBeenCalledWith(
        'Cancelled user attempted dashboard access',
        expect.objectContaining({
          userId: mockUserId,
          tier: 'cancelled',
          security: 'access_denied',
          timestamp: expect.any(String),
        })
      );
    });
  });
});
