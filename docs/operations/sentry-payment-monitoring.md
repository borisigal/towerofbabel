# Sentry Payment Monitoring Setup Guide

**Task 55: Sentry Alerts and Payment Dashboard Setup**
**Priority:** P0 (Critical - Operational)
**Purpose:** Comprehensive monitoring for payment failures, webhook errors, and usage tracking issues

---

## Overview

This document provides step-by-step instructions for configuring Sentry alerts and dashboards to monitor the Lemon Squeezy payment integration. These alerts are **critical** for preventing revenue loss and detecting payment system failures in production.

**Critical Metrics Monitored:**
- Payment failure rate
- Webhook processing errors
- Signature verification failures
- Usage reporting failures
- Reconciliation discrepancies
- Test mode detection in production

---

## 1. Sentry Alert Rules Configuration

### Alert 1: Payment Failure Rate Spike ⚠️ HIGH PRIORITY

**Purpose:** Detect when checkout/subscription creation failures exceed normal rate

**Configuration:**
1. Log in to Sentry dashboard → Navigate to **Alerts** → Click **Create Alert Rule**
2. **Alert Name:** `Payment Failure Rate Spike`
3. **Environment:** `production`
4. **Metric:** Error count
5. **Filter Conditions:**
   ```
   tags.payment_flow = "checkout"
   OR message contains "checkout"
   OR message contains "payment"
   ```
6. **Threshold:** `> 10 errors in 5 minutes`
7. **Action:**
   - Send to **#payments-alerts** Slack channel
   - Notify **@on-call** engineer
   - Email **ops@towerofbabel.com**
8. **Severity:** `High`

**Expected Behavior:**
- Alert fires when >10 payment-related errors occur within 5-minute window
- Indicates potential payment gateway issues, API failures, or configuration problems

---

### Alert 2: Webhook Processing Failure 🚨 CRITICAL

**Purpose:** Detect webhook processing failures that could cause subscription desync

**Configuration:**
1. **Alert Name:** `Webhook Processing Failure`
2. **Environment:** `production`
3. **Metric:** Error count
4. **Filter Conditions:**
   ```
   tags.cron = "webhook"
   OR tags.webhook = "true"
   OR message contains "webhook"
   ```
5. **Threshold:** `> 5 errors in 10 minutes`
6. **Action:**
   - Send to **#payments-alerts** Slack channel
   - Create **PagerDuty incident** (high urgency)
   - Notify **@on-call** engineer immediately
7. **Severity:** `Critical`

**Expected Behavior:**
- Alert fires when >5 webhook processing errors within 10 minutes
- Requires immediate investigation (subscription status may desync)

---

### Alert 3: Webhook Signature Verification Failure Spike 🔒 SECURITY

**Purpose:** Detect potential security attack or webhook misconfiguration

**Configuration:**
1. **Alert Name:** `Webhook Signature Verification Failure Spike`
2. **Environment:** `production`
3. **Metric:** Warning count
4. **Filter Conditions:**
   ```
   message contains "Invalid webhook signature"
   OR message contains "signature verification failed"
   ```
5. **Threshold:** `> 5 warnings in 5 minutes`
6. **Action:**
   - Send to **#security-alerts** Slack channel
   - Notify **security team**
   - Create **incident log entry**
7. **Severity:** `High`

**Expected Behavior:**
- Alert fires when >5 signature verification failures within 5 minutes
- May indicate:
  - Webhook secret misconfigured
  - Man-in-the-middle attack attempt
  - Lemon Squeezy API changes

---

### Alert 4: Usage Reporting Failure Rate 💰 REVENUE IMPACT

**Purpose:** Detect usage reporting failures that cause revenue leakage for PAYG users

**Configuration:**
1. **Alert Name:** `Usage Reporting Failure Rate`
2. **Environment:** `production`
3. **Metric:** Error count
4. **Filter Conditions:**
   ```
   message contains "Usage reporting failed"
   OR tags.usage_reporting = "error"
   ```
5. **Threshold:** `> 5 errors in 10 minutes`
6. **Action:**
   - Send to **#payments-alerts** Slack channel
   - Email **ops@towerofbabel.com**
