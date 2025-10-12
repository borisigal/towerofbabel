# Epic 3: Usage Tracking & Pricing Tiers

**Expanded Goal:** Build complete usage tracking system, enforce pricing tier limits (trial: 10 messages/14 days, pay-as-you-go: $0.50/message, Pro: TBD messages/month), integrate Stripe for subscription and metered billing, display usage indicators in UI, and implement limit notification and upgrade modals to enable monetization and validate unit economics.

---

## Story 3.1: Implement Usage Limit Enforcement Logic

**As a** user,
**I want** my interpretation usage tracked and limits enforced based on my tier,
**so that** I understand my usage and am prompted to upgrade when limits are reached.

### Acceptance Criteria

1. Trial tier enforcement: Block interpretations when messages_used_count ≥10 OR 14 days elapsed since account creation
2. Pro tier enforcement: Block interpretations when messages_used_count ≥ configured limit (TBD)
3. Pay-as-you-go tier: No limit enforcement (will charge per use via Stripe)
4. API route /api/interpret checks tier and limits before processing LLM call
5. Limit exceeded error returns 403 status with message: `{"error": "limit_exceeded", "tier": "trial", "messages_used": 10}`
6. Usage counter reset logic: Pro tier resets messages_used_count to 0 when current_period_end reached (monthly billing cycle)
7. Trial tier does NOT reset (one-time 10 message limit)
8. Database field messages_reset_date tracks next reset date for Pro users
9. Background job or API endpoint handles monthly usage resets (cron job or Vercel cron)
10. Unit tests for limit checking logic across all tiers

---

## Story 3.2: Display Usage Indicator and Approaching-Limit Notifications

**As a** user,
**I want** to see my current usage and be notified when approaching my limit,
**so that** I can decide whether to upgrade before being blocked.

### Acceptance Criteria

1. Usage indicator displayed in dashboard header/nav: "7/10 messages used" (for trial/Pro users)
2. Pay-as-you-go users see: "Pay-as-you-go: $0.50 per interpretation"
3. Usage indicator updates in real-time after each interpretation
4. Approaching-limit notification displayed when trial user reaches 8/10 messages:
   - In-app banner or toast: "You've used 8 of 10 trial messages. Upgrade to Pro or use Pay-As-You-Go after trial ends."
5. Approaching-limit notification displayed when Pro user reaches 80% of monthly limit
6. Notification includes link to upgrade modal or pricing page
7. Notification dismissible but reappears on next page load until limit issue resolved
8. Usage indicator color-coded: green (< 50% used), yellow (50-80% used), red (>80% used)
9. Usage indicator responsive (shows abbreviated version on mobile: "7/10")
10. Fetches latest usage count from database on page load

---

## Story 3.3: Create Upgrade Modal with Pricing Tiers

**As a** user,
**I want** to see pricing options when I hit my limit,
**so that** I can choose to subscribe to Pro or pay-per-use to continue using the service.

### Acceptance Criteria

1. Upgrade modal triggered when limit exceeded (displayed automatically on interpretation attempt)
2. Modal displays three pricing options:
   - **Free Trial:** "14 days, 10 messages (expired or used up)"
   - **Pay-As-You-Go:** "$0.50 per interpretation" with "Buy 1 Interpretation" CTA button
   - **Pro:** "$10/month for [TBD] messages" with "Subscribe to Pro" CTA button (primary recommendation)
3. Modal includes brief value proposition: "Continue interpreting cross-cultural messages with unlimited confidence"
4. "Subscribe to Pro" button redirects to Stripe Checkout (Story 3.4)
5. "Buy 1 Interpretation" button redirects to Stripe Payment Link for one-time $0.50 charge
6. Modal dismissible with "Maybe later" or close button (but user still can't interpret until upgraded)
7. Modal also accessible from navigation menu ("Upgrade" link) for proactive upgrades
8. Modal responsive (readable on mobile, tablet, desktop)
9. Copy emphasizes speed and accuracy value prop vs. free ChatGPT
10. TBD message limit shown as placeholder "[X]" until Week 1 benchmarking determines value

---

## Story 3.4: Integrate Stripe for Subscriptions and Pay-As-You-Go

**As a** user,
**I want** to subscribe to Pro tier or pay per interpretation,
**so that** I can continue using TowerOfBabel after my trial ends.

### Acceptance Criteria

1. Stripe account created and configured (test mode and production mode)
2. Stripe Product created for Pro tier: "$10/month recurring subscription"
3. Stripe Price created for pay-as-you-go: "$0.50 per interpretation" (metered billing)
4. Stripe Checkout session created when user clicks "Subscribe to Pro"
5. Checkout session redirects to Stripe hosted page, then back to success URL after payment
6. Stripe Payment Link created for one-time $0.50 interpretation purchase
7. Webhook endpoint created at /api/webhooks/stripe to handle events:
   - `checkout.session.completed`: Create/update subscription in database
   - `invoice.payment_succeeded`: Reset usage counter for Pro users
   - `customer.subscription.deleted`: Downgrade user to pay-as-you-go tier
8. User's stripe_customer_id stored in database on first payment
9. Subscription record created/updated with stripe_subscription_id, status, current_period_end
10. Successful payment updates user tier to "pro" and resets messages_used_count to 0
11. Webhook signature verification implemented (prevent fraudulent requests)
12. Stripe integration tested in test mode with test cards
13. Error handling for failed payments displays user-friendly message

---

## Story 3.5: Implement Billing Portal and Subscription Management

**As a** user,
**I want** to view my billing history and cancel my subscription,
**so that** I have control over my payment settings.

### Acceptance Criteria

1. "Manage Billing" link added to account settings page
2. Link redirects to Stripe Customer Portal (hosted by Stripe)
3. Customer Portal allows users to:
   - View billing history and invoices
   - Update payment method
   - Cancel subscription
   - Download receipts
4. Customer Portal session created via Stripe API when user clicks "Manage Billing"
5. Return URL configured to redirect back to TowerOfBabel dashboard after portal session
6. Subscription cancellation handled via webhook (customer.subscription.deleted)
7. Canceled users downgraded to pay-as-you-go tier (not blocked, just charged per use)
8. Cancellation confirmation displayed in dashboard after webhook processed
9. Stripe Customer Portal branding configured with TowerOfBabel logo/colors
10. Non-paying users (still on trial) see message: "No billing information yet. Upgrade to Pro to manage billing."

---
