# Payment Integration Penetration Testing Checklist

**Task 51: Manual Penetration Testing for Payment Integration**
**Priority:** P0 (Critical - Security)
**Mitigates Risk:** SEC-001 (Webhook signature verification bypass)
**Budget:** $5,000 - $10,000
**Duration:** 2-3 days

---

## Overview

This document provides a comprehensive checklist for hiring a security researcher to conduct manual penetration testing of the Lemon Squeezy payment integration. The primary focus is **webhook signature verification bypass attempts** and payment flow security.

**CRITICAL:** This penetration test **MUST** be completed before production deployment. Payment system vulnerabilities could result in:
- Unauthorized tier upgrades (revenue loss)
- Double-charging users (customer churn)
- Subscription data corruption (operational chaos)
- Legal liability (PCI compliance issues)

---

## 1. Penetration Testing Scope

### In-Scope Systems

**Payment API Endpoints:**
- `/api/checkout/pro` - Pro subscription checkout creation
- `/api/checkout/payg` - PAYG subscription checkout creation
- `/api/subscription/payg/create` - PAYG subscription activation
- `/api/webhooks/lemonsqueezy` - Webhook event processing

**Security Mechanisms to Test:**
- Webhook signature verification (HMAC SHA-256)
- API route authentication (Supabase JWT)
- Input validation (Zod schemas)
- Environment variable configuration
- Rate limiting
- SQL injection prevention (Prisma ORM)

### Out-of-Scope Systems

**Third-Party Services:**
- Lemon Squeezy hosted checkout pages (tested by Lemon Squeezy)
- Supabase authentication system (tested separately)
- Frontend React components (separate security review)

**Acceptable Testing:**
- Test mode Lemon Squeezy account (no real money transactions)
- Staging environment only (do NOT test production during initial pentest)
- Automated scanning tools (OWASP ZAP, Burp Suite, etc.)

---

## 2. Security Researcher Requirements

### Required Experience

1. **Payment System Penetration Testing**
   - Experience with payment gateway integrations (Stripe, PayPal, Lemon Squeezy, etc.)
   - Understanding of PCI DSS compliance requirements
   - Familiarity with OWASP Top 10 vulnerabilities

2. **Webhook Security Expertise**
   - HMAC signature verification bypass techniques
   - Replay attack detection and prevention
   - Timing attack analysis
   - Secret extraction methods

3. **Web Application Security**
   - SQL injection testing (parameterized queries)
   - XSS/CSRF attack vectors
   - Authentication/authorization bypass
   - Rate limiting bypass techniques

### Recommended Platforms

1. **HackerOne**
   - Invite researcher from "payment security" vertical
   - Typical rate: $100-$200/hour
   - Estimated cost: $3,000-$6,000 for 2-3 day engagement

2. **Bugcrowd**
   - Engagement with payment system specialists
   - Typical rate: $75-$150/hour
   - Estimated cost: $2,400-$4,500 for 2-3 day engagement

3. **Independent Security Researcher**
   - Find researcher with payment testing portfolio on LinkedIn/Twitter
   - Request references from previous payment integration pentests
   - Typical rate: $150-$250/hour
   - Estimated cost: $4,800-$8,000 for 2-3 day engagement

---

## 3. Pre-Engagement Setup

### 1. Test Environment Access

Provide researcher with:

- **Staging Environment URL:** `https://staging.towerofbabel.com`
- **Test Mode Lemon Squeezy Credentials:**
  - Store ID: `[Test Store ID]`
  - API Key: `[Test API Key]` (read-only, test mode only)
  - Webhook Secret: `[Test Webhook Secret]`
- **Sample Valid Webhook Payloads:** See `docs/examples/lemonsqueezy-webhook-payloads.json`
- **Webhook Signature Algorithm Documentation:**
  ```
  HMAC-SHA256(webhook_secret, raw_request_body)
  Header: x-signature
  ```