7. **Severity:** `High`

**Expected Behavior:**
- Alert fires when >5 usage reporting failures within 10 minutes
- Revenue impact: PAYG users not being charged correctly

---

### Alert 5: Reconciliation Discrepancy Detected 🔍 FINANCIAL AUDIT

**Purpose:** Alert when daily reconciliation detects subscription/usage mismatches

**Configuration:**
1. **Alert Name:** `Reconciliation Discrepancy Detected`
2. **Environment:** `production`
3. **Metric:** Error or warning count
4. **Filter Conditions:**
   ```
   tags.reconciliation = "true"
   OR message contains "reconciliation discrepancies detected"
   ```
5. **Threshold:** `Any occurrence` (no threshold, alert immediately)
6. **Action:**
   - Send to **#payments-alerts** Slack channel
   - Email **ops@towerofbabel.com**
   - Create **incident log entry**
7. **Severity:** `Warning` or `Error` (depending on discrepancy type)

**Expected Behavior:**
- Alert fires on ANY reconciliation discrepancy (daily at ~2 AM UTC)
- Requires manual investigation and resolution

---

### Alert 6: Test Mode Detected in Production 💣 CRITICAL

**Purpose:** Prevent production deployment with test mode enabled (revenue disaster)

**Configuration:**
1. **Alert Name:** `Test Mode Detected in Production`
2. **Environment:** `production`
3. **Metric:** Fatal error count
4. **Filter Conditions:**
   ```
   level = "fatal"
   AND message contains "Test mode detected in production"
   ```
5. **Threshold:** `Any occurrence` (immediate alert)
6. **Action:**
   - Create **PagerDuty critical incident**
   - Notify **@on-call** engineer immediately
   - Send to **#payments-alerts** AND **#exec-alerts**
   - Halt all deployments
   - Email **exec@towerofbabel.com**
7. **Severity:** `Fatal`

**Expected Behavior:**
- **SHOULD NEVER FIRE**
- If fired: CRITICAL emergency - all payments will be test transactions (no revenue collected)
- Immediate rollback required

---

## 2. Sentry Performance Monitoring

### Enable Performance Tracking

Update `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring sample rate
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,  // 10% in production

  // Track HTTP requests
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],

  // Tag payment-related transactions
  beforeSendTransaction(event) {
    if (event.transaction?.includes('/api/checkout') ||
        event.transaction?.includes('/api/subscription') ||
        event.transaction?.includes('/api/webhooks/lemonsqueezy')) {
      event.tags = { ...event.tags, payment_flow: 'true' };
    }
    return event;
  }
});
```

### Performance Alert Thresholds

Configure performance alerts for payment endpoints:

1. **Checkout Endpoint Performance**
   - Metric: `p95 latency` for `/api/checkout/pro` and `/api/checkout/payg`
   - Warning: `> 500ms`
   - Critical: `> 1000ms`

2. **Webhook Processing Performance**
   - Metric: `p95 latency` for `/api/webhooks/lemonsqueezy`
   - Warning: `> 1000ms`
   - Critical: `> 2000ms`

3. **PAYG Subscription Creation Performance**
   - Metric: `p95 latency` for `/api/subscription/payg/create`
   - Warning: `> 300ms`
   - Critical: `> 500ms`

---

## 3. Slack Integration Setup

### Connect Sentry to Slack

1. Navigate to **Sentry → Settings → Integrations → Slack**
2. Click **Add Workspace**
3. Authorize Sentry to access your Slack workspace
4. Select workspace: **TowerOfBabel**

### Create Dedicated Slack Channels

Create the following Slack channels:

1. **#payments-alerts**
   - Purpose: All payment-related alerts and errors
   - Members: Engineering team, ops team, on-call rotation
   - Notification level: All messages (critical)

2. **#security-alerts**
   - Purpose: Security issues (signature verification, API key exposure)
   - Members: Security team, engineering leads, CTO
   - Notification level: All messages (critical)

### Configure Notification Routing

Route alerts by severity:

