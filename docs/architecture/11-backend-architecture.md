# 11. Backend Architecture

## API Route Organization

```
/app/api/
  ├── health/route.ts
  ├── interpret/route.ts       # Main interpretation endpoint
  ├── user/
  │   ├── route.ts
  │   └── delete/route.ts
  ├── feedback/route.ts
  ├── checkout/route.ts
  ├── billing-portal/route.ts
  ├── admin/
  │   └── cost-metrics/route.ts
  └── webhooks/
      └── stripe/route.ts
```

## API Route Template (with CRITICAL mitigations)

```typescript
// /app/api/interpret/route.ts
export async function POST(req: NextRequest) {
  // 1. Authentication (Supabase Auth)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // 2. Authorization - CRITICAL: Query DATABASE for tier/usage (not JWT)
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tier: true, messages_used_count: true }
  });

  // 3. Rate limiting (IP-based)
  if (!checkRateLimit(ip)) return rateLimit();

  // 4. Usage limit check (database as source of truth)
  const usageCheck = await checkUsageLimit(user.id);
  if (!usageCheck.allowed) return limitExceeded();

  // 5. Cost circuit breaker - CRITICAL
  const costCheck = await checkCostBudget(user.id);
  if (!costCheck.allowed) return serviceOverloaded();

  // 6. Call LLM provider
  const result = await llmProvider.interpret(...);

  // 7. Track cost - CRITICAL
  await trackCost(user.id, result.metadata.costUsd);

  // 8. Save metadata + increment usage
  await incrementUsage(user.id);

  return success(result);
}
```

---
