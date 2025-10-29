import {
  listSubscriptions,
  getSubscription,
  listUsageRecords
} from '@lemonsqueezy/lemonsqueezy.js';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy/client';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';

/**
 * Types for reconciliation issues
 */
type SubscriptionIssueValue =
  | string
  | null
  | Date
  | { id: string; status: string }
  | { user_tier: string; subscription_tier: string };

/**
 * Reconciliation result summary
 */
export interface ReconciliationResult {
  timestamp: Date;
  subscriptionsMismatched: number;
  usageMismatched: number;
  orphanedSubscriptions: number;
  missingSubscriptions: number;
  details: {
    subscriptionIssues: Array<{
      userId: string;
      issueType: string;
      dbValue: SubscriptionIssueValue;
      lemonSqueezyValue: SubscriptionIssueValue;
    }>;
    usageIssues: Array<{
      userId: string;
      dbCount: number;
      lemonSqueezyCount: number;
      difference: number;
    }>;
  };
}

/**
 * Reconcile subscriptions between database and Lemon Squeezy
 * Detects mismatches in subscription status, tier, renewal dates
 */
export async function reconcileSubscriptions(): Promise<ReconciliationResult['details']['subscriptionIssues']> {
  configureLemonSqueezy();

  const issues: ReconciliationResult['details']['subscriptionIssues'] = [];

  // Get all active subscriptions from database
  const dbSubscriptions = await prisma.subscription.findMany({
    where: { status: { in: ['active', 'past_due', 'paused'] } },
    include: { user: { select: { id: true, tier: true } } }
  });

  log.info('Reconciling subscriptions with Lemon Squeezy', { count: dbSubscriptions.length });

  // Check each database subscription against Lemon Squeezy
  for (const dbSub of dbSubscriptions) {
    try {
      const lsSub = await getSubscription(dbSub.lemonsqueezy_subscription_id);

      if (lsSub.error) {
        // Subscription exists in DB but not in Lemon Squeezy
        issues.push({
          userId: dbSub.user_id,
          issueType: 'missing_in_lemonsqueezy',
          dbValue: { id: dbSub.id, status: dbSub.status },
          lemonSqueezyValue: null
        });
        continue;
      }

      const lsData = lsSub.data.data.attributes;

      // Check status mismatch
      if (dbSub.status !== lsData.status) {
        issues.push({
          userId: dbSub.user_id,
          issueType: 'status_mismatch',
          dbValue: dbSub.status,
          lemonSqueezyValue: lsData.status
        });
      }

      // Check tier mismatch
      if (dbSub.user.tier !== dbSub.tier) {
        issues.push({
          userId: dbSub.user_id,
          issueType: 'user_tier_mismatch',
          dbValue: { user_tier: dbSub.user.tier, subscription_tier: dbSub.tier },
          lemonSqueezyValue: null
        });
      }

      // Check renewal date mismatch (allow 1 day tolerance for time zones)
      if (dbSub.renews_at && lsData.renews_at) {
        const dbDate = new Date(dbSub.renews_at).getTime();
        const lsDate = new Date(lsData.renews_at).getTime();
        const dayInMs = 86400000;

        if (Math.abs(dbDate - lsDate) > dayInMs) {
          issues.push({
            userId: dbSub.user_id,
            issueType: 'renewal_date_mismatch',
            dbValue: dbSub.renews_at,
            lemonSqueezyValue: lsData.renews_at
          });
        }
      }

    } catch (error) {
      log.error('Error fetching subscription from Lemon Squeezy',
        { error, subscriptionId: dbSub.lemonsqueezy_subscription_id });

      issues.push({
        userId: dbSub.user_id,
        issueType: 'api_error',
        dbValue: dbSub.status,
        lemonSqueezyValue: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return issues;
}

/**
 * Reconcile PAYG usage tracking between database and Lemon Squeezy
 * Compares interpretation count vs reported usage
 */
export async function reconcileUsage(): Promise<ReconciliationResult['details']['usageIssues']> {
  configureLemonSqueezy();

  const issues: ReconciliationResult['details']['usageIssues'] = [];

  // Get all PAYG users with active subscriptions
  const paygUsers = await prisma.user.findMany({
    where: {
      tier: 'payg',
      subscription: { status: 'active', tier: 'payg' }
    },
    include: {
      subscription: true,
      interpretations: {
        where: {
          timestamp: {
            // Count interpretations in current billing period
            gte: new Date(new Date().setDate(1)) // First day of current month
          }
        }
      }
    }
  });

  log.info('Reconciling PAYG usage with Lemon Squeezy', { count: paygUsers.length });

  for (const user of paygUsers) {
    if (!user.subscription) continue;

    const subscription = user.subscription;
    const dbInterpretationCount = user.interpretations.length;

    try {
      // Skip if no subscription item ID
      if (!subscription.lemonsqueezy_subscription_item_id) {
        log.warn('PAYG subscription missing subscription_item_id', { userId: user.id });
        continue;
      }

      // Fetch usage records from Lemon Squeezy
      const usageRecords = await listUsageRecords({
        filter: {
          subscriptionItemId: subscription.lemonsqueezy_subscription_item_id
        }
      });

      if (usageRecords.error) {
        log.error('Failed to fetch usage records from Lemon Squeezy',
          { error: usageRecords.error, userId: user.id });
        continue;
      }

      // Sum usage quantity from Lemon Squeezy
      const lsUsageCount = usageRecords.data.data.reduce(
        (sum, record) => sum + (record.attributes.quantity || 0),
        0
      );

      const difference = Math.abs(dbInterpretationCount - lsUsageCount);
      const threshold = Math.max(dbInterpretationCount * 0.05, 1); // 5% tolerance or 1 interpretation

      if (difference > threshold) {
        issues.push({
          userId: user.id,
          dbCount: dbInterpretationCount,
          lemonSqueezyCount: lsUsageCount,
          difference: dbInterpretationCount - lsUsageCount  // Positive = under-reported, Negative = over-reported
        });
      }

    } catch (error) {
      log.error('Error fetching usage records', { error, userId: user.id });
    }
  }

  return issues;
}

/**
 * Find orphaned subscriptions (in Lemon Squeezy but not in database)
 * Usually indicates webhook delivery failure
 */
export async function findOrphanedSubscriptions(): Promise<Array<{ lemonSqueezyId: string; customerId: string }>> {
  configureLemonSqueezy();

  const orphaned: Array<{ lemonSqueezyId: string; customerId: string }> = [];

  // Fetch all subscriptions from Lemon Squeezy
  // NOTE: This may be paginated for large datasets
  const lsSubscriptions = await listSubscriptions();

  if (lsSubscriptions.error) {
    log.error('Failed to list subscriptions from Lemon Squeezy', { error: lsSubscriptions.error });
    return orphaned;
  }

  for (const lsSub of lsSubscriptions.data.data) {
    const lsSubId = lsSub.id.toString();

    // Check if subscription exists in database
    const dbSub = await prisma.subscription.findUnique({
      where: { lemonsqueezy_subscription_id: lsSubId }
    });

    if (!dbSub && lsSub.attributes.status === 'active') {
      orphaned.push({
        lemonSqueezyId: lsSubId,
        customerId: lsSub.attributes.customer_id.toString()
      });
    }
  }

  log.info('Orphaned subscriptions found', { count: orphaned.length });

  return orphaned;
}

/**
 * Run full reconciliation and generate report
 */
export async function runDailyReconciliation(): Promise<ReconciliationResult> {
  const timestamp = new Date();

  log.info('Starting daily reconciliation');

  const [subscriptionIssues, usageIssues, orphaned] = await Promise.all([
    reconcileSubscriptions(),
    reconcileUsage(),
    findOrphanedSubscriptions()
  ]);

  const result: ReconciliationResult = {
    timestamp,
    subscriptionsMismatched: subscriptionIssues.length,
    usageMismatched: usageIssues.length,
    orphanedSubscriptions: orphaned.length,
    missingSubscriptions: subscriptionIssues.filter(i => i.issueType === 'missing_in_lemonsqueezy').length,
    details: {
      subscriptionIssues,
      usageIssues
    }
  };

  // Log summary
  log.info('Daily reconciliation completed', {
    subscriptionsMismatched: result.subscriptionsMismatched,
    usageMismatched: result.usageMismatched,
    orphanedSubscriptions: result.orphanedSubscriptions
  });

  return result;
}