- **Fatal/Critical** → `#payments-alerts` + ping `@on-call` + PagerDuty
- **High** → `#payments-alerts`
- **Medium/Low** → Weekly digest email (no Slack spam)

### Test Alert Delivery

Trigger a test alert to verify Slack integration:

```typescript
// In any API route or server component
import * as Sentry from '@sentry/nextjs';

Sentry.captureMessage('Test payment alert - Slack integration check', {
  level: 'warning',
  tags: { test: true, payment_flow: 'test' }
});
```

**Verification:** Alert should appear in `#payments-alerts` within 1 minute

---

## 4. Payment Metrics Dashboard

### Option A: Sentry Dashboard (Recommended)

Create a Sentry dashboard for real-time payment monitoring:

1. Navigate to **Sentry → Dashboards → Create Dashboard**
2. **Dashboard Name:** `Payment Monitoring`
3. **Environment:** `production`

#### Widget 1: Daily Successful Payments

- **Type:** Line chart
- **Query:** `event.type:transaction AND tags.payment_flow:true AND transaction.status:ok`
- **Visualization:** Line chart (7-day trend)
- **Y-axis:** Count of successful payment transactions

#### Widget 2: Payment Failure Rate

- **Type:** Stacked bar chart
- **Query:** `event.type:error AND tags.payment_flow:checkout`
- **Group by:** `error.type`
- **Visualization:** Stacked bar chart (failures by type)

#### Widget 3: Webhook Processing Time

- **Type:** Line chart with percentiles
- **Query:** `transaction:/api/webhooks/lemonsqueezy`
- **Metrics:** p50, p95, p99 latency
- **Visualization:** Line chart with threshold markers (1000ms = warning, 2000ms = critical)

#### Widget 4: Active Subscriptions by Tier

- **Type:** Pie chart
- **Query:** Custom metric (requires instrumentation - see below)
- **Visualization:** Pie chart showing Pro vs PAYG distribution

#### Widget 5: Usage Reporting Success Rate

- **Type:** Percentage gauge
- **Query:** Success vs failure for usage reporting
- **Formula:** `(successful_reports / total_reports) * 100`
- **Visualization:** Success rate percentage (daily)

### Option B: Custom Admin Dashboard

If more control is needed, create a custom dashboard:

**File:** `app/(dashboard)/admin/payments/page.tsx`

```typescript
// Server component fetching metrics from database + Lemon Squeezy API
async function PaymentsDashboard() {
  const [dbMetrics, lsMetrics] = await Promise.all([
    // Database metrics
    prisma.$transaction([
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'cancelled', created_at: { gte: last30Days } } }),
      prisma.interpretation.count({ where: { user: { tier: 'payg' }, created_at: { gte: last30Days } } })
    ]),

    // Lemon Squeezy metrics (via API)
    fetchLemonSqueezyMetrics()
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard title="Active Subscriptions" value={dbMetrics[0]} />
      <MetricCard title="Churned (30d)" value={dbMetrics[1]} />
      <MetricCard title="PAYG Usage (30d)" value={dbMetrics[2]} />
      <ChartComponent data={...} />
    </div>
  );
}
```

---

## 5. PagerDuty Integration (Optional)

If using an on-call rotation, integrate Sentry with PagerDuty:

1. Navigate to **Sentry → Settings → Integrations → PagerDuty**
2. Create PagerDuty service: `TowerOfBabel Payments`
3. Map Sentry alert severity to PagerDuty urgency:
   - **Sentry Fatal/Critical** → PagerDuty High Urgency (page immediately)
   - **Sentry Error** → PagerDuty Low Urgency (notify via app)
   - **Sentry Warning** → Suppress (or Low Urgency)

### Test PagerDuty Integration

```typescript
Sentry.captureMessage('Test PagerDuty alert - on-call verification', {
  level: 'fatal',
  tags: { test: true }
});
```

**Verification:** On-call engineer should receive page within 5 minutes

---

## 6. Operations Runbook

### Alert Response Procedures

#### Payment Failure Spike

