# 14. Critical Risk Mitigation

This section documents **CRITICAL technical risks** and their mandatory mitigations implemented in Epic 1.

---

## Risk 1: Supabase Auth JWT Session Delay Breaks Payment Flow

**Severity:** 🔴 **CRITICAL**

**Problem:** JWT tokens cache user tier for 1 hour. When user pays for Pro, database updates but JWT still shows "trial" → user blocked despite paying.

**Mandatory Mitigation:**

1. **Database as Source of Truth Pattern** (Epic 1 Story 1.4):
```typescript
// ✅ CORRECT - REQUIRED EVERYWHERE
const { data: { user } } = await supabase.auth.getUser(); // Identity only
const userRecord = await prisma.user.findUnique({ where: { id: user.id } }); // Authorization
if (userRecord.tier === 'trial' && userRecord.messages_used_count >= 10) {
  return error('Limit exceeded');
}
```

2. **ESLint Rule** (Epic 1 Story 1.1):
```javascript
"no-restricted-properties": ["error", {
  "object": "user",
  "property": "app_metadata",
  "message": "NEVER use user.app_metadata for tier/usage. Query database instead."
}]
```

3. **Integration Test** (Epic 1 Story 1.5):
```typescript
// Test: Trial user (10/10) → pays → immediate interpretation succeeds
```

4. **Documentation** (Epic 1 Story 1.4):
- `/lib/auth/README.md` with code examples

---

## Risk 2: PostgreSQL Connection Pool Exhaustion Under Load

**Severity:** 🔴 **CRITICAL**

**Problem:** Serverless functions create connections per invocation. Supabase free tier: 60 connections. At 500+ concurrent users → pool exhausted → outage.

**Mandatory Mitigation:**

1. **Prisma Singleton + PgBouncer** (Epic 1 Story 1.3):
```typescript
// DATABASE_URL with PgBouncer + connection limit
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true&connection_limit=1'
    }
  }
});
```

2. **Connection Circuit Breaker** (Epic 1 Story 1.3):
```typescript
export async function executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
  if (connectionErrors >= MAX_CONNECTION_ERRORS) {
    throw new Error('Circuit breaker open - connection pool exhausted');
  }
  try {
    const result = await operation();
    connectionErrors = Math.max(0, connectionErrors - 1);
    return result;
  } catch (error) {
    if (error.code === 'P1001' || error.message?.includes('too many connections')) {
      connectionErrors++;
    }
    throw error;
  }
}
```

3. **Query Optimization** (Epic 1 Story 1.3):
```typescript
// Always use explicit select (fetch only needed columns)
const user = await prisma.user.findUnique({
  where: { id },
  select: { tier: true, messages_used_count: true }
});
```

4. **Monitoring** (Epic 1 Story 1.5):
```typescript
// Log connection metrics every 5 minutes
// Alert if usage > 80% of limit
```

---

## Risk 3: LLM API Cost Spike Destroys Margins

**Severity:** 🔴 **CRITICAL**

**Problem:** Attacker creates 10 accounts × 10 messages = 100 interpretations × $0.02 = $200 loss in 1 hour. 80% margin goal destroyed.

**Mandatory Mitigation:**

1. **Vercel KV (Redis) - REQUIRED** (Epic 1 Story 1.5):
```bash
# Add to Tech Stack - not optional
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

2. **3-Layer Cost Circuit Breaker** (Epic 1 Story 1.5):
```typescript
// /lib/llm/costCircuitBreaker.ts
export async function checkCostBudget(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  layer?: 'daily' | 'hourly' | 'user';
}> {
  // Layer 1: Daily limit ($50)
  const dailyCost = await kv.get(`cost:daily:${today}`);
  if (parseFloat(dailyCost || '0') >= DAILY_COST_LIMIT) {
    return { allowed: false, layer: 'daily' };
  }

  // Layer 2: Hourly limit ($5)
  const hourlyCost = await kv.get(`cost:hourly:${today}:${hour}`);
  if (parseFloat(hourlyCost || '0') >= HOURLY_COST_LIMIT) {
    return { allowed: false, layer: 'hourly' };
  }

  // Layer 3: Per-user daily limit ($1)
  const userDailyCost = await kv.get(`cost:user:${userId}:${today}`);
  if (parseFloat(userDailyCost || '0') >= USER_DAILY_COST_LIMIT) {
    return { allowed: false, layer: 'user' };
  }

  return { allowed: true };
}

export async function trackCost(userId: string, costUsd: number): Promise<void> {
  await kv.incrbyfloat(`cost:daily:${today}`, costUsd);
  await kv.incrbyfloat(`cost:hourly:${today}:${hour}`, costUsd);
  await kv.incrbyfloat(`cost:user:${userId}:${today}`, costUsd);
}
```

3. **Integration with Interpretation API** (Epic 1 Story 1.5):
```typescript
// BEFORE LLM call
const costCheck = await checkCostBudget(user.id);
if (!costCheck.allowed) {
  return NextResponse.json({ error: 'SERVICE_OVERLOADED' }, { status: 503 });
}

// AFTER LLM call
await trackCost(user.id, result.metadata.costUsd);
```

4. **Cost Monitoring Endpoint** (Epic 1 Story 1.5):
```typescript
// /app/api/admin/cost-metrics/route.ts
// Returns daily cost, hourly breakdown, usage %
```

5. **Alerting** (Epic 1 Story 1.5):
```typescript
// Sentry alert when:
// - Daily cost > $40 (80% of $50 limit)
// - Hourly cost > $4 (80% of $5 limit)
// - Circuit breaker triggered
```

---

## Implementation Checklist

**Epic 1 Story 1.1:**
- [ ] ESLint rule for JWT metadata check

**Epic 1 Story 1.3:**
- [ ] PgBouncer + connection_limit=1 in DATABASE_URL
- [ ] Prisma singleton pattern
- [ ] Connection circuit breaker (`executeWithCircuitBreaker`)
- [ ] Query optimization (explicit `select` clauses)

**Epic 1 Story 1.4:**
- [ ] Supabase Auth setup
- [ ] Database-as-source-of-truth pattern established
- [ ] `/lib/auth/README.md` documentation

**Epic 1 Story 1.5:**
- [ ] Vercel KV credentials configured
- [ ] Cost circuit breaker implemented (`costCircuitBreaker.ts`)
- [ ] Cost tracking integrated in `/api/interpret`
- [ ] Cost metrics endpoint (`/api/admin/cost-metrics`)
- [ ] Integration test (payment → immediate interpretation)
- [ ] Sentry alerts configured

---
