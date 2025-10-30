/**
 * Integration Tests for Usage Reporting to Lemon Squeezy
 *
 * Tests the PAYG usage reporting functionality including:
 * - Reports usage for PAYG users only
 * - Idempotency (prevents double-charging with same interpretation_id)
 * - Non-blocking behavior (interpretation succeeds even if reporting fails)
 * - No reporting for Pro or trial users
 *
 * Story 3.4 - Task 21
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportInterpretationUsage } from '@/lib/lemonsqueezy/usageReporting';

// Mock all dependencies
vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  createUsageRecord: vi.fn(),
}));

vi.mock('@/lib/lemonsqueezy/client', () => ({
  configureLemonSqueezy: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    interpretation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

vi.mock('@/lib/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { createUsageRecord } from '@lemonsqueezy/lemonsqueezy.js';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy/client';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';

describe('Usage Reporting to Lemon Squeezy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PAYG User Usage Reporting', () => {
    it('should report usage to Lemon Squeezy for PAYG user', async () => {
      // ARRANGE: Create PAYG user with subscription_item_id
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',  // Required for usage reporting
        },
      };

      const interpretationId = 'interp-abc123';

      // Mock interpretation lookup (usage not yet reported)
      (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        user_id: mockUser.id,
        usage_reported: false,
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // Mock interpretation update (marking as reported)
      (prisma.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        usage_reported: true,
      });

      // Mock successful usage record creation
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'usage-record-123',
            attributes: {
              subscription_item_id: 999888,
              quantity: 1,
              action: 'increment',
            },
          },
        },
        error: null,
      });

      // ACT: Report usage for interpretation
      const result = await reportInterpretationUsage(mockUser.id, interpretationId);

      // ASSERT: Should report usage successfully
      expect(result).toBe(true);
      expect(configureLemonSqueezy).toHaveBeenCalled();
      expect(createUsageRecord).toHaveBeenCalledWith({
        subscriptionItemId: '999888',
        quantity: 1,
        action: 'increment',
      });
      // Idempotency is handled by marking interpretation.usage_reported = true
      expect(prisma.interpretation.update).toHaveBeenCalledWith({
        where: { id: interpretationId },
        data: { usage_reported: true },
      });
    });

    it('should use interpretation_id as idempotency key', async () => {
      // ARRANGE: Setup PAYG user
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',
        },
      };

      const interpretationId = 'interp-unique-id-xyz';

      // Mock interpretation lookup (usage not yet reported)
      (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        user_id: mockUser.id,
        usage_reported: false,
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // Mock interpretation update (marking as reported)
      (prisma.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        usage_reported: true,
      });

      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: { id: 'usage-123' } },
        error: null,
      });

      // ACT: Report usage with specific interpretation ID
      await reportInterpretationUsage(mockUser.id, interpretationId);

      // ASSERT: Idempotency is handled by marking interpretation.usage_reported = true
      expect(prisma.interpretation.update).toHaveBeenCalledWith({
        where: { id: interpretationId },
        data: { usage_reported: true },
      });
    });

    it('should prevent double-charging with duplicate interpretation_id', async () => {
      // ARRANGE: Setup PAYG user
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',
        },
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // First call succeeds
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: { id: 'usage-123' } },
        error: null,
      });

      // Second call with same interpretation_id returns error (idempotency check)
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Idempotency key already used',
          status: 422,
        },
      });

      // ACT: Report usage twice with same interpretation ID
      const interpretationId = 'interp-duplicate-test';
      const result1 = await reportInterpretationUsage(mockUser.id, interpretationId);
      const result2 = await reportInterpretationUsage(mockUser.id, interpretationId);

      // ASSERT: First call succeeds, second call prevented by idempotency
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(createUsageRecord).toHaveBeenCalledTimes(2);
    });
  });

  describe('Non-PAYG Users', () => {
    it('should NOT report usage for trial users', async () => {
      // ARRANGE: Create trial user
      const mockUser = {
        id: 'trial-user-123',
        email: 'trial@example.com',
        tier: 'trial',
        subscription: null,  // No subscription for trial users
      };

      const interpretationId = 'interp-123';

      // Mock interpretation lookup (usage not yet reported)
      (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        user_id: mockUser.id,
        usage_reported: false,
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // Mock interpretation update (marking as reported even though not PAYG)
      (prisma.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        usage_reported: true,
      });

      // ACT: Try to report usage for trial user
      const result = await reportInterpretationUsage(mockUser.id, interpretationId);

      // ASSERT: Should not call Lemon Squeezy API but returns true (non-PAYG users don't report)
      expect(result).toBe(true);
      expect(createUsageRecord).not.toHaveBeenCalled();
      // Non-PAYG users skip reporting but mark as reported to prevent retries
      expect(prisma.interpretation.update).toHaveBeenCalled();
    });

    it('should NOT report usage for Pro users', async () => {
      // ARRANGE: Create Pro user
      const mockUser = {
        id: 'pro-user-123',
        email: 'pro@example.com',
        tier: 'pro',
        subscription: {
          id: 'sub-123',
          tier: 'pro',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',
        },
      };

      const interpretationId = 'interp-123';

      // Mock interpretation lookup (usage not yet reported)
      (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        user_id: mockUser.id,
        usage_reported: false,
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // Mock interpretation update (marking as reported even though not PAYG)
      (prisma.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        usage_reported: true,
      });

      // ACT: Try to report usage for Pro user
      const result = await reportInterpretationUsage(mockUser.id, interpretationId);

      // ASSERT: Should not call Lemon Squeezy API but returns true (non-PAYG users don't report)
      expect(result).toBe(true);
      expect(createUsageRecord).not.toHaveBeenCalled();
      // Non-PAYG users skip reporting but mark as reported to prevent retries
      expect(prisma.interpretation.update).toHaveBeenCalled();
    });
  });

  describe('Non-Blocking Behavior', () => {
    it('should return false but not throw if Lemon Squeezy API fails', async () => {
      // ARRANGE: Setup PAYG user
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',
        },
      };

      const interpretationId = 'interp-123';

      // Mock interpretation lookup (usage not yet reported)
      (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        user_id: mockUser.id,
        usage_reported: false,
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // Mock Lemon Squeezy API failure
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          message: 'API rate limit exceeded',
          status: 429,
        },
      });

      // ACT: Try to report usage when API is failing
      const result = await reportInterpretationUsage(mockUser.id, interpretationId);

      // ASSERT: Should return false but NOT throw exception
      expect(result).toBe(false);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Usage reporting failed'),
        expect.any(Object)
      );

      // Interpretation should still succeed (non-blocking)
    });

    it('should handle network errors gracefully', async () => {
      // ARRANGE: Setup PAYG user
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',
        },
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // Mock network error
      (createUsageRecord as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network timeout')
      );

      // ACT: Try to report usage when network fails
      const result = await reportInterpretationUsage(mockUser.id, 'interp-123');

      // ASSERT: Should handle error gracefully
      expect(result).toBe(false);
      expect(log.error).toHaveBeenCalled();

      // Interpretation should still succeed (non-blocking)
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing subscription_item_id', async () => {
      // ARRANGE: PAYG user WITHOUT subscription_item_id (data migration issue)
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: null,  // Missing!
        },
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // ACT: Try to report usage
      const result = await reportInterpretationUsage(mockUser.id, 'interp-123');

      // ASSERT: Should log error but not crash
      expect(result).toBe(false);
      expect(createUsageRecord).not.toHaveBeenCalled();
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('subscription_item_id'),
        expect.any(Object)
      );
    });

    it('should handle user not found', async () => {
      // ARRANGE: User doesn't exist in database
      const interpretationId = 'interp-123';

      // Mock interpretation lookup (usage not yet reported)
      (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        user_id: 'nonexistent-user',
        usage_reported: false,
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Mock interpretation update (marking as reported even though user not found)
      (prisma.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        usage_reported: true,
      });

      // ACT: Try to report usage
      const result = await reportInterpretationUsage('nonexistent-user', interpretationId);

      // ASSERT: Should return true and mark as reported (non-PAYG users don't report)
      expect(result).toBe(true);
      expect(createUsageRecord).not.toHaveBeenCalled();
      expect(prisma.interpretation.update).toHaveBeenCalled();
    });

    it('should handle inactive PAYG subscription', async () => {
      // ARRANGE: PAYG user with cancelled subscription
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'cancelled',  // Subscription cancelled
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',
        },
      };

      const interpretationId = 'interp-123';

      // Mock interpretation lookup (usage not yet reported)
      (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        user_id: mockUser.id,
        usage_reported: false,
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      // Mock interpretation update (marking as reported to prevent retries)
      (prisma.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        usage_reported: true,
      });

      // ACT: Try to report usage for cancelled subscription
      const result = await reportInterpretationUsage(mockUser.id, interpretationId);

      // ASSERT: Should not report usage for cancelled subscription
      expect(result).toBe(false);
      expect(createUsageRecord).not.toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalledWith(
        expect.stringContaining('has no active subscription'),
        expect.any(Object)
      );
    });
  });

  describe('Logging', () => {
    it('should log successful usage reporting', async () => {
      // ARRANGE: Setup PAYG user
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',
        },
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: { id: 'usage-123' } },
        error: null,
      });

      // ACT: Report usage
      await reportInterpretationUsage(mockUser.id, 'interp-123');

      // ASSERT: Should log success
      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining('Usage reported to Lemon Squeezy'),
        expect.objectContaining({
          userId: mockUser.id,
          interpretationId: 'interp-123',
        })
      );
    });

    it('should log errors with context', async () => {
      // ARRANGE: Setup PAYG user
      const mockUser = {
        id: 'payg-user-123',
        email: 'payg@example.com',
        tier: 'payg',
        subscription: {
          id: 'sub-123',
          tier: 'payg',
          status: 'active',
          lemonsqueezy_subscription_id: '789012',
          lemonsqueezy_subscription_item_id: '999888',
        },
      };

      const interpretationId = 'interp-123';

      // Mock interpretation lookup (usage not yet reported)
      (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: interpretationId,
        user_id: mockUser.id,
        usage_reported: false,
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (createUsageRecord as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );

      // ACT: Report usage
      await reportInterpretationUsage(mockUser.id, interpretationId);

      // ASSERT: Should log error with context
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Usage reporting exception'),
        expect.objectContaining({
          userId: mockUser.id,
          interpretationId,
          error: expect.any(Error),
        })
      );
    });
  });
});