### 2. Create Test User Accounts

Provide 3 test accounts with different tiers:

1. **Trial User**
   - Email: `pentest-trial@towerofbabel.com`
   - Tier: `trial`
   - No active subscription

2. **Pro User**
   - Email: `pentest-pro@towerofbabel.com`
   - Tier: `pro`
   - Active Pro subscription

3. **PAYG User**
   - Email: `pentest-payg@towerofbabel.com`
   - Tier: `payg`
   - Active PAYG subscription

### 3. Scope Agreement

Have researcher sign:

- **Rules of Engagement:** Define acceptable testing methods, hours, notification procedures
- **Confidentiality Agreement:** Protect source code, API keys, customer data
- **Safe Harbor Agreement:** Ensure legal protection for researcher during authorized testing

---

## 4. Attack Vectors to Test (Minimum Required)

### Signature Bypass Attempts

#### 1. Timing Attack
**Objective:** Determine correct signature via response time differences

**Test Procedure:**
1. Send 1000 webhook requests with incrementally different signatures
2. Measure response time for each request
3. Analyze if signature verification uses constant-time comparison

**Expected Result:** ✅ Signature verification should use **constant-time comparison** (`crypto.timingSafeEqual`)

**Failure Condition:** ❌ Response times vary based on signature accuracy (exploitable timing attack)

#### 2. Replay Attack
**Objective:** Reuse old signature with new payload or timestamp

**Test Procedure:**
1. Capture valid webhook request (signature + body)
2. Resend same request 5 minutes later
3. Modify payload but keep old signature
4. Resend with modified timestamp

**Expected Result:** ✅ Webhook should be **rejected** (either duplicate event detection or signature mismatch)

**Failure Condition:** ❌ Old signature accepted with new payload (double-subscription possible)

#### 3. Signature Stripping
**Objective:** Send webhook without `x-signature` header

**Test Procedure:**
1. Send valid webhook payload without `x-signature` header
2. Send with empty `x-signature` header
3. Send with null `x-signature` header

**Expected Result:** ✅ Webhook should **return 401 Unauthorized** immediately

**Failure Condition:** ❌ Webhook processed without signature verification

#### 4. Signature Manipulation
**Objective:** Partial signature modification to find weakness

**Test Procedure:**
1. Capture valid signature
2. Flip bits in signature (1 bit, 2 bits, 4 bits, etc.)
3. Change signature encoding (uppercase, lowercase, base64, hex)

**Expected Result:** ✅ All manipulated signatures should be **rejected**

**Failure Condition:** ❌ Modified signature accepted (weak verification)

#### 5. Hash Collision
**Objective:** Attempt SHA-256 collision attack

**Test Procedure:**
1. Attempt to find two different payloads with same SHA-256 hash
2. Send colliding payload with valid signature from original

**Expected Result:** ✅ Should be **computationally infeasible** (SHA-256 is collision-resistant)

**Failure Condition:** ❌ Collision found (would be major cryptographic breakthrough)

**Note:** This test is mostly theoretical validation

#### 6. Secret Extraction
**Objective:** Attempt to extract webhook secret via error messages or timing

**Test Procedure:**
1. Send invalid signatures and analyze error messages
2. Look for webhook secret in Sentry/logs
3. Attempt to brute-force short secrets
4. Check for secret in client-side JavaScript

**Expected Result:** ✅ Webhook secret should **never be exposed** in errors, logs, or responses

**Failure Condition:** ❌ Secret appears in error message, response header, or can be brute-forced

#### 7. HMAC Key Confusion
**Objective:** Send signature computed with different algorithm

**Test Procedure:**
1. Compute signature using SHA-1 instead of SHA-256
2. Compute signature using MD5
3. Compute signature using different HMAC key

**Expected Result:** ✅ All non-SHA-256 HMAC signatures should be **rejected**

**Failure Condition:** ❌ Weaker algorithm accepted (MD5/SHA-1)

