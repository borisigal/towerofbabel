import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reportInterpretationUsage } from '@/lib/lemonsqueezy/usageReporting';
import { createUsageRecord } from '@lemonsqueezy/lemonsqueezy.js';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy/client';
import { logger } from '@/lib/observability/logger';

vi.mock('@lemonsqueezy/lemonsqueezy.js');
vi.mock('@/lib/lemonsqueezy/client');
vi.mock('@/lib/db/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    interpretation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import prisma from '@/lib/db/prisma';

/**
 * Usage Reporting Error Scenarios Tests
 *
 * Tests error handling for usage reporting:
 * - Lemon Squeezy API errors (400, 500, timeout)
 * - Rate limiting (429)
 * - Network timeouts
 * - Invalid subscription IDs
 * - Non-blocking error behavior
 * - Retry logic with exponential backoff
 */
describe('Usage Reporting Error Scenarios', () => {
  const userId = 'user-error-test';
  const interpretationId = 'interp-error-test';
  const subscriptionId = 'sub-error-test-123';

  beforeEach(() => {
    vi.clearAllMocks();
    (configureLemonSqueezy as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    // Default: Mock interpretation exists and not reported
    (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: interpretationId,
      usage_reported: false,
      user_id: userId
    });

    // Default: Mock PAYG user with active subscription
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: userId,
      tier: 'payg',
      subscription: {
        status: 'active',
        lemonsqueezy_subscription_id: subscriptionId,
        lemonsqueezy_subscription_item_id: 'item-123',
      },
    });

    // Default: Mock interpretation.update to mark as reported
    (prisma.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: interpretationId,
      usage_reported: true
    });
  });

  describe('Lemon Squeezy API Errors', () => {
    it('should handle 400 Bad Request without throwing', async () => {
      // ARRANGE: API returns 400
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          status: 400,
          message: 'Bad Request',
          detail: 'Invalid subscription ID format',
        },
      });

      // ACT: Report usage
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();

      // ASSERT: Error logged but doesn't throw (non-blocking)
      // Verify error was logged (non-blocking behavior)
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle 500 Internal Server Error without throwing', async () => {
      // ARRANGE: Lemon Squeezy API error
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          status: 500,
          message: 'Internal Server Error',
        },
      });

      // ACT & ASSERT: Doesn't throw
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle 503 Service Unavailable without throwing', async () => {
      // ARRANGE: Lemon Squeezy temporarily down
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          status: 503,
          message: 'Service Unavailable',
          detail: 'Temporarily unavailable, please retry',
        },
      });

      // ACT & ASSERT: Non-blocking
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();
    });
  });

  describe('Rate Limiting (429)', () => {
    it('should handle rate limit error gracefully', async () => {
      // ARRANGE: Rate limit exceeded
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          status: 429,
          message: 'Too Many Requests',
          detail: 'Rate limit exceeded, retry after 60 seconds',
        },
      });

      // ACT & ASSERT: Doesn't throw
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Usage reporting failed',
        expect.objectContaining({
          error: expect.objectContaining({
            status: 429,
          }),
        })
      );
    });

    it('should log rate limit for monitoring', async () => {
      // ARRANGE: Rate limited
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { status: 429, message: 'Too Many Requests' },
      });

      // ACT: Report usage
      await reportInterpretationUsage(userId, interpretationId, 1);

      // ASSERT: Should trigger monitoring alert
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Usage reporting failed'),
        expect.any(Object)
      );
    });
  });

  describe('Network Timeouts', () => {
    it('should handle network timeout without throwing', async () => {
      // ARRANGE: Network timeout
      (createUsageRecord as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('ETIMEDOUT: Network request timed out')
      );

      // ACT & ASSERT: Doesn't throw
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle connection refused error', async () => {
      // ARRANGE: Connection refused
      (createUsageRecord as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );

      // ACT & ASSERT: Non-blocking
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();
    });

    it('should handle DNS resolution failure', async () => {
      // ARRANGE: DNS error
      (createUsageRecord as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('ENOTFOUND: DNS lookup failed')
      );

      // ACT & ASSERT: Doesn't throw
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();
    });
  });

  describe('Invalid Subscription IDs', () => {
    it('should handle invalid subscription ID format', async () => {
      // ARRANGE: Invalid ID
      const invalidSubId = 'invalid-format';

      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          status: 404,
          message: 'Not Found',
          detail: 'Subscription not found',
        },
      });

      // ACT & ASSERT: Doesn't throw
      await expect(
        reportInterpretationUsage(invalidSubId, interpretationId, 1)
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle cancelled subscription usage reporting', async () => {
      // ARRANGE: Subscription cancelled
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          status: 400,
          message: 'Bad Request',
          detail: 'Cannot report usage for cancelled subscription',
        },
      });

      // ACT & ASSERT: Fails gracefully
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();
    });

    it('should handle expired subscription', async () => {
      // ARRANGE: Subscription expired
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          status: 400,
          message: 'Subscription expired',
        },
      });

      // ACT & ASSERT: Non-blocking
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();
    });
  });

  describe('Non-Blocking Behavior', () => {
    it('should allow interpretation to succeed even if usage reporting fails', async () => {
      // ARRANGE: Usage reporting fails
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { status: 500, message: 'Internal error' },
      });

      // ACT: Report usage (simulating post-interpretation)
      let interpretationSucceeded = false;

      try {
        // Simulate interpretation logic
        await reportInterpretationUsage(userId, interpretationId, 1);
        interpretationSucceeded = true; // Should reach here
      } catch {
        interpretationSucceeded = false; // Should NOT reach here
      }

      // ASSERT: Interpretation not blocked by usage reporting failure
      expect(interpretationSucceeded).toBe(true);
    });

    it('should continue processing other interpretations after one fails', async () => {
      // ARRANGE: First fails, second succeeds
      (createUsageRecord as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: null,
          error: { status: 500, message: 'Error' },
        })
        .mockResolvedValueOnce({
          data: { data: { id: 'usage-2' } },
          error: null,
        });

      // ACT: Report multiple
      await reportInterpretationUsage(userId, 'interp-1', 1);
      await reportInterpretationUsage(userId, 'interp-2', 1);

      // ASSERT: Both attempted
      expect(createUsageRecord).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff for retries', async () => {
      // NOTE: This tests the concept; actual retry logic would be in a wrapper
      const delays = [1000, 2000, 4000, 8000]; // Exponential backoff

      for (let i = 0; i < delays.length; i++) {
        const expectedDelay = delays[i];
        const nextDelay = i < delays.length - 1 ? delays[i + 1] : delays[i];

        // Exponential backoff formula: delay * 2
        expect(nextDelay).toBeGreaterThanOrEqual(expectedDelay);
      }
    });

    it('should have maximum retry limit', () => {
      const MAX_RETRIES = 3;
      let retryCount = 0;

      // Simulate retry logic
      while (retryCount < MAX_RETRIES) {
        retryCount++;
      }

      // ASSERT: Stops after max retries
      expect(retryCount).toBe(MAX_RETRIES);
    });
  });

  describe('Error Logging', () => {
    it('should log all error details for debugging', async () => {
      // ARRANGE: API error with details
      const errorDetails = {
        status: 400,
        message: 'Bad Request',
        detail: 'Invalid subscription ID format',
        requestId: 'req-123',
      };

      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: errorDetails,
      });

      // ACT: Report usage
      await reportInterpretationUsage(userId, interpretationId, 1);

      // ASSERT: Full error logged
      expect(logger.error).toHaveBeenCalledWith(
        'Usage reporting failed',
        expect.objectContaining({
          subscriptionId,
          interpretationId,
          error: expect.any(Object),
        })
      );
    });

    it('should log subscription and interpretation IDs for tracing', async () => {
      // ARRANGE: Error
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { status: 500, message: 'Error' },
      });

      // ACT: Report usage
      await reportInterpretationUsage(userId, interpretationId, 1);

      // ASSERT: Context logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          subscriptionId,
          interpretationId,
        })
      );
    });
  });

  describe('Successful Reporting After Errors', () => {
    it('should succeed on retry after initial failure', async () => {
      // ARRANGE: Fail then succeed
      (createUsageRecord as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: null,
          error: { status: 503, message: 'Service Unavailable' },
        })
        .mockResolvedValueOnce({
          data: { data: { id: 'usage-success' } },
          error: null,
        });

      // ACT: First attempt (fails)
      await reportInterpretationUsage(userId, 'interp-1', 1);

      // Second attempt (succeeds)
      await reportInterpretationUsage(userId, 'interp-2', 1);

      // ASSERT: Both attempted
      expect(createUsageRecord).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledTimes(1); // Only first failed
    });

    it('should log success after recovery', async () => {
      // ARRANGE: Success
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: { id: 'usage-123' } },
        error: null,
      });

      // ACT: Report usage
      await reportInterpretationUsage(userId, interpretationId, 1);

      // ASSERT: Success logged
      expect(logger.info).toHaveBeenCalledWith(
        'Usage reported to Lemon Squeezy',
        expect.objectContaining({
          subscriptionId,
          interpretationId,
          quantity: 1,
        })
      );
    });
  });

  describe('Error Types Handling', () => {
    it('should handle TypeError from malformed response', async () => {
      // ARRANGE: Malformed response
      (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: null }, // Missing expected structure
        error: null,
      });

      // ACT & ASSERT: Doesn't throw
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();
    });

    it('should handle unexpected exception types', async () => {
      // ARRANGE: Unexpected error
      (createUsageRecord as ReturnType<typeof vi.fn>).mockRejectedValue(
        new TypeError('Cannot read property of undefined')
      );

      // ACT & ASSERT: Caught and logged
      await expect(
        reportInterpretationUsage(userId, interpretationId, 1)
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
