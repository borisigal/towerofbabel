# TowerOfBabel - Early Test Strategy
## Architecture High-Risk Areas

**Project:** TowerOfBabel - Cross-Cultural Communication Interpretation Tool
**Version:** 1.0
**Date:** 2025-10-06
**QA Architect:** Quinn
**Purpose:** Early validation of critical architectural risks before Epic 1 completion

---

## Executive Summary

This early test strategy identifies **7 critical high-risk architectural areas** requiring proactive testing before full development. These areas threaten the project's 2-3 week timeline, 80% gross margin goal, and core privacy commitments.

**Strategic Approach:** Risk-based testing with focus on **technical debt prevention**, **cost protection**, and **privacy compliance** from Day 1.

**Success Criteria:**
- All CRITICAL risks validated before Epic 2 begins
- Cost circuit breaker prevents runaway LLM expenses
- Authentication flow prevents JWT session delay bug
- Database connection pooling prevents serverless exhaustion

---

## High-Risk Areas Identified

### 🔴 RISK 1: Supabase Auth JWT Session Delay (Payment Flow Breaking)

**Severity:** CRITICAL
**Impact:** Users pay for Pro but remain blocked due to cached trial tier in JWT
**Probability:** HIGH (95% without mitigation)
**Timeline Impact:** 2-3 days of debugging if not caught early

#### Architecture Context
- **Pattern:** Database-as-source-of-truth for tier/usage (NOT JWT metadata)
- **Critical Files:**
  - `/lib/auth/middleware.ts`
  - `/app/api/interpret/route.ts`
  - All API routes checking tier/usage

#### Test Scenarios

**Scenario 1.1: Trial User Pays → Immediate Access**
```gherkin
Given a trial user with 10/10 messages used
When they complete Stripe checkout for Pro subscription
And the webhook updates database tier="pro" and messages_used_count=0
And they refresh the dashboard page
Then they should see "Pro: 0/100 messages used" (from DATABASE)
And they should be able to submit interpretation immediately
And the interpretation should succeed without 403 error
```

**Scenario 1.2: JWT Token Has Stale Trial Metadata**
```gherkin
Given a user's JWT contains app_metadata.tier="trial"
And the database shows tier="pro" (recently updated via webhook)
When the API route /api/interpret is called
Then the route MUST query database for tier (NOT read JWT metadata)
And the interpretation should proceed successfully
```

**Scenario 1.3: ESLint Rule Prevents JWT Metadata Access**
```gherkin
Given the ESLint configuration includes no-restricted-properties rule
When code contains `user.app_metadata.tier`
Then ESLint should throw error: "NEVER use user.app_metadata for tier/usage"
And the build should fail
```

#### Test Implementation Priority
- **Epic 1 Story 1.4:** Unit tests for authentication pattern
- **Epic 1 Story 1.5:** Integration test for payment→interpretation flow
- **Epic 3 Story 3.4:** End-to-end Stripe webhook → dashboard refresh test

#### Success Metrics
- ✅ 100% of API routes query database for tier/usage
- ✅ 0 occurrences of `user.app_metadata.tier` in codebase (enforced by ESLint)
- ✅ Payment→interpretation flow completes in <60 seconds

---

### 🔴 RISK 2: PostgreSQL Connection Pool Exhaustion (Serverless Overload)

**Severity:** CRITICAL
**Impact:** Complete service outage under load (500+ concurrent users)
**Probability:** MEDIUM (60% at scale without mitigation)
**Timeline Impact:** 1-2 days downtime + emergency fixes

#### Architecture Context
- **Pattern:** Prisma singleton + PgBouncer connection pooling
- **Limits:** Supabase free tier = 60 connections
- **Critical Files:**
  - `/lib/db/prisma.ts` (singleton pattern)
  - `/lib/db/connectionMonitor.ts` (circuit breaker)
  - All API routes using Prisma

#### Test Scenarios

**Scenario 2.1: Concurrent Requests Don't Leak Connections**
```gherkin
Given Prisma client configured with connection_limit=1
When 100 concurrent API requests are made to /api/interpret
Then each request should acquire and release connection properly
And total active connections should not exceed 10
And no "too many connections" errors should occur
```

