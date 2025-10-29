# Payment Integration Production Readiness Checklist

**Story:** 3.4 - Lemon Squeezy Integration
**Created:** 2025-10-29
**Last Updated:** 2025-10-29

---

## Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] **Verify `LEMONSQUEEZY_TEST_MODE=false` in production**
  ```bash
  # In Vercel production environment variables
  LEMONSQUEEZY_TEST_MODE=false
  ```
  - ⚠️ **CRITICAL**: Test mode in production = zero revenue
  - Test command: `echo $LEMONSQUEEZY_TEST_MODE` should output `false`

- [ ] **Verify production API keys configured**
  ```bash
  # Required production environment variables
  LEMONSQUEEZY_API_KEY=<production_key>
  LEMONSQUEEZY_STORE_ID=<production_store_id>
  LEMONSQUEEZY_PRO_VARIANT_ID=<pro_variant_id>
  LEMONSQUEEZY_PAYG_VARIANT_ID=<payg_variant_id>
  LEMONSQUEEZY_WEBHOOK_SECRET=<production_webhook_secret>
  ```

- [ ] **Verify no test API keys in production**
  - Test: Search codebase for `_TEST` environment variables
  - Ensure no test keys accidentally deployed

- [ ] **Verify `NEXT_PUBLIC_URL` set to production domain**
  ```bash
  NEXT_PUBLIC_URL=https://towerofbabel.com
  ```
  - Used for checkout success/cancel redirects

### 2. Lemon Squeezy Configuration

- [ ] **Production store created in Lemon Squeezy**
  - Store name: "TowerOfBabel"
  - Mode: Production (not test mode)

- [ ] **Pro tier product configured**
  - Name: "TowerOfBabel Pro"
  - Price: $10/month
  - Billing: Monthly recurring
  - Variant ID matches `LEMONSQUEEZY_PRO_VARIANT_ID`

- [ ] **PAYG tier product configured**
  - Name: "TowerOfBabel Pay-As-You-Go"
  - Base price: $0/month
  - Usage unit: "interpretation"
  - Usage price: $0.50 per interpretation
  - Billing: Monthly
  - Variant ID matches `LEMONSQUEEZY_PAYG_VARIANT_ID`

- [ ] **Production webhook configured**
  - URL: `https://towerofbabel.com/api/webhooks/lemonsqueezy`
  - Events enabled:
    - `subscription_created`
    - `subscription_payment_success`
    - `subscription_cancelled`
    - `subscription_expired`
    - `usage_updated` (optional)
  - Signature secret matches `LEMONSQUEEZY_WEBHOOK_SECRET`

- [ ] **Webhook endpoint accessible from internet**
  - Test: `curl -X POST https://towerofbabel.com/api/webhooks/lemonsqueezy`
  - Should return 401 (missing signature), NOT 404

- [ ] **SSL certificate valid**
  - Check: `https://www.ssllabs.com/ssltest/analyze.html?d=towerofbabel.com`
  - Grade: A or better required

### 3. Database Readiness

- [ ] **Production database configured**
  - Prisma connection string set
  - Database accessible from Vercel

- [ ] **Database migrations applied**
  ```bash
  npx prisma db push --accept-data-loss=false
  npx prisma generate
  ```

- [ ] **Database tables verified**
  - `User` table with `lemonsqueezy_customer_id` field
  - `Subscription` table exists
  - `LemonSqueezyEvent` table exists (idempotency)
  - `Interpretation` table exists (for usage tracking)

- [ ] **Database indexes created**
  - `Subscription.lemonsqueezy_subscription_id` (unique)
  - `Subscription.user_id` (indexed)
  - `Subscription.status` (indexed)
  - `LemonSqueezyEvent.lemonsqueezy_event_id` (unique)

- [ ] **Database backup configured**
  - Automatic daily backups enabled
  - Backup retention: 7-30 days
  - Point-in-time recovery tested

### 4. Security Validation

- [ ] **Webhook signature verification tested**
  - Test: Send webhook with invalid signature → expect 401
  - Test: Send webhook with valid signature → expect 200