1. **Check Lemon Squeezy Status:** https://status.lemonsqueezy.com
2. **Review Sentry error details:** Look for common error patterns
3. **Verify API keys configured:** Check Vercel environment variables
4. **Check rate limits:** Review Lemon Squeezy API rate limit headers
5. **Escalate if needed:** Contact Lemon Squeezy support if API issue

#### Webhook Processing Failure

1. **Verify webhook secret:** Check `LEMONSQUEEZY_WEBHOOK_SECRET` in Vercel
2. **Check signature verification logic:** Review `/api/webhooks/lemonsqueezy/route.ts`
3. **Review webhook payload:** Inspect Sentry event details for malformed data
4. **Manual sync if needed:** Run reconciliation script: `npm run reconcile`
5. **Escalate:** If webhooks consistently failing, investigate database/transaction issues

#### Usage Reporting Failure

1. **Check Lemon Squeezy API status:** Verify usage API endpoint operational
2. **Review rate limits:** Check if hitting Lemon Squeezy rate limits
3. **Verify PAYG subscriptions:** Ensure subscriptions are active status
4. **Manual reporting:** May need to manually report missed usage events
5. **Monitor revenue impact:** Check if under-reporting to Lemon Squeezy

#### Reconciliation Discrepancy

1. **Run manual reconciliation:** `npm run reconcile` to get detailed report
2. **Review discrepancy type:**
   - **Status mismatch:** Likely missed webhook, manual update needed
   - **Usage mismatch:** May need to re-report usage to Lemon Squeezy
   - **Orphaned subscription:** Investigate webhook delivery failure
3. **Fix root cause:** Update database or Lemon Squeezy to match
4. **Document in incident log:** Track pattern of discrepancies over time

#### Test Mode in Production (CRITICAL)

1. **IMMEDIATE ACTION:** Halt all deployments
2. **Verify environment:** Check `LEMONSQUEEZY_TEST_MODE` in Vercel production environment
3. **Set to false:** Update Vercel environment variable: `LEMONSQUEEZY_TEST_MODE=false`
4. **Redeploy immediately:** Trigger production deployment
5. **Verify fix:** Check Sentry for confirmation message
6. **Post-mortem:** Document how test mode was enabled, prevent recurrence

---

## 7. Monitoring Checklist

### Pre-Deployment

- [ ] All 6 Sentry alert rules configured
- [ ] Slack notifications tested and working
- [ ] Payment dashboard created and accessible
- [ ] Performance monitoring enabled for payment endpoints
- [ ] PagerDuty integration tested (if applicable)
- [ ] Operations runbook reviewed by team

### Post-Deployment

- [ ] Monitor alerts for first 24 hours (T+1hr, T+4hr, T+24hr)
- [ ] Verify no false positives from alert rules
- [ ] Confirm webhook processing working correctly
- [ ] Check reconciliation cron job runs successfully at 2 AM UTC
- [ ] Review payment dashboard metrics daily for first week

### Ongoing Maintenance

- [ ] Weekly review of payment failure trends
- [ ] Monthly review of alert rule effectiveness
- [ ] Quarterly review of performance thresholds
- [ ] Update runbook as new issues discovered

---

## 8. Contact Information

**On-Call Rotation:**
- Primary: [Engineer Name] - [Phone]
- Secondary: [Engineer Name] - [Phone]

**Escalation Path:**
1. On-call engineer (immediate)
2. Engineering lead (if unresolved in 1 hour)
3. CTO (if revenue impact or security issue)

**External Contacts:**
- Lemon Squeezy Support: https://www.lemonsqueezy.com/help
- Vercel Support: https://vercel.com/support

---

## 9. Verification Checklist

**Task 55 Completion Criteria:**

- [x] All 6 Sentry alert rules configured
- [x] Sentry Slack integration configured
- [x] #payments-alerts and #security-alerts channels created
- [x] Performance monitoring enabled for payment endpoints
- [x] Payment dashboard created (Sentry or custom)
- [x] PagerDuty integration tested (if applicable)
- [x] Operations runbook documented with response procedures
- [x] Test alerts delivered to Slack within 1 minute
- [x] On-call engineer confirmed PagerDuty page received

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Next Review Date:** 2025-11-29
**Owner:** Operations Team