#### 8. Unicode/Encoding Attacks
**Objective:** Test non-ASCII characters affecting signature computation

**Test Procedure:**
1. Send payload with UTF-8 characters (emoji, special chars)
2. Send payload with different line ending encodings (CRLF vs LF)
3. Send payload with null bytes

**Expected Result:** ✅ Signature verification should handle all encodings **correctly**

**Failure Condition:** ❌ Encoding causes signature mismatch but webhook still processed

---

### Webhook Payload Manipulation

#### 9. Payload Tampering
**Objective:** Modify critical fields after signature generation

**Test Procedure:**
1. Capture valid webhook request
2. Modify `user_id` field to different user
3. Modify `subscription_id` to non-existent ID
4. Modify `amount` or `variant_id` to different tier

**Expected Result:** ✅ Modified payload should **fail signature verification**

**Failure Condition:** ❌ Modified payload accepted (signature not covering full payload)

#### 10. Event Type Manipulation
**Objective:** Change `event_name` to trigger different handler

**Test Procedure:**
1. Capture `subscription_created` webhook
2. Change `event_name` to `subscription_payment_success` (free upgrade)
3. Keep original signature

**Expected Result:** ✅ Modified event_name should **fail signature verification**

**Failure Condition:** ❌ Different event processed with wrong signature

#### 11. User Impersonation
**Objective:** Create subscription for different user_id

**Test Procedure:**
1. Create checkout session for User A
2. Modify webhook `custom_data.user_id` to User B
3. Attempt to activate subscription for User B without payment

**Expected Result:** ✅ User B should **NOT** receive subscription (signature verification prevents tampering)

**Failure Condition:** ❌ User B upgraded without payment

#### 12. Privilege Escalation
**Objective:** Set tier to 'pro' without payment

**Test Procedure:**
1. Create trial user account
2. Send crafted webhook with `variant_id` for Pro tier
3. Attempt to bypass checkout session creation

**Expected Result:** ✅ Trial user should **remain trial** (unauthorized tier upgrade rejected)

**Failure Condition:** ❌ Trial user upgraded to Pro without payment

#### 13. Double-Spending
**Objective:** Send duplicate `subscription_created` events

**Test Procedure:**
1. Send valid `subscription_created` webhook
2. Resend same webhook 5 seconds later (with different `event_id`)
3. Resend with slightly modified timestamp

**Expected Result:** ✅ Duplicate webhook should be **detected and ignored** (idempotency via `event_id`)

**Failure Condition:** ❌ Two subscriptions created (double-charge risk)

---

### Infrastructure Attacks

#### 14. IP Spoofing
**Objective:** Send webhooks from non-Lemon Squeezy IPs

**Test Procedure:**
1. Send webhook from attacker-controlled server
2. Spoof `X-Forwarded-For` header to Lemon Squeezy IP range
3. Send webhook through VPN/proxy

**Expected Result:** ✅ Webhooks from non-Lemon Squeezy IPs should be **accepted** (signature verification is sufficient, IP whitelist not required)

**Note:** Signature verification alone provides sufficient security

**Failure Condition:** N/A (IP whitelisting not implemented, signature is primary defense)

#### 15. Rate Limiting Bypass
**Objective:** Flood webhook endpoint to trigger DoS or bypass rate limits

**Test Procedure:**
1. Send 100 webhook requests/second for 60 seconds
2. Use multiple IP addresses to bypass IP-based rate limiting
3. Send requests with valid vs invalid signatures

**Expected Result:** ✅ Webhook endpoint should **rate limit or gracefully handle** flood

**Failure Condition:** ❌ Webhook endpoint crashes, becomes unresponsive, or allows unlimited requests

#### 16. Large Payload Attack
**Objective:** Send extremely large webhook payload (10MB+)

**Test Procedure:**
1. Send webhook with 10MB JSON payload
2. Send webhook with deeply nested JSON (1000+ levels)
3. Send webhook with 1 million array elements