**Scenario 2.2: Connection Circuit Breaker Opens on Pool Exhaustion**
```gherkin
Given the connection pool is exhausted (60/60 connections active)
When 5 consecutive requests fail with "too many connections" error
Then the connection circuit breaker should open
And subsequent requests should fail fast with 503 status
And error should be logged to Sentry with alert
```

**Scenario 2.3: Query Optimization Uses Explicit Select**
```gherkin
Given an API route needs user tier and usage data
When the route calls prisma.user.findUnique()
Then the query MUST use explicit select: { tier: true, messages_used_count: true }
And the query should NOT fetch unnecessary columns (name, email, etc.)
And query execution time should be <50ms
```

#### Test Implementation Priority
- **Epic 1 Story 1.3:** Load test with 100 concurrent requests
- **Epic 1 Story 1.3:** Circuit breaker unit tests
- **Epic 2 Story 2.3:** Query optimization validation

#### Success Metrics
- ✅ <10 active connections under 100 concurrent requests
- ✅ Circuit breaker opens within 10 seconds of pool exhaustion
- ✅ All queries use explicit `select` clauses (0 violations)

---

### 🔴 RISK 3: LLM API Cost Spike (Margin Destruction)

**Severity:** CRITICAL
**Impact:** $200+ loss in single day destroys 80% margin goal
**Probability:** HIGH (80% without mitigation)
**Timeline Impact:** Financial loss + emergency cost controls

#### Architecture Context
- **Pattern:** 3-layer cost circuit breaker (daily/hourly/per-user limits)
- **Technology:** Vercel KV (Redis) for distributed cost tracking
- **Critical Files:**
  - `/lib/llm/costCircuitBreaker.ts`
  - `/app/api/interpret/route.ts`
  - `/app/api/admin/cost-metrics/route.ts`

#### Test Scenarios

**Scenario 3.1: Daily Cost Limit Prevents Budget Overrun**
```gherkin
Given the daily cost limit is $50
And current daily cost is $49.80 (tracked in Redis)
When a user submits interpretation costing $0.50
Then checkCostBudget() should return { allowed: false, layer: "daily" }
And the API should return 503 "Service overloaded"
And the user's quota should NOT be consumed
And Sentry alert should fire: "Daily cost limit approaching"
```

**Scenario 3.2: Per-User Limit Prevents Single User Abuse**
```gherkin
Given per-user daily limit is $1.00
And user has consumed $0.98 today (49 interpretations)
When user submits 50th interpretation costing $0.02
Then checkCostBudget() should return { allowed: true }
When user submits 51st interpretation costing $0.02
Then checkCostBudget() should return { allowed: false, layer: "user" }
And interpretation should be blocked
```

**Scenario 3.3: Cost Tracking Persists Across Serverless Functions**
```gherkin
Given interpretation A costs $0.015 on serverless instance 1
And interpretation B costs $0.020 on serverless instance 2
When both complete within same hour
Then hourly cost counter should show $0.035
And both function instances should read same Redis counter
```

**Scenario 3.4: Cost Circuit Breaker Fails Open (Redis Unavailable)**
```gherkin
Given Vercel KV (Redis) is unavailable
When checkCostBudget() is called
Then it should fail open and allow interpretation
And warning should be logged: "Cost circuit breaker unavailable"
And Sentry alert should fire
```

#### Test Implementation Priority
- **Epic 1 Story 1.5:** All cost circuit breaker scenarios (BEFORE Epic 2)
- **Epic 2 Story 2.3:** Integration with interpretation API
- **Epic 3 Story 3.1:** Load test with simulated attack

#### Success Metrics
- ✅ Daily limit blocks requests at $49.90+ (within $0.10 accuracy)
- ✅ Hourly limit blocks requests at $4.90+ (within $0.10 accuracy)
- ✅ Per-user limit blocks at $0.99+ (within $0.01 accuracy)
- ✅ Circuit breaker fails open if Redis unavailable (0 user impact)

---

### 🟡 RISK 4: LLM Provider API Integration (Response Parsing Failures)

**Severity:** HIGH
**Impact:** 20-30% interpretation failures due to malformed responses
**Probability:** MEDIUM (50% with complex JSON parsing)
**Timeline Impact:** 1 day debugging edge cases