- [ ] **API key not exposed in logs**
  - Search Vercel logs for `LEMONSQUEEZY_API_KEY`
  - Should be fully redacted

- [ ] **API key not exposed in Sentry**
  - Trigger test error with config object
  - Verify API key scrubbed in Sentry report

- [ ] **SQL injection tests passing**
  - Run: `npm test tests/security/sql-injection-webhooks.test.ts`
  - All tests must pass

- [ ] **Authentication tests passing**
  - Run: `npm test tests/security/api/payment-authorization.test.ts`
  - Verify unauthenticated users cannot access checkout

### 5. Functional Testing in Production

⚠️ **WARNING**: These tests involve real money. Use small amounts and refund immediately.

- [ ] **Test Pro checkout flow with real card**
  - Use personal card or test card in production mode
  - Amount: $10 (one month)
  - Steps:
    1. Create test user account
    2. Click "Subscribe to Pro"
    3. Complete Lemon Squeezy checkout
    4. Verify redirect to success page
    5. Verify user tier upgraded to 'pro' in database
    6. Verify usage counter reset to 0
    7. **IMMEDIATELY REFUND** via Lemon Squeezy dashboard

- [ ] **Test PAYG activation**
  - Create test user account
  - Click "Start Pay-As-You-Go"
  - Verify tier updated to 'payg' immediately
  - Verify no payment required
  - Submit 1-2 interpretations
  - Verify usage reported to Lemon Squeezy
  - **CANCEL SUBSCRIPTION** via Lemon Squeezy dashboard

- [ ] **Test webhook delivery**
  - After Pro checkout, check Lemon Squeezy webhook logs
  - Verify `subscription_created` webhook delivered
  - Status: 200 OK
  - Response time: < 2 seconds

- [ ] **Test subscription cancellation**
  - Cancel test Pro subscription in Lemon Squeezy
  - Verify `subscription_cancelled` webhook received
  - Verify user downgraded to 'trial' in database
  - Verify subscription status = 'cancelled'

### 6. Monitoring and Alerting

- [ ] **Sentry error tracking configured**
  - Production DSN set
  - Error sampling: 100% (for payment errors)
  - Performance sampling: 10%

- [ ] **Sentry alert rules created**
  - Alert 1: Payment failure rate >10% (5 min window)
  - Alert 2: Webhook processing failure >5 errors (10 min)
  - Alert 3: Test mode detected in production (immediate)
  - Alert 4: Usage reporting failure >5% (10 min)

- [ ] **Slack notifications configured**
  - Channel: #payments-alerts
  - Severity: High and Critical only
  - Test: Trigger test alert, verify Slack notification

- [ ] **Logging configured**
  - Payment events logged to Vercel logs
  - Webhook events logged with structured data
  - Log retention: 30 days minimum

### 7. Test Suite Validation

- [ ] **All tests passing**
  ```bash
  npm test
  ```
  - Minimum pass rate: 90%
  - Critical tests (security, financial integrity): 100%

- [ ] **Security tests passing**
  ```bash
  npm test tests/security/
  ```
  - All security tests must pass

- [ ] **Integration tests passing**
  ```bash
  npm test tests/integration/
  ```
  - Webhook tests: 100% pass
  - Payment flow tests: 100% pass

### 8. Documentation

- [ ] **Environment variable documentation updated**
  - `.env.local.example` accurate
  - `README.md` includes setup instructions

- [ ] **Deployment runbook created**
  - Location: `docs/operations/deployment-checklist.md`
  - Includes rollback plan

- [ ] **Incident response plan documented**
  - What to do if payment failures spike
  - Who to contact for Lemon Squeezy issues
  - Emergency contact: Lemon Squeezy support

### 9. Performance Validation

- [ ] **Checkout endpoint performance**
  - Test: 100 requests to `/api/checkout/pro`
  - p95 latency: < 500ms
  - Error rate: < 1%

- [ ] **Webhook endpoint performance**
  - Test: 50 webhook requests in 1 minute
  - p95 latency: < 1000ms
  - No 503 errors (queue full)

- [ ] **Database query performance**
  - Subscription lookup: < 50ms
  - User tier update: < 100ms
  - Transaction commit: < 200ms

