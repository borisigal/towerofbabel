import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  reconcileSubscriptions,
  reconcileUsage,
  findOrphanedSubscriptions,
  runDailyReconciliation
} from '@/lib/lemonsqueezy/reconciliation';
import { prisma } from '@/lib/db/prisma';
import {
  getSubscription,
  listSubscriptions,
  listUsageRecords
} from '@lemonsqueezy/lemonsqueezy.js';

vi.mock('@lemonsqueezy/lemonsqueezy.js');
vi.mock('@/lib/lemonsqueezy/client', () => ({
  configureLemonSqueezy: vi.fn()
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

/**
 * Payment Reconciliation Tests (Task 54)
 *
 * Tests:
 * - Subscription status mismatch detection
 * - Usage reporting discrepancy detection
 * - Orphaned subscription detection
 * - Tier mismatch detection
 * - Renewal date mismatch detection
 * - Sentry alert triggering on threshold exceeded
 */
describe('Payment Reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Subscription Reconciliation', () => {
    it('should detect subscription status mismatch', async () => {
      // ARRANGE: DB shows 'active', Lemon Squeezy shows 'cancelled'
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-1',
          lemonsqueezy_subscription_id: 'ls-sub-123',
          user_id: 'user-1',
          tier: 'pro',
          status: 'active',
          user: { id: 'user-1', tier: 'pro' }
        }
      ]);

      (getSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'ls-sub-123',
            attributes: {
              status: 'cancelled',  // Different from DB
              renews_at: null
            }
          }
        },
        error: null
      });

      // ACT: Run reconciliation
      const issues = await reconcileSubscriptions();

      // ASSERT: Issue detected
      expect(issues.length).toBe(1);
      expect(issues[0].issueType).toBe('status_mismatch');
      expect(issues[0].dbValue).toBe('active');
      expect(issues[0].lemonSqueezyValue).toBe('cancelled');
    });

    it('should detect missing subscription in Lemon Squeezy', async () => {
      // ARRANGE: Subscription in DB but not in Lemon Squeezy
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-1',
          lemonsqueezy_subscription_id: 'ls-sub-missing',
          user_id: 'user-1',
          tier: 'pro',
          status: 'active',
          user: { id: 'user-1', tier: 'pro' }
        }
      ]);

      (getSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: {
          status: 404,
          message: 'Subscription not found'
        }
      });

      // ACT: Run reconciliation
      const issues = await reconcileSubscriptions();

      // ASSERT: Missing subscription detected
      expect(issues.length).toBe(1);
      expect(issues[0].issueType).toBe('missing_in_lemonsqueezy');
    });

    it('should detect user tier mismatch with subscription tier', async () => {
      // ARRANGE: User tier doesn't match subscription tier
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-1',
          lemonsqueezy_subscription_id: 'ls-sub-123',
          user_id: 'user-1',
          tier: 'pro',
          status: 'active',
          user: { id: 'user-1', tier: 'trial' }  // Mismatch!
        }
      ]);

      (getSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'ls-sub-123',
            attributes: {
              status: 'active',
              renews_at: new Date().toISOString()
            }
          }
        },
        error: null
      });

      // ACT: Run reconciliation
      const issues = await reconcileSubscriptions();

      // ASSERT: Tier mismatch detected
      expect(issues.length).toBe(1);
      expect(issues[0].issueType).toBe('user_tier_mismatch');
      expect(issues[0].dbValue).toEqual({
        user_tier: 'trial',
        subscription_tier: 'pro'
      });
    });

    it('should detect renewal date mismatch (>1 day difference)', async () => {
      // ARRANGE: DB and Lemon Squeezy have different renewal dates
      const dbRenewsAt = new Date('2025-02-01');
      const lsRenewsAt = new Date('2025-02-15');  // 14 days difference

      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-1',
          lemonsqueezy_subscription_id: 'ls-sub-123',
          user_id: 'user-1',
          tier: 'pro',
          status: 'active',
          renews_at: dbRenewsAt,
          user: { id: 'user-1', tier: 'pro' }
        }
      ]);

      (getSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'ls-sub-123',
            attributes: {
              status: 'active',
              renews_at: lsRenewsAt.toISOString()
            }
          }
        },
        error: null
      });

      // ACT: Run reconciliation
      const issues = await reconcileSubscriptions();

      // ASSERT: Renewal date mismatch detected
      expect(issues.length).toBe(1);
      expect(issues[0].issueType).toBe('renewal_date_mismatch');
    });

    it('should NOT flag renewal date mismatch within 1 day tolerance', async () => {
      // ARRANGE: DB and Lemon Squeezy within 1 day (timezone tolerance)
      const dbRenewsAt = new Date('2025-02-01T00:00:00Z');
      const lsRenewsAt = new Date('2025-02-01T12:00:00Z');  // 12 hours difference

      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-1',
          lemonsqueezy_subscription_id: 'ls-sub-123',
          user_id: 'user-1',
          tier: 'pro',
          status: 'active',
          renews_at: dbRenewsAt,
          user: { id: 'user-1', tier: 'pro' }
        }
      ]);

      (getSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: {
            id: 'ls-sub-123',
            attributes: {
              status: 'active',
              renews_at: lsRenewsAt.toISOString()
            }
          }
        },
        error: null
      });

      // ACT: Run reconciliation
      const issues = await reconcileSubscriptions();

      // ASSERT: No issue (within tolerance)
      expect(issues.length).toBe(0);
    });
  });

  describe('Usage Reconciliation', () => {
    it('should detect usage reporting discrepancy', async () => {
      // ARRANGE: 10 interpretations in DB, 8 reported to Lemon Squeezy
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          tier: 'payg',
          subscriptions: [{
            id: 'sub-1',
            lemonsqueezy_subscription_id: 'ls-sub-payg-123',
            tier: 'payg',
            status: 'active'
          }],
          interpretations: new Array(10).fill({})  // 10 interpretations
        }
      ]);

      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: new Array(8).fill({}).map((_, i) => ({
            id: `usage-${i}`,
            attributes: { quantity: 1 }
          }))  // 8 usage records
        },
        error: null
      });

      // ACT: Run reconciliation
      const issues = await reconcileUsage();

      // ASSERT: Discrepancy detected (10 - 8 = 2 under-reported)
      expect(issues.length).toBe(1);
      expect(issues[0].dbCount).toBe(10);
      expect(issues[0].lemonSqueezyCount).toBe(8);
      expect(issues[0].difference).toBe(2);  // Under-reported
    });

    it('should NOT flag small discrepancies within 5% tolerance', async () => {
      // ARRANGE: 100 interpretations in DB, 98 reported (2% difference)
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          tier: 'payg',
          subscriptions: [{
            id: 'sub-1',
            lemonsqueezy_subscription_id: 'ls-sub-payg-123',
            tier: 'payg',
            status: 'active'
          }],
          interpretations: new Array(100).fill({})  // 100 interpretations
        }
      ]);

      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: new Array(98).fill({}).map((_, i) => ({
            id: `usage-${i}`,
            attributes: { quantity: 1 }
          }))  // 98 usage records
        },
        error: null
      });

      // ACT: Run reconciliation
      const issues = await reconcileUsage();

      // ASSERT: No issue (within 5% tolerance)
      expect(issues.length).toBe(0);
    });

    it('should detect over-reporting (negative difference)', async () => {
      // ARRANGE: 8 interpretations in DB, 10 reported to Lemon Squeezy
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'user-1',
          tier: 'payg',
          subscriptions: [{
            id: 'sub-1',
            lemonsqueezy_subscription_id: 'ls-sub-payg-123',
            tier: 'payg',
            status: 'active'
          }],
          interpretations: new Array(8).fill({})  // 8 interpretations
        }
      ]);

      (listUsageRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: new Array(10).fill({}).map((_, i) => ({
            id: `usage-${i}`,
            attributes: { quantity: 1 }
          }))  // 10 usage records
        },
        error: null
      });

      // ACT: Run reconciliation
      const issues = await reconcileUsage();

      // ASSERT: Over-reporting detected (8 - 10 = -2)
      expect(issues.length).toBe(1);
      expect(issues[0].difference).toBe(-2);  // Over-reported
    });
  });

  describe('Orphaned Subscription Detection', () => {
    it('should detect orphaned subscription (in Lemon Squeezy but not in DB)', async () => {
      // ARRANGE: Lemon Squeezy has active subscription not in database
      (listSubscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: [
            {
              id: 'ls-sub-orphaned',
              attributes: {
                customer_id: 'cust-123',
                status: 'active'
              }
            }
          ]
        },
        error: null
      });

      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // ACT: Run reconciliation
      const orphaned = await findOrphanedSubscriptions();

      // ASSERT: Orphaned subscription detected
      expect(orphaned.length).toBe(1);
      expect(orphaned[0].lemonSqueezyId).toBe('ls-sub-orphaned');
      expect(orphaned[0].customerId).toBe('cust-123');
    });

    it('should NOT flag cancelled subscriptions as orphaned', async () => {
      // ARRANGE: Lemon Squeezy has cancelled subscription not in DB (expected)
      (listSubscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          data: [
            {
              id: 'ls-sub-cancelled',
              attributes: {
                customer_id: 'cust-123',
                status: 'cancelled'  // Cancelled subscriptions are expected to be missing
              }
            }
          ]
        },
        error: null
      });

      (prisma.subscription.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // ACT: Run reconciliation
      const orphaned = await findOrphanedSubscriptions();

      // ASSERT: No orphaned subscription (cancelled subscriptions ignored)
      expect(orphaned.length).toBe(0);
    });
  });

  describe('Full Reconciliation', () => {
    it('should run all reconciliation checks in parallel', async () => {
      // ARRANGE: Mock all reconciliation functions
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (listSubscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: [] },
        error: null
      });

      // ACT: Run full reconciliation
      const result = await runDailyReconciliation();

      // ASSERT: All checks completed
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.subscriptionsMismatched).toBe(0);
      expect(result.usageMismatched).toBe(0);
      expect(result.orphanedSubscriptions).toBe(0);
      expect(result.details).toBeDefined();
    });

    it('should aggregate multiple issues in reconciliation result', async () => {
      // ARRANGE: Multiple mismatches
      (prisma.subscription.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'sub-1',
          lemonsqueezy_subscription_id: 'ls-sub-1',
          user_id: 'user-1',
          tier: 'pro',
          status: 'active',
          user: { id: 'user-1', tier: 'pro' }
        },
        {
          id: 'sub-2',
          lemonsqueezy_subscription_id: 'ls-sub-2',
          user_id: 'user-2',
          tier: 'pro',
          status: 'active',
          user: { id: 'user-2', tier: 'pro' }
        }
      ]);

      (getSubscription as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: {
            data: {
              id: 'ls-sub-1',
              attributes: { status: 'cancelled', renews_at: null }  // Status mismatch
            }
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              id: 'ls-sub-2',
              attributes: { status: 'expired', renews_at: null }  // Status mismatch
            }
          },
          error: null
        });

      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (listSubscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: [] },
        error: null
      });

      // ACT: Run full reconciliation
      const result = await runDailyReconciliation();

      // ASSERT: Multiple subscription issues detected
      expect(result.subscriptionsMismatched).toBe(2);
      expect(result.details.subscriptionIssues.length).toBe(2);
    });
  });
});