#### Architecture Context
- **Pattern:** Provider adapter with structured JSON response parsing
- **Providers:** OpenAI, Anthropic, xAI, Google (1 selected Week 1)
- **Critical Files:**
  - `/lib/llm/providers/openai.ts`
  - `/lib/llm/providers/anthropic.ts`
  - `/lib/llm/prompts.ts`
  - `/lib/llm/retryLogic.ts`

#### Test Scenarios

**Scenario 4.1: Well-Formed JSON Response Parses Successfully**
```gherkin
Given LLM returns valid JSON:
{
  "bottomLine": "They're saying no politely",
  "culturalContext": "German directness...",
  "emotions": [
    {"name": "Politeness", "senderScore": 7, "receiverScore": 4}
  ]
}
When parseInterpretationResponse() is called
Then it should return structured InterpretationResult
And emotions array should contain 3 items
And all scores should be 0-10 range
```

**Scenario 4.2: Malformed JSON Triggers Retry**
```gherkin
Given LLM returns malformed JSON on attempt 1
And valid JSON on attempt 2
When interpretMessage() is called
Then it should retry with exponential backoff (1s delay)
And second attempt should succeed
And user quota should only be consumed once (on success)
And cost should be tracked for successful call only
```

**Scenario 4.3: Missing Required Fields Default Gracefully**
```gherkin
Given LLM returns JSON missing "emotions" array
When parseInterpretationResponse() is called
Then it should default to empty emotions array
And display should show "No emotions detected"
And interpretation should still succeed (not fail completely)
```

**Scenario 4.4: Response Time Exceeds 10 Seconds**
```gherkin
Given LLM API call takes >10 seconds
When interpretMessage() is called
Then it should timeout and throw error
And user quota should NOT be consumed (per FR19)
And user should see "Retry" option
```

#### Test Implementation Priority
- **Epic 2 Story 2.2:** Unit tests for all parsing scenarios
- **Epic 2 Story 2.3:** Integration tests with mock LLM responses
- **Week 1 Benchmark:** Live API testing with all 4 providers

#### Success Metrics
- ✅ 95%+ successful parse rate on valid responses
- ✅ 99%+ success rate with 3 retries (exponential backoff)
- ✅ 0 failures on well-formed JSON responses

---

### 🟡 RISK 5: Stripe Webhook Idempotency (Duplicate Processing)

**Severity:** HIGH
**Impact:** Double-crediting users or double-charging
**Probability:** MEDIUM (40% without idempotency check)
**Timeline Impact:** Financial reconciliation + user support

#### Architecture Context
- **Pattern:** StripeEvent table for idempotency tracking
- **Events:** checkout.session.completed, invoice.payment_succeeded, subscription.deleted
- **Critical Files:**
  - `/app/api/webhooks/stripe/route.ts`
  - `/lib/stripe/webhookHandlers/*.ts`

#### Test Scenarios

**Scenario 5.1: Duplicate Webhook Ignored (Idempotency)**
```gherkin
Given webhook event "evt_123" was processed successfully
And StripeEvent table contains record for "evt_123"
When Stripe retries webhook with same "evt_123"
Then webhook handler should detect duplicate
And handler should return 200 OK without processing
And user tier should NOT be updated again
And messages_used_count should NOT be reset again
```

**Scenario 5.2: Concurrent Webhook Processing (Race Condition)**
```gherkin
Given webhook event "evt_456" arrives twice simultaneously
When both webhook handlers check StripeEvent table
Then only ONE handler should insert StripeEvent record
And only ONE handler should update user tier
And database transaction should prevent race condition
```

**Scenario 5.3: Webhook Signature Verification Fails**
```gherkin
Given webhook request has invalid signature
When webhook handler validates signature
Then it should return 400 Bad Request
And it should NOT process event
And it should log security alert to Sentry
```

#### Test Implementation Priority
- **Epic 3 Story 3.4:** All webhook idempotency tests
- **Epic 3 Story 3.5:** Integration test with Stripe test mode

#### Success Metrics
- ✅ 100% duplicate detection rate (0 double-processing)
- ✅ 0 race conditions under concurrent webhooks
- ✅ 100% invalid signature rejection rate

---

### 🟡 RISK 6: Usage Tracking Race Conditions (Tier Enforcement)

**Severity:** HIGH
**Impact:** Users exceed limits or quota counted incorrectly
**Probability:** MEDIUM (35% under concurrent requests)
**Timeline Impact:** User support + manual quota corrections