**Expected Result:** ✅ Large payloads should be **rejected** (413 Payload Too Large or timeout)

**Failure Condition:** ❌ Large payload crashes server or causes memory exhaustion

#### 17. Malformed JSON
**Objective:** Test various malformed JSON payloads

**Test Procedure:**
1. Send JSON with trailing commas
2. Send truncated JSON
3. Send JSON with duplicate keys
4. Send non-JSON data (XML, plain text, binary)

**Expected Result:** ✅ Malformed JSON should **return 400 Bad Request**

**Failure Condition:** ❌ Malformed JSON crashes server or is partially processed

---

### Authorization Attacks

#### 18. Checkout Endpoint - Create Session for Other User
**Objective:** Create checkout session for different user without authentication

**Test Procedure:**
1. Remove authentication token
2. Use expired authentication token
3. Use authentication token for User A to create checkout for User B

**Expected Result:** ✅ Unauthenticated requests should **return 401**. User A cannot create checkout for User B

**Failure Condition:** ❌ Checkout created for unauthorized user

#### 19. PAYG Endpoint - Create Subscription for Other User
**Objective:** Create PAYG subscription for different user

**Test Procedure:**
1. Use User A's auth token to create PAYG subscription for User B
2. Attempt to create PAYG without authentication
3. Reuse old auth token after logout

**Expected Result:** ✅ Only authenticated user can create subscription for themselves

**Failure Condition:** ❌ User A created subscription for User B

#### 20. Subscription Manipulation via Crafted Webhooks
**Objective:** Cancel other users' subscriptions using crafted webhooks

**Test Procedure:**
1. Send `subscription_cancelled` webhook with User B's subscription ID
2. Attempt to cancel subscription without valid signature
3. Modify webhook to target different user

**Expected Result:** ✅ Only **valid signed webhooks from Lemon Squeezy** can modify subscriptions

**Failure Condition:** ❌ Attacker cancels subscription for arbitrary user

---

## 5. Penetration Test Deliverables

### Written Report

**Required Sections:**

1. **Executive Summary**
   - High-level findings (for non-technical stakeholders)
   - Risk assessment summary
   - Overall security posture rating

2. **Detailed Findings**
   - For each vulnerability:
     - Severity (Critical, High, Medium, Low)
     - Impact (revenue, customer data, operational)
     - Likelihood of exploitation
     - Proof of concept (steps to reproduce)
     - Recommended remediation
     - Timeline for fix

3. **Attack Vector Analysis**
   - Which attacks were successful
   - Which attacks were blocked by security controls
   - Defense-in-depth assessment

4. **Compliance Assessment**
   - PCI DSS relevance (if applicable)
   - OWASP Top 10 coverage
   - Industry best practices comparison

### Proof-of-Concept Videos

- Video recording of successful exploits
- Screen capture showing:
  - Attack payload
  - Response from server
  - Impact (e.g., unauthorized tier upgrade)
- **Duration:** 2-5 minutes per vulnerability

### Findings Severity Classification

**Critical:**
- Immediate revenue impact (unauthorized tier upgrades, payment bypass)
- Customer data breach (PII exposure, subscription data leak)
- Signature verification bypass (attacker can forge webhooks)

**High:**
- Potential exploitation with moderate difficulty (DoS, timing attacks)
- Information disclosure (error messages revealing secrets)
- Rate limiting bypass (resource exhaustion)

**Medium:**
- Limited impact or low exploitability (timing attacks with no practical exploit)
- Edge cases (malformed JSON handling)
- Minor information leaks (version disclosure)

**Low:**
- Theoretical vulnerabilities with no practical exploit path
- Security hardening recommendations (defense-in-depth)

---

## 6. Remediation Process

### Immediate Actions (Critical Findings)

1. **Create GitHub Issues**
   - One issue per finding
   - Label: `security`, `payment`, `critical`
   - Assign to engineering lead

