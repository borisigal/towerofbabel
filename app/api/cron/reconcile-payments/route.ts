import { NextRequest, NextResponse } from 'next/server';
import { runDailyReconciliation } from '@/lib/lemonsqueezy/reconciliation';
import { logger } from '@/lib/observability/logger';
import * as Sentry from '@sentry/nextjs';

/**
 * Daily reconciliation cron job
 * Runs at 2 AM UTC every day
 *
 * Compares database vs Lemon Squeezy:
 * - Subscription status, tier, renewal dates
 * - PAYG usage reporting accuracy
 * - Orphaned/missing subscriptions
 *
 * Alerts if discrepancies exceed threshold
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify cron secret (same pattern as reset-usage cron)
  const authHeader = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    logger.warn('Unauthorized reconciliation cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Reconciliation cron job started');

    const result = await runDailyReconciliation();

    // Alert thresholds
    const SUBSCRIPTION_THRESHOLD = 5;  // Alert if >5 subscription mismatches
    const USAGE_THRESHOLD_PERCENT = 0.05;  // Alert if >5% usage discrepancy

    // Check if alerts needed
    const totalUsageDiscrepancy = result.details.usageIssues.reduce(
      (sum, issue) => sum + Math.abs(issue.difference),
      0
    );
    const totalUsageReported = result.details.usageIssues.reduce(
      (sum, issue) => sum + issue.lemonSqueezyCount,
      0
    );
    const usageDiscrepancyPercent = totalUsageReported > 0
      ? totalUsageDiscrepancy / totalUsageReported
      : 0;

    if (result.subscriptionsMismatched > SUBSCRIPTION_THRESHOLD) {
      Sentry.captureMessage('Subscription reconciliation discrepancies detected', {
        level: 'warning',
        tags: { reconciliation: 'subscription' },
        extra: {
          mismatched: result.subscriptionsMismatched,
          threshold: SUBSCRIPTION_THRESHOLD,
          details: result.details.subscriptionIssues
        }
      });

      logger.warn({
        mismatched: result.subscriptionsMismatched,
        issues: result.details.subscriptionIssues
      }, 'Subscription reconciliation alert triggered');
    }

    if (usageDiscrepancyPercent > USAGE_THRESHOLD_PERCENT) {
      Sentry.captureMessage('Usage tracking reconciliation discrepancies detected', {
        level: 'error',  // Higher severity for revenue impact
        tags: { reconciliation: 'usage' },
        extra: {
          discrepancyPercent: (usageDiscrepancyPercent * 100).toFixed(2) + '%',
          threshold: (USAGE_THRESHOLD_PERCENT * 100).toFixed(2) + '%',
          totalDiscrepancy: totalUsageDiscrepancy,
          details: result.details.usageIssues
        }
      });

      logger.error({
        discrepancyPercent: usageDiscrepancyPercent,
        issues: result.details.usageIssues
      }, 'Usage tracking reconciliation alert triggered');
    }

    if (result.orphanedSubscriptions > 0) {
      Sentry.captureMessage('Orphaned subscriptions detected', {
        level: 'warning',
        tags: { reconciliation: 'orphaned' },
        extra: {
          count: result.orphanedSubscriptions
        }
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        subscriptionsMismatched: result.subscriptionsMismatched,
        usageMismatched: result.usageMismatched,
        orphanedSubscriptions: result.orphanedSubscriptions,
        usageDiscrepancyPercent: (usageDiscrepancyPercent * 100).toFixed(2) + '%'
      },
      alertsTriggered: {
        subscriptions: result.subscriptionsMismatched > SUBSCRIPTION_THRESHOLD,
        usage: usageDiscrepancyPercent > USAGE_THRESHOLD_PERCENT,
        orphaned: result.orphanedSubscriptions > 0
      }
    });

  } catch (error) {
    logger.error({ error }, 'Reconciliation cron job failed');

    Sentry.captureException(error, {
      tags: { cron: 'reconciliation' }
    });

    return NextResponse.json({
      success: false,
      error: 'Reconciliation failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