#### Architecture Context
- **Pattern:** Database-based usage tracking with optimistic locking
- **Critical Operations:** Increment messages_used_count, reset on billing cycle
- **Critical Files:**
  - `/lib/services/usageService.ts`
  - `/app/api/interpret/route.ts`

#### Test Scenarios

**Scenario 6.1: Concurrent Interpretations Don't Exceed Limit**
```gherkin
Given trial user has 9/10 messages used
When user submits 2 interpretations simultaneously
Then only ONE should succeed
And messages_used_count should become 10 (not 11)
And second request should return 403 Limit Exceeded
```

**Scenario 6.2: Pro Tier Monthly Reset Occurs Correctly**
```gherkin
Given Pro user with current_period_end = "2025-11-01T00:00:00Z"
And messages_used_count = 87
When monthly reset job runs at period end
Then messages_used_count should reset to 0
And current_period_end should update to "2025-12-01T00:00:00Z"
And user can interpret immediately after reset
```

**Scenario 6.3: Trial Expiration By Time (14 Days)**
```gherkin
Given trial user with trial_start_date = "2025-10-01"
And today is "2025-10-16" (15 days elapsed)
And user has only used 3/10 messages
When user attempts interpretation
Then request should be blocked with "Trial expired"
And user should see upgrade modal
```

#### Test Implementation Priority
- **Epic 3 Story 3.1:** All usage tracking scenarios
- **Epic 3 Story 3.2:** Concurrent request simulation

#### Success Metrics
- ✅ 100% limit enforcement accuracy (no over-quota usage)
- ✅ 0 race conditions under 10 concurrent requests
- ✅ Monthly reset completes within 1 minute of billing cycle

---

### 🟢 RISK 7: Privacy Compliance (Message Content Leakage)

**Severity:** MEDIUM
**Impact:** Privacy policy violation + user trust loss
**Probability:** LOW (15% with schema enforcement)
**Timeline Impact:** Legal review + emergency data deletion

#### Architecture Context
- **Pattern:** Metadata-only storage (NO message content columns in schema)
- **Enforcement:** Database schema constraints, no message fields
- **Critical Files:**
  - `/prisma/schema.prisma`
  - `/app/api/interpret/route.ts`
  - All database models

#### Test Scenarios

**Scenario 7.1: Interpretation API Never Stores Message Content**
```gherkin
Given user submits interpretation with message: "Sensitive business data..."
When API processes and stores metadata
Then database should contain:
  - user_id
  - timestamp
  - culture_sender, culture_receiver
  - character_count (NOT message text)
  - feedback
And database should NOT contain message content
And Prisma schema should have no "message" or "content" columns
```

**Scenario 7.2: User Data Deletion Removes All Metadata**
```gherkin
Given user has 50 interpretation records
When user clicks "Delete My Account & Data"
Then all Interpretation records should be deleted
And User record should be deleted
And Subscription record should be deleted
And database should return 0 results for user_id
```

**Scenario 7.3: Privacy Badge Displays Current LLM Provider**
```gherkin
Given LLM_PROVIDER environment variable = "openai"
When user views landing page
Then privacy badge should display "Processed by OpenAI"
And badge should link to OpenAI privacy policy
```

#### Test Implementation Priority
- **Epic 1 Story 1.3:** Schema validation (no message content columns)
- **Epic 5 Story 5.2:** Data deletion integration test
- **Epic 5 Story 5.1:** Privacy badge display test

#### Success Metrics
- ✅ 0 message content in database (verified via schema)
- ✅ 100% data deletion success rate (no orphaned records)
- ✅ Privacy badge accurate on 100% of page loads

---

## Test Execution Strategy

### Phase 1: Foundation Validation (Epic 1 - Week 1)
**Priority:** CRITICAL risks only (1, 2, 3)

| Test Area | Epic 1 Story | Test Type | Priority |
|-----------|--------------|-----------|----------|
| JWT Session Delay | 1.4, 1.5 | Integration | P0 |
| Connection Pooling | 1.3 | Load Test | P0 |
| Cost Circuit Breaker | 1.5 | Unit + Integration | P0 |
| Privacy Schema | 1.3 | Schema Validation | P1 |

