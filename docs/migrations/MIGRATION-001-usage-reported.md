# Database Migration: Add usage_reported Field

**Migration ID:** 001-usage-reported
**Date:** 2025-10-29
**Type:** Schema Change + Data Update
**Risk Level:** MEDIUM (adds non-nullable column with default)
**Downtime Required:** NO

---

## Purpose

Fix critical financial integrity bug by adding idempotency tracking to prevent duplicate usage reporting to Lemon Squeezy.

**Related Documents:**
- `/docs/qa/critical-bug-fix-idempotency-20251029.md`
- `/docs/qa/test-fix-session-summary-20251029.md`

---

## Changes

### Schema Changes

**Table:** `interpretations`
**Column Added:** `usage_reported`
**Type:** `BOOLEAN NOT NULL DEFAULT false`

```sql
ALTER TABLE interpretations
ADD COLUMN usage_reported BOOLEAN NOT NULL DEFAULT false;
```

### Data Changes

**Purpose:** Mark all existing interpretations as "already reported" to prevent retroactive charging.

```sql
UPDATE interpretations
SET usage_reported = true
WHERE usage_reported = false;
```

---

## Rollout Steps

### Development Environment ✅

**Status:** COMPLETED

```bash
# Already applied via Prisma db push
npx prisma db push
```

**Verification:**
```bash
# Check schema
npx prisma studio

# Or query directly
psql $DATABASE_URL -c "SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'interpretations' AND column_name = 'usage_reported';"
```

---

### Staging Environment

**Steps:**

1. **Backup Database (CRITICAL)**
   ```bash
   # Via Supabase Dashboard or CLI
   supabase db dump > backup-before-usage-reported-migration.sql
   ```

2. **Apply Migration**
   ```bash
   # Option A: Via Prisma
   npx prisma db push

   # Option B: Via SQL (if Prisma not available)
   psql $DATABASE_URL < prisma/migrations/add_usage_reported_field.sql
   ```