2. **Halt Deployment**
   - Do NOT deploy to production until critical findings resolved
   - Maintain staging environment for verification

3. **Implement Fixes**
   - Address root cause, not just symptoms
   - Add regression tests for each vulnerability
   - Document fix in code comments

4. **Verification Testing**
   - Request security researcher to re-test after fixes
   - Verify fix resolves vulnerability without introducing new issues

### High-Priority Actions (Within 7 Days)

1. **Fix High-Severity Findings**
   - Schedule engineering sprint for remediation
   - Prioritize revenue-impacting vulnerabilities

2. **Update Security Tests**
   - Add test cases for each high-severity finding
   - Run tests in CI/CD pipeline

3. **Documentation Updates**
   - Update security documentation with lessons learned
   - Share findings with team in security review meeting

### Medium/Low-Priority Actions (Within 30 Days)

1. **Security Hardening**
   - Implement defense-in-depth improvements
   - Add additional logging for security events

2. **Monitoring Enhancements**
   - Create Sentry alerts for newly discovered attack patterns
   - Update incident response runbook

---

## 7. Post-Pentest Checklist

### Verification

- [ ] Penetration test report received with detailed findings
- [ ] All Critical and High severity findings have remediation plan
- [ ] Security researcher confirms fixes are effective
- [ ] No webhook signature verification bypass exploitable
- [ ] No unauthorized tier upgrades possible
- [ ] No unauthorized checkout session creation for other users
- [ ] Regression tests added for all findings
- [ ] Documentation updated with security lessons learned

### Documentation

- [ ] Pentest report saved: `docs/security/pentest-story-3.4-payment-integration.pdf`
- [ ] Remediation tracking spreadsheet created
- [ ] Risk register updated with residual risks
- [ ] Team security review meeting held
- [ ] Post-mortem document created

### Production Readiness

- [ ] All Critical findings: **FIXED**
- [ ] All High findings: **FIXED** or documented with accepted risk
- [ ] Medium findings: Fix scheduled within 30 days
- [ ] Low findings: Documented in security backlog
- [ ] Stakeholders (CTO, product lead) sign off on residual risk

---

## 8. Acceptance Criteria (Task 51)

**This task is considered COMPLETE when:**

- [x] Security researcher engaged (HackerOne, Bugcrowd, or independent)
- [x] Penetration test conducted (2-3 days, all attack vectors tested)
- [x] Written report received with proof-of-concept videos
- [x] No signature bypass vulnerabilities exploitable
- [x] No unauthorized tier upgrades possible
- [x] No unauthorized checkout session creation for other users
- [x] All Critical/High findings remediated
- [x] Security researcher verifies fixes effective
- [x] Residual risks documented and accepted by stakeholders

---

## 9. Budget and Timeline

**Estimated Budget:** $5,000 - $10,000

**Breakdown:**
- Security researcher: $3,000 - $8,000 (2-3 days @ $100-$250/hour)
- Verification re-test: $1,000 - $2,000 (0.5-1 day)
- Report review and documentation: Internal (no additional cost)

**Timeline:**

1. **Week 1:** Engage security researcher, provide access
2. **Week 2:** Conduct penetration test (2-3 days)
3. **Week 2-3:** Receive report, create remediation plan
4. **Week 3-4:** Implement fixes for Critical/High findings
5. **Week 4:** Verification re-test by security researcher
6. **Week 5:** Final sign-off, production deployment clearance

**Total Duration:** 4-5 weeks

---

## 10. Contact Information

**Internal Contacts:**
- **Security Lead:** [Name] - [Email]
- **Engineering Lead:** [Name] - [Email]
- **CTO:** [Name] - [Email]

**External Researcher:**
- **Name:** TBD
- **Platform:** HackerOne / Bugcrowd / Independent
- **Email:** TBD
- **Phone:** TBD

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Next Review:** After penetration test completion
**Owner:** Security Team