**Exit Criteria:**
- ✅ Payment→interpretation flow passes
- ✅ 100 concurrent requests succeed
- ✅ Cost limits enforced correctly
- ✅ No message content columns exist

---

### Phase 2: LLM Integration Validation (Epic 2 - Week 2)
**Priority:** HIGH risks (4)

| Test Area | Epic 2 Story | Test Type | Priority |
|-----------|--------------|-----------|----------|
| LLM Response Parsing | 2.2, 2.3 | Unit + Mock API | P0 |
| Retry Logic | 2.2 | Integration | P1 |
| Timeout Handling | 2.3 | Integration | P1 |

**Exit Criteria:**
- ✅ 95%+ parse success rate
- ✅ 99%+ success with retries
- ✅ Timeout <10s enforced

---

### Phase 3: Payment & Usage Validation (Epic 3 - Week 2-3)
**Priority:** HIGH risks (5, 6)

| Test Area | Epic 3 Story | Test Type | Priority |
|-----------|--------------|-----------|----------|
| Webhook Idempotency | 3.4 | Integration | P0 |
| Usage Race Conditions | 3.1 | Concurrent Test | P0 |
| Monthly Reset | 3.1 | Scheduled Job Test | P1 |

**Exit Criteria:**
- ✅ 100% duplicate detection
- ✅ 0 over-quota usage
- ✅ Reset completes correctly

---

### Phase 4: Privacy & Launch (Epic 5 - Week 3)
**Priority:** MEDIUM risks (7)

| Test Area | Epic 5 Story | Test Type | Priority |
|-----------|--------------|-----------|----------|
| Data Deletion | 5.2 | Integration | P0 |
| Privacy Badge | 5.1 | Visual Test | P2 |

**Exit Criteria:**
- ✅ 100% deletion success
- ✅ Privacy badge accurate

---

## Critical Test Data Requirements

### Test Accounts
```yaml
trial_user_new:
  tier: trial
  messages_used_count: 0
  trial_start_date: today

trial_user_at_limit:
  tier: trial
  messages_used_count: 10
  trial_start_date: 14 days ago

pro_user_active:
  tier: pro
  messages_used_count: 47
  current_period_end: 7 days from now
  stripe_subscription_id: sub_test_123

pro_user_at_limit:
  tier: pro
  messages_used_count: 100
  current_period_end: tomorrow

payg_user:
  tier: payg
  messages_used_count: 0
  stripe_customer_id: cus_test_456
```

### Mock LLM Responses
```json
{
  "valid_response": {
    "bottomLine": "They're saying no politely",
    "culturalContext": "German business culture...",
    "emotions": [
      {"name": "Politeness", "senderScore": 7, "receiverScore": 4},
      {"name": "Professionalism", "senderScore": 8, "receiverScore": 8},
      {"name": "Directness", "senderScore": 6, "receiverScore": 3}
    ]
  },
  "malformed_response": "{bottomLine: 'Missing quotes'",
  "timeout_response": "<no response after 11 seconds>"
}
```

---

## Success Metrics Dashboard

### Weekly Tracking (During Development)

| Metric | Target | Week 1 | Week 2 | Week 3 |
|--------|--------|--------|--------|--------|
| CRITICAL Risks Validated | 100% | 70% | 100% | 100% |
| HIGH Risks Validated | 100% | 30% | 80% | 100% |
| Payment Flow Success Rate | 100% | - | 95% | 100% |
| Cost Circuit Breaker Accuracy | 100% | 98% | 100% | 100% |
| Connection Pool Health | <10 active | 8 | 7 | 6 |
| Privacy Violations | 0 | 0 | 0 | 0 |

---

## Conclusion

This early test strategy focuses on **preventing catastrophic failures** rather than comprehensive coverage. By validating CRITICAL risks in Epic 1, we protect:

1. **Timeline:** No 2-3 day debugging sessions for JWT/connection issues
2. **Margin:** No $200+ cost spikes destroying 80% margin goal
3. **Trust:** No privacy violations breaking user confidence
4. **Launch:** No critical bugs blocking production deployment

**Recommendation:** Execute Phase 1 tests BEFORE starting Epic 2. The 1-2 day investment in early testing prevents 5-10 days of emergency fixes later.

---

*Generated by Quinn (Test Architect) 🧪 using BMAD™ Core framework*
*Risk-based testing strategy aligned with architecture critical mitigations*