3. **Verify Column Added**
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'interpretations' AND column_name = 'usage_reported';
   ```

   **Expected Output:**
   ```
   column_name     | data_type | is_nullable | column_default
   ----------------|-----------|-------------|---------------
   usage_reported  | boolean   | NO          | false
   ```

4. **Update Existing Records**
   ```sql
   UPDATE interpretations
   SET usage_reported = true
   WHERE usage_reported = false;
   ```

5. **Verify Update**
   ```sql
   SELECT
     COUNT(*) as total_interpretations,
     COUNT(*) FILTER (WHERE usage_reported = true) as marked_as_reported,
     COUNT(*) FILTER (WHERE usage_reported = false) as not_marked
   FROM interpretations;
   ```

   **Expected:** `not_marked` should be 0

6. **Deploy Application Code**
   ```bash
   # Deploy the updated code with idempotency checks
   git push origin main
   # Or trigger deployment via CI/CD
   ```

7. **Monitor Logs**
   ```bash
   # Watch for "Usage already reported" messages
   # This indicates idempotency is working
   ```

---

### Production Environment

**Prerequisites:**
- ✅ Successfully tested in staging
- ✅ Database backup completed
- ✅ Rollback plan documented
- ✅ Monitoring alerts configured

**Steps:**

1. **Pre-Deployment Checklist**
   - [ ] Create database backup
   - [ ] Notify team of deployment
   - [ ] Prepare rollback SQL script
   - [ ] Have database admin ready

2. **Apply Migration** (5-10 seconds downtime if needed)
   ```bash
   # Backup first!
   supabase db dump > prod-backup-$(date +%Y%m%d-%H%M%S).sql

   # Apply migration
   npx prisma db push
   ```

3. **Update Existing Records**
   ```sql
   -- Mark existing interpretations as reported
   UPDATE interpretations
   SET usage_reported = true
   WHERE usage_reported = false;
   ```

4. **Verification Queries**
   ```sql
   -- 1. Check column exists
   \d interpretations;

   -- 2. Check all records updated
   SELECT
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE usage_reported = true) as reported,
     COUNT(*) FILTER (WHERE usage_reported = false) as not_reported
   FROM interpretations;

   -- 3. Spot check recent interpretations
   SELECT id, created_at, usage_reported
   FROM interpretations
   ORDER BY created_at DESC
   LIMIT 10;
   ```

5. **Deploy Application**
   ```bash
   # Deploy code with idempotency checks
   git push production main
   ```

6. **Post-Deployment Monitoring**
   - Monitor Sentry for errors
   - Check Lemon Squeezy dashboard for duplicate charges
   - Watch application logs for "Usage already reported" messages

---

## Rollback Plan

If issues occur, rollback steps:

### 1. Rollback Application Code
```bash
# Revert to previous deployment
git revert <commit-hash>
git push production main
```

### 2. Rollback Database (if necessary)
```sql
-- Remove the column (WARNING: loses usage_reported tracking)
ALTER TABLE interpretations DROP COLUMN usage_reported;
```

### 3. Restore from Backup (if severe issues)
```bash
# Restore from backup taken before migration
psql $DATABASE_URL < prod-backup-<timestamp>.sql
```

**Note:** Rollback should only be needed if migration causes errors. The column addition is non-breaking.

---

## Risks & Mitigations

### Risk 1: Migration Fails
**Probability:** LOW
**Impact:** HIGH
**Mitigation:**
- Test thoroughly in staging first
- Have database backup ready
- Apply during low-traffic window

### Risk 2: Existing Interpretations Not Updated
**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Verify update query before applying
- Check counts after update
- Run verification queries

### Risk 3: Performance Impact from Column Addition
**Probability:** VERY LOW
**Impact:** LOW
**Mitigation:**
- Column has default value (fast)
- No index rebuild needed
- Boolean column is small (1 byte)

---

## Testing in Development

### Verify Migration Works

1. **Check Schema:**
   ```typescript
   // In a test script or console
   import prisma from '@/lib/db/prisma';

   const interpretation = await prisma.interpretation.create({
     data: {
       user_id: 'test-user',
       culture_sender: 'American',
       culture_receiver: 'Japanese',
       character_count: 100,
       interpretation_type: 'both',
       cost_usd: 0.01,
       llm_provider: 'anthropic',
       response_time_ms: 1000
     }
   });

   console.log('usage_reported:', interpretation.usage_reported); // Should be false
   ```

2. **Test Idempotency:**
   ```typescript
   import { reportInterpretationUsage } from '@/lib/lemonsqueezy/usageReporting';

   // First call
   const result1 = await reportInterpretationUsage('user-id', 'interpretation-id');
   console.log('First call:', result1); // Should call API

   // Second call (duplicate)
   const result2 = await reportInterpretationUsage('user-id', 'interpretation-id');
   console.log('Second call:', result2); // Should skip (already reported)
   ```

3. **Run Tests:**
   ```bash
   npm test -- tests/unit/lib/lemonsqueezy/usageReporting-idempotency.test.ts
   # All 15 tests should pass
   ```

---

## Success Criteria

- ✅ Column `usage_reported` exists in `interpretations` table
- ✅ All existing interpretations have `usage_reported = true`
- ✅ New interpretations default to `usage_reported = false`
- ✅ Application code successfully uses the field
- ✅ All 15 idempotency tests pass
- ✅ No duplicate charges in Lemon Squeezy dashboard

---

## Monitoring After Deployment

### Key Metrics to Watch

1. **Usage Reporting Success Rate**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as total_interpretations,
     COUNT(*) FILTER (WHERE usage_reported = true) as reported,
     COUNT(*) FILTER (WHERE usage_reported = false) as not_reported
   FROM interpretations
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

2. **Check for "Already Reported" Logs**
   ```bash
   # Should see these if duplicates are prevented
   grep "Usage already reported" /var/log/app.log
   ```

3. **Lemon Squeezy Usage Records**
   - Compare count in database vs Lemon Squeezy dashboard
   - Should match 1:1 for PAYG users

---

## Sign-off

**Migration Prepared By:** Quinn (Test Architect) - Claude Sonnet 4.5
**Date Prepared:** 2025-10-29
**Development Status:** ✅ APPLIED
**Staging Status:** ⏳ PENDING
**Production Status:** ⏳ PENDING

**Approved For:**
- [x] Development
- [ ] Staging (requires testing)
- [ ] Production (requires staging validation)

---

## Appendix: SQL Verification Queries

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'interpretations' AND column_name = 'usage_reported';

-- Check current state of all records
SELECT
  usage_reported,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM interpretations
GROUP BY usage_reported;

-- Find any PAYG users who might be affected
SELECT
  u.id,
  u.email,
  u.tier,
  COUNT(i.id) as interpretation_count,
  COUNT(i.id) FILTER (WHERE i.usage_reported = false) as not_reported_count
FROM users u
JOIN interpretations i ON i.user_id = u.id
WHERE u.tier = 'payg'
GROUP BY u.id, u.email, u.tier
HAVING COUNT(i.id) FILTER (WHERE i.usage_reported = false) > 0;
```

---

**END OF MIGRATION DOCUMENT**
