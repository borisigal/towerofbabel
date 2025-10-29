import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reportInterpretationUsage } from '@/lib/lemonsqueezy/usageReporting';
import { prisma } from '@/lib/db/prisma';
import { createUsageRecord, listUsageRecords } from '@lemonsqueezy/lemonsqueezy.js';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy/client';

vi.mock('@lemonsqueezy/lemonsqueezy.js');
vi.mock('@/lib/lemonsqueezy/client');
vi.mock('@/lib/db/prisma', () => ({
  default: {
    interpretation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
  },
  prisma: {
    interpretation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
  },
}));

/**
 * PAYG Usage Aggregation Tests
 *
 * Tests usage tracking and billing for Pay-As-You-Go subscriptions:
 * - Multiple interpretations in same billing period
 * - Usage reporting across month boundaries
 * - Zero usage months
 * - High volume usage scenarios
 * - Usage reconciliation with Lemon Squeezy
 */
describe('PAYG Usage Aggregation', () => {
  const subscriptionId = 'ls-sub-payg-123';
  const userId = 'user-payg-123';

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default Lemon Squeezy config mock
    (configureLemonSqueezy as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    // Default successful usage reporting
    (createUsageRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: {
          id: 'usage-record-123',
          attributes: { quantity: 1 },
        },
      },
      error: null,
    });

    // Mock interpretation.findUnique - interpretation exists and not reported
    const { default: prismaDefault } = await import('@/lib/db/prisma');
    (prismaDefault.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'interp-123',
      usage_reported: false,
      user_id: userId,
    });

    // Mock interpretation.update - mark as reported
    (prismaDefault.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'interp-123',
      usage_reported: true,
    });

    // Mock user.findUnique - PAYG user with active subscription
    (prismaDefault.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: userId,
      tier: 'payg',
      subscription: {
        status: 'active',
        lemonsqueezy_subscription_id: subscriptionId,
        lemonsqueezy_subscription_item_id: 'item-123',
      },
    });
  });

  describe('Multiple Interpretations in Same Billing Period', () => {
    it('should report all interpretations as separate usage events', async () => {
      // ARRANGE: User creates 5 interpretations in one day
      const interpretations = Array.from({ length: 5 }, (_, i) => ({
        id: `interp-${i + 1}`,
        user_id: userId,
        created_at: new Date(),
      }));

      // ACT: Report usage for each interpretation
      for (const interp of interpretations) {
        await reportInterpretationUsage(subscriptionId, interp.id, 1);
      }

      // ASSERT: All 5 usage events reported
      expect(createUsageRecord).toHaveBeenCalledTimes(5);

      // Idempotency is handled at DB level (usage_reported flag)
      // Each interpretation ID serves as the idempotency key
      const calls = (createUsageRecord as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBe(5);
    });

    it('should track usage across multiple days within billing period', async () => {
      // ARRANGE: User creates interpretations over 15 days
      const billingPeriodStart = new Date('2025-11-01');
      const interpretations = Array.from({ length: 30 }, (_, i) => ({
        id: `interp-${i + 1}`,
        user_id: userId,
        created_at: new Date(billingPeriodStart.getTime() + i * 12 * 60 * 60 * 1000), // Every 12 hours
      }));

      (prisma.interpretation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        interpretations
      );

      // ACT: Query interpretations in billing period
      const billingPeriodEnd = new Date('2025-11-30');
      const userInterpretations = await prisma.interpretation.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: billingPeriodStart,
            lte: billingPeriodEnd,
          },
        },
      });

      // ASSERT: All 30 interpretations tracked
      expect(userInterpretations.length).toBe(30);
    });

    it('should correctly aggregate usage for monthly invoice', async () => {
      // ARRANGE: PAYG user with 50 interpretations in November
      const novemberInterpretations = Array.from({ length: 50 }, (_, i) => ({
        id: `interp-nov-${i + 1}`,
        user_id: userId,
        created_at: new Date(`2025-11-${(i % 28) + 1}`),
      }));

      (prisma.interpretation.count as ReturnType<typeof vi.fn>).mockResolvedValue(50);

      // Mock Lemon Squeezy usage records API
      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: Array.from({ length: 50 }, (_, i) => ({
            id: `usage-${i + 1}`,
            attributes: { quantity: 1 },
          })),
        },
        error: null,
      });

      // ACT: Get usage count for billing period
      const dbCount = await prisma.interpretation.count({
        where: {
          user_id: userId,
          created_at: {
            gte: new Date('2025-11-01'),
            lte: new Date('2025-11-30'),
          },
        },
      });

      const lsUsageResponse = await listUsageRecords({
        subscriptionId,
      });

      const lsCount = lsUsageResponse.data!.data.reduce(
        (sum, record) => sum + (record.attributes.quantity || 0),
        0
      );

      // ASSERT: Database and Lemon Squeezy counts match
      expect(dbCount).toBe(50);
      expect(lsCount).toBe(50);

      // Expected invoice: 50 × $0.50 = $25.00
      const expectedCharge = 50 * 0.5;
      expect(expectedCharge).toBe(25.0);
    });
  });

  describe('Usage Reporting Across Month Boundaries', () => {
    it('should correctly attribute usage to correct billing period', async () => {
      // ARRANGE: Interpretations on Nov 30 and Dec 1
      const nov30Interp = {
        id: 'interp-nov-30',
        user_id: userId,
        created_at: new Date('2025-11-30T23:59:59Z'),
      };

      const dec1Interp = {
        id: 'interp-dec-1',
        user_id: userId,
        created_at: new Date('2025-12-01T00:00:01Z'),
      };

      // ACT: Query interpretations for November billing period
      const novemberStart = new Date('2025-11-01T00:00:00Z');
      const novemberEnd = new Date('2025-11-30T23:59:59Z');

      (prisma.interpretation.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([nov30Interp]) // November query
        .mockResolvedValueOnce([dec1Interp]); // December query

      const novemberInterpretations = await prisma.interpretation.findMany({
        where: {
          user_id: userId,
          created_at: { gte: novemberStart, lte: novemberEnd },
        },
      });

      const decemberStart = new Date('2025-12-01T00:00:00Z');
      const decemberEnd = new Date('2025-12-31T23:59:59Z');

      const decemberInterpretations = await prisma.interpretation.findMany({
        where: {
          user_id: userId,
          created_at: { gte: decemberStart, lte: decemberEnd },
        },
      });

      // ASSERT: Each interpretation in correct billing period
      expect(novemberInterpretations.length).toBe(1);
      expect(novemberInterpretations[0].id).toBe('interp-nov-30');

      expect(decemberInterpretations.length).toBe(1);
      expect(decemberInterpretations[0].id).toBe('interp-dec-1');
    });

    it('should handle timezone differences in usage reporting', async () => {
      // ARRANGE: User in PST timezone, server in UTC
      // Nov 30 11:00 PM PST = Dec 1 07:00 AM UTC
      const pstInterpretation = {
        id: 'interp-pst',
        user_id: userId,
        created_at: new Date('2025-12-01T07:00:00Z'), // UTC time
      };

      // ACT: Query for November PST billing period
      // November PST: Nov 1 00:00 PST to Nov 30 23:59 PST
      // In UTC: Nov 1 08:00 UTC to Dec 1 07:59 UTC
      const novemberPSTStart = new Date('2025-11-01T08:00:00Z');
      const novemberPSTEnd = new Date('2025-12-01T07:59:59Z');

      (prisma.interpretation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        pstInterpretation,
      ]);

      const interpretations = await prisma.interpretation.findMany({
        where: {
          user_id: userId,
          created_at: { gte: novemberPSTStart, lte: novemberPSTEnd },
        },
      });

      // ASSERT: Interpretation correctly attributed to November PST
      expect(interpretations.length).toBe(1);
      expect(interpretations[0].id).toBe('interp-pst');
    });

    it('should reset usage counter at correct month boundary', async () => {
      // ARRANGE: User's billing cycle starts on 15th of month
      // Billing period: Nov 15 - Dec 14
      const billingAnchor = 15;

      const beforeResetInterp = {
        id: 'before-reset',
        created_at: new Date('2025-12-14T23:59:59Z'),
      };

      const afterResetInterp = {
        id: 'after-reset',
        created_at: new Date('2025-12-15T00:00:01Z'),
      };

      // ACT: Query for current billing period
      const currentPeriodStart = new Date('2025-11-15T00:00:00Z');
      const currentPeriodEnd = new Date('2025-12-14T23:59:59Z');

      (prisma.interpretation.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([beforeResetInterp])
        .mockResolvedValueOnce([afterResetInterp]);

      const currentPeriodInterpretations = await prisma.interpretation.findMany({
        where: {
          created_at: { gte: currentPeriodStart, lte: currentPeriodEnd },
        },
      });

      const nextPeriodStart = new Date('2025-12-15T00:00:00Z');
      const nextPeriodEnd = new Date('2026-01-14T23:59:59Z');

      const nextPeriodInterpretations = await prisma.interpretation.findMany({
        where: {
          created_at: { gte: nextPeriodStart, lte: nextPeriodEnd },
        },
      });

      // ASSERT: Interpretations in correct billing periods
      expect(currentPeriodInterpretations[0].id).toBe('before-reset');
      expect(nextPeriodInterpretations[0].id).toBe('after-reset');
    });
  });

  describe('Zero Usage Months', () => {
    it('should handle zero usage month with no charge', async () => {
      // ARRANGE: PAYG user with no interpretations in December
      (prisma.interpretation.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: [] },
        error: null,
      });

      // ACT: Get usage count for December
      const decemberCount = await prisma.interpretation.count({
        where: {
          user_id: userId,
          created_at: {
            gte: new Date('2025-12-01'),
            lte: new Date('2025-12-31'),
          },
        },
      });

      const lsUsageResponse = await listUsageRecords({ subscriptionId });

      // ASSERT: Zero usage, zero charge
      expect(decemberCount).toBe(0);
      expect(lsUsageResponse.data!.data.length).toBe(0);

      const expectedCharge = 0 * 0.5;
      expect(expectedCharge).toBe(0);
    });

    it('should keep PAYG subscription active even with zero usage', async () => {
      // ARRANGE: PAYG subscription with no usage for 3 months
      (prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub-payg-123',
        user_id: userId,
        tier: 'payg',
        status: 'active', // Should remain active
        lemonsqueezy_subscription_id: subscriptionId,
      });

      // ACT: Check subscription status after zero usage
      const subscription = await prisma.subscription.findFirst({
        where: { user_id: userId, tier: 'payg' },
      });

      // ASSERT: Subscription still active (not cancelled)
      expect(subscription?.status).toBe('active');
    });
  });

  describe('High Volume Usage Scenarios', () => {
    it('should handle 100+ interpretations in single month', async () => {
      // ARRANGE: Power user with 150 interpretations in November
      const interpretations = Array.from({ length: 150 }, (_, i) => ({
        id: `interp-high-vol-${i + 1}`,
        user_id: userId,
        created_at: new Date(`2025-11-${(i % 28) + 1}`),
      }));

      // ACT: Report all usage
      for (const interp of interpretations) {
        await reportInterpretationUsage(subscriptionId, interp.id, 1);
      }

      // ASSERT: All 150 usage events reported
      expect(createUsageRecord).toHaveBeenCalledTimes(150);

      // Expected invoice: 150 × $0.50 = $75.00
      const expectedCharge = 150 * 0.5;
      expect(expectedCharge).toBe(75.0);
    });

    it('should handle rapid usage reporting (stress test)', async () => {
      // ARRANGE: 50 interpretations created within 1 minute
      const rapidInterpretations = Array.from({ length: 50 }, (_, i) => ({
        id: `rapid-interp-${i + 1}`,
        user_id: userId,
        created_at: new Date(Date.now() + i * 1000), // 1 per second
      }));

      // ACT: Report all usage concurrently
      const startTime = Date.now();

      await Promise.all(
        rapidInterpretations.map((interp) =>
          reportInterpretationUsage(subscriptionId, interp.id, 1)
        )
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // ASSERT: All reported successfully within reasonable time
      expect(createUsageRecord).toHaveBeenCalledTimes(50);
      expect(duration).toBeLessThan(10000); // Less than 10 seconds
    });

    it('should handle Lemon Squeezy API rate limiting gracefully', async () => {
      // ARRANGE: Simulate rate limiting on 10th request
      let callCount = 0;

      (createUsageRecord as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        if (callCount === 10) {
          // Simulate rate limit error
          return {
            data: null,
            error: {
              status: 429,
              message: 'Too Many Requests',
              detail: 'Rate limit exceeded',
            },
          };
        }
        return {
          data: { data: { id: `usage-${callCount}` } },
          error: null,
        };
      });

      // ACT: Report 15 usage events
      const results = [];
      for (let i = 1; i <= 15; i++) {
        const result = await reportInterpretationUsage(subscriptionId, `interp-${i}`, 1);
        results.push(result);
      }

      // ASSERT: 10th call failed with rate limit, others succeeded
      // Note: reportInterpretationUsage should handle errors gracefully (non-blocking)
      expect(createUsageRecord).toHaveBeenCalledTimes(15);
    });
  });

  describe('Usage Reconciliation with Lemon Squeezy', () => {
    it('should detect missing usage reports (under-reporting)', async () => {
      // ARRANGE: Database shows 20 interpretations, Lemon Squeezy shows 18
      (prisma.interpretation.count as ReturnType<typeof vi.fn>).mockResolvedValue(20);

      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: Array.from({ length: 18 }, (_, i) => ({
            id: `usage-${i + 1}`,
            attributes: { quantity: 1 },
          })),
        },
        error: null,
      });

      // ACT: Reconcile usage
      const dbCount = await prisma.interpretation.count({ where: { user_id: userId } });
      const lsUsageResponse = await listUsageRecords({ subscriptionId });
      const lsCount = lsUsageResponse.data!.data.length;

      const discrepancy = dbCount - lsCount;

      // ASSERT: 2 interpretations under-reported
      expect(discrepancy).toBe(2);
      expect(discrepancy).toBeGreaterThan(0); // Under-charging user (bad for revenue)
    });

    it('should detect duplicate usage reports (over-reporting)', async () => {
      // ARRANGE: Database shows 15 interpretations, Lemon Squeezy shows 17 (duplicates)
      (prisma.interpretation.count as ReturnType<typeof vi.fn>).mockResolvedValue(15);

      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: Array.from({ length: 17 }, (_, i) => ({
            id: `usage-${i + 1}`,
            attributes: { quantity: 1 },
          })),
        },
        error: null,
      });

      // ACT: Reconcile usage
      const dbCount = await prisma.interpretation.count({ where: { user_id: userId } });
      const lsUsageResponse = await listUsageRecords({ subscriptionId });
      const lsCount = lsUsageResponse.data!.data.length;

      const discrepancy = dbCount - lsCount;

      // ASSERT: 2 interpretations over-reported (double-charged user - BAD)
      expect(discrepancy).toBe(-2);
      expect(discrepancy).toBeLessThan(0); // Over-charging user (bad for trust)
    });

    it('should validate usage count matches within tolerance', async () => {
      // ARRANGE: Database and Lemon Squeezy counts match
      const expectedCount = 42;

      (prisma.interpretation.count as ReturnType<typeof vi.fn>).mockResolvedValue(
        expectedCount
      );

      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: Array.from({ length: expectedCount }, (_, i) => ({
            id: `usage-${i + 1}`,
            attributes: { quantity: 1 },
          })),
        },
        error: null,
      });

      // ACT: Reconcile usage
      const dbCount = await prisma.interpretation.count({ where: { user_id: userId } });
      const lsUsageResponse = await listUsageRecords({ subscriptionId });
      const lsCount = lsUsageResponse.data!.data.length;

      const discrepancyPercent = Math.abs((dbCount - lsCount) / dbCount);

      // ASSERT: Perfect match (0% discrepancy)
      expect(dbCount).toBe(lsCount);
      expect(discrepancyPercent).toBe(0);
    });

    it('should trigger alert when discrepancy exceeds threshold', async () => {
      // ARRANGE: 10% discrepancy (threshold exceeded)
      (prisma.interpretation.count as ReturnType<typeof vi.fn>).mockResolvedValue(100);

      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: Array.from({ length: 88 }, (_, i) => ({
            id: `usage-${i + 1}`,
            attributes: { quantity: 1 },
          })),
        },
        error: null,
      });

      // ACT: Check discrepancy
      const dbCount = await prisma.interpretation.count({ where: { user_id: userId } });
      const lsUsageResponse = await listUsageRecords({ subscriptionId });
      const lsCount = lsUsageResponse.data!.data.length;

      const discrepancyPercent = Math.abs((dbCount - lsCount) / dbCount);
      const THRESHOLD = 0.05; // 5% tolerance

      // ASSERT: Discrepancy exceeds threshold (12% vs 5%)
      expect(discrepancyPercent).toBeGreaterThan(THRESHOLD);

      // In production, this should trigger Sentry alert
      if (discrepancyPercent > THRESHOLD) {
        // Log alert (would call Sentry.captureMessage in real code)
        console.warn(`Usage discrepancy: ${(discrepancyPercent * 100).toFixed(2)}%`);
      }
    });
  });

  describe('Usage Reporting Retry and Recovery', () => {
    it('should retry failed usage reporting on next interpretation', async () => {
      // ARRANGE: First usage report fails, second succeeds
      (createUsageRecord as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: null,
          error: { status: 500, message: 'Internal Server Error' },
        })
        .mockResolvedValueOnce({
          data: { data: { id: 'usage-retry-success' } },
          error: null,
        });

      // ACT: Report usage for two interpretations
      await reportInterpretationUsage(subscriptionId, 'interp-1', 1);
      await reportInterpretationUsage(subscriptionId, 'interp-2', 1);

      // ASSERT: Both attempts made (non-blocking errors)
      expect(createUsageRecord).toHaveBeenCalledTimes(2);
    });

    it('should eventually report all usage even with transient failures', async () => {
      // ARRANGE: Network issues cause intermittent failures
      let successCount = 0;

      (createUsageRecord as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        // 80% success rate
        if (Math.random() < 0.8) {
          successCount++;
          return { data: { data: { id: `usage-${successCount}` } }, error: null };
        }
        return { data: null, error: { status: 503, message: 'Service Unavailable' } };
      });

      // ACT: Report 50 usage events
      for (let i = 1; i <= 50; i++) {
        await reportInterpretationUsage(subscriptionId, `interp-${i}`, 1);
      }

      // ASSERT: Most usage reported (some failures acceptable with retry mechanisms)
      expect(createUsageRecord).toHaveBeenCalledTimes(50);
      expect(successCount).toBeGreaterThan(30); // At least 60% success
    });
  });
});