### 10. Compliance and Legal

- [ ] **PCI compliance checklist completed**
  - Using Lemon Squeezy hosted checkout (PCI compliant)
  - No credit card data stored in TowerOfBabel database
  - All card data handled by Lemon Squeezy

- [ ] **Terms of Service updated**
  - Includes subscription terms
  - Cancellation policy documented
  - Refund policy documented

- [ ] **Privacy Policy updated**
  - Payment data processing disclosed
  - Lemon Squeezy as payment processor mentioned
  - Data retention policy for billing data

- [ ] **VAT/Tax collection configured**
  - Lemon Squeezy handles VAT collection
  - Tax settings verified in Lemon Squeezy dashboard

---

## Deployment Day Checklist

### Pre-Deployment (T-1 hour)

- [ ] **Final test run in staging**
  - All tests passing
  - Manual test with real card in test mode

- [ ] **Team notification**
  - Notify team of deployment window
  - Ensure on-call engineer available

- [ ] **Backup database**
  - Manual snapshot before deployment
  - Verify snapshot created successfully

### Deployment (T-0)

- [ ] **Deploy to production**
  - Vercel deployment triggered
  - Build successful
  - Environment variables verified

- [ ] **Run post-deployment validation script**
  ```bash
  ./scripts/validate-production-config.sh
  ```
  - All checks pass

- [ ] **Verify application accessible**
  - Test: Open https://towerofbabel.com
  - Verify homepage loads

### Post-Deployment (T+15 min)

- [ ] **Smoke test critical paths**
  - Test: User signup → trial account created
  - Test: Dashboard loads for trial user
  - Test: "Subscribe to Pro" button loads checkout

- [ ] **Monitor error rates**
  - Sentry dashboard: 0 new errors in 15 minutes
  - Vercel logs: No 500 errors

- [ ] **Test one real transaction**
  - Use personal card
  - Complete Pro checkout ($10)
  - Verify success
  - **IMMEDIATELY REFUND**

### Post-Deployment (T+1 hour)

- [ ] **Monitor webhook delivery**
  - Lemon Squeezy webhook logs: All 200 OK
  - No retry attempts

- [ ] **Verify database integrity**
  - Query: Check for orphaned subscriptions
  - Query: Check user tier consistency

### Post-Deployment (T+24 hours)

- [ ] **Review error logs**
  - Sentry: Any payment-related errors?
  - Vercel: Any webhook failures?

- [ ] **Review metrics**
  - Checkout conversion rate: > 0%
  - Webhook success rate: > 99%
  - Average checkout time: < 2 minutes

- [ ] **Customer feedback**
  - Any support tickets about payments?
  - Any failed payment reports?

---

## Rollback Plan

### When to Rollback

Immediately rollback if:
- Payment failure rate > 50%
- Webhook processing completely broken
- Database corruption detected
- Security vulnerability discovered

### Rollback Steps

1. **Revert Vercel deployment**
   ```bash
   vercel rollback <previous-deployment-url>
   ```

2. **Disable Lemon Squeezy webhook** (temporary)
   - Lemon Squeezy dashboard → Webhooks → Disable

3. **Communicate to users**
   - Post notice: "Payment processing temporarily unavailable"
   - Provide timeline for resolution

4. **Fix and redeploy**
   - Fix issue in code
   - Test in staging
   - Redeploy to production
   - Re-enable webhook

---

## Emergency Contacts

- **Lemon Squeezy Support**: support@lemonsqueezy.com
- **Vercel Support**: support@vercel.com (for hosting issues)
- **Team On-Call**: [Your on-call schedule]
- **Tech Lead**: [Name/Contact]

---

## Notes

- **Last Production Test**: [Date]
- **Last Successful Deployment**: [Date]
- **Known Issues**: [Any known issues]
- **Planned Maintenance**: [Any planned downtime]

---

**Approval Signatures**:

- [ ] Tech Lead: _____________________ Date: _______
- [ ] QA Lead: _____________________ Date: _______
- [ ] Product Owner: _____________________ Date: _______

---

**Deployment Approved**: ☐ Yes ☐ No
**Production Deployment Date**: ___________________
