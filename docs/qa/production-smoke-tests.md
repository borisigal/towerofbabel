# Production Smoke Tests for TowerOfBabel

**Purpose:** Quick validation that critical functionality works after deployment

**Duration:** 5-10 minutes

**When to run:** After every production deployment

---

## Quick Smoke Test (5 minutes)

### Test 1: Health Check
```bash
curl https://towerofbabel.vercel.app/api/health
```
**Expected:** `{"status":"ok","database":"connected"}`

---

### Test 2: Landing Page Loads
1. Open browser: `https://towerofbabel.vercel.app`
2. **Verify:**
   - ✅ Hero heading displays: "Understand What People Really Mean Across Cultures"
   - ✅ Benefits list displays (4 items with checkmarks)
   - ✅ "Get Started Free" button visible
   - ✅ Privacy badge visible
   - ✅ No console errors in browser DevTools

---

### Test 3: Sign Up Flow
1. Click "Get Started Free"
2. Enter email address
3. **Verify:**
   - ✅ Magic link email sent (check email)
   - ✅ Success toast appears (if implemented)
   - ✅ No errors in browser console

---

### Test 4: Dashboard Loads (After Sign In)
1. Sign in via magic link
2. Navigate to dashboard
3. **Verify:**
   - ✅ Dashboard page loads
   - ✅ Interpretation form visible
   - ✅ Culture selectors populated
   - ✅ No console errors

---

### Test 5: Interpretation Flow (CRITICAL)
1. **Submit test interpretation:**
   - Message: "Hello, how are you?"
   - Sender Culture: American
   - Receiver Culture: Japanese
   - Mode: Inbound

2. **Verify:**
   - ✅ Loading spinner appears
   - ✅ Results display within 5 seconds
   - ✅ Emotion gauges render
   - ✅ Bottom line displays
   - ✅ No errors in console
   - ✅ Usage counter decrements (check dashboard header)

---

### Test 6: Error Handling
1. **Exhaust trial messages** (submit interpretations until limit reached)

2. **Verify:**
   - ✅ Error message displays: "Message Limit Reached"
   - ✅ Message is user-friendly (no technical jargon)
   - ✅ Upgrade prompt appears

---

### Test 7: Payment Flow (CRITICAL - LIVE MODE)
⚠️ **WARNING: This will create a real subscription in Lemon Squeezy LIVE mode**

**Option A: Test with real payment** (if comfortable)
1. Click upgrade button
2. Complete Lemon Squeezy checkout
3. **Verify:**
   - ✅ Redirects to Lemon Squeezy checkout
   - ✅ After payment, redirects back to TowerOfBabel
   - ✅ User tier updated to "Pro" in dashboard
   - ✅ Unlimited interpretations enabled

**Option B: Skip payment test** (safer for smoke test)
- Just verify upgrade button works and redirects to Lemon Squeezy
- Cancel before entering payment details

---

### Test 8: Error Monitoring (Sentry)
1. Open Sentry dashboard
2. Check for errors in last 15 minutes
3. **Verify:**
   - ✅ No unexpected errors
   - ✅ Only known errors (if any)

---

### Test 9: Analytics Tracking
1. Open Vercel Analytics dashboard
2. **Verify:**
   - ✅ Page views tracking (should see your smoke test visits)
   - ✅ Real-time data updating

---

## Full Smoke Test (10 minutes)

**Additional tests beyond Quick Smoke Test:**

### Test 10: Feedback Flow
1. Submit interpretation
2. Click thumbs up or thumbs down
3. **Verify:**
   - ✅ Success toast: "Thanks for your feedback!"
   - ✅ Feedback icon shows selected state

---

### Test 11: Privacy Page
1. Navigate to `/privacy`
2. **Verify:**
   - ✅ Privacy policy page loads
   - ✅ Provider info displays (Anthropic)
   - ✅ Privacy badge link works
   - ✅ Footer privacy link works

---

### Test 12: Responsive Design (Mobile)
1. Open browser DevTools → Responsive mode
2. Set to iPhone size (375px width)
3. **Verify:**
   - ✅ Landing page adapts to mobile
   - ✅ Navigation works
   - ✅ Interpretation form usable
   - ✅ No horizontal scrolling

---

### Test 13: Cross-Browser (Quick)
1. Test in at least 2 browsers (Chrome + Safari or Firefox)
2. **Verify:**
   - ✅ Landing page displays correctly
   - ✅ Dashboard loads
   - ✅ Interpretation flow works

---

## If Smoke Test Fails

### Failure Response Plan

**Minor Issue (UI glitch, non-critical):**
- ✅ Document the issue
- ✅ Create GitHub issue
- ✅ Fix in next deployment
- ✅ Don't rollback

**Major Issue (interpretation not working, payment broken):**
- 🚨 ROLLBACK IMMEDIATELY
- 🚨 Investigate root cause
- 🚨 Fix in development
- 🚨 Re-deploy after fix
- 🚨 Re-run smoke tests

---

## Smoke Test Checklist (Copy-Paste)

```
Production Smoke Test - [Date: ____] - [Tester: ____]

Quick Tests (5 min):
- [ ] Health check API returns OK
- [ ] Landing page loads without errors
- [ ] Sign up flow works
- [ ] Dashboard loads after sign in
- [ ] Interpretation flow works (submit test message)
- [ ] Error handling works (exhaust trial messages)
- [ ] Payment flow redirects correctly
- [ ] Sentry shows no unexpected errors
- [ ] Vercel Analytics tracking works

Full Tests (if time permits):
- [ ] Feedback flow works
- [ ] Privacy page loads
- [ ] Mobile responsive design works
- [ ] Cross-browser testing (2+ browsers)

Overall Status: PASS / FAIL / PARTIAL

Notes:
_____________________________________
_____________________________________
```

---

## Automated Smoke Test (Future Enhancement)

**Consider creating:** `tests/smoke/production-smoke.test.ts`

```typescript
// Future: Automated smoke tests that run against production
describe('Production Smoke Tests', () => {
  it('should load landing page', async () => {
    const response = await fetch('https://towerofbabel.vercel.app');
    expect(response.status).toBe(200);
  });

  it('should have healthy API', async () => {
    const response = await fetch('https://towerofbabel.vercel.app/api/health');
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  // Add more automated checks...
});
```

---

**Created:** 2025-11-02
**QA Agent:** Quinn
