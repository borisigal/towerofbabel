# Vercel KV (Redis) Client

## Purpose

Vercel KV provides distributed state management for serverless functions. Used primarily for:

1. **LLM Cost Circuit Breaker** (Story 1.5C) - Track daily/hourly/per-user LLM costs
2. **Rate Limiting** - Track API request counts per IP/user
3. **Session State** - Distributed session storage (if needed)

## Key Naming Conventions

All KV keys follow a structured naming pattern:

```typescript
// Daily cost limit (resets at midnight UTC)
cost:daily:2025-10-19 → $12.34

// Hourly cost limit (resets every hour)
cost:hourly:2025-10-19:14 → $0.85

// Per-user daily cost limit (resets at midnight UTC)
cost:user:user-123:2025-10-19 → $0.45

// Rate limiting (requests per IP)
ratelimit:ip:192.168.1.1:2025-10-19:14 → 50
```

## TTL Strategy

Always set TTL (expiration) on keys to prevent stale data:

```typescript
// Daily keys expire in 24 hours
await kv.set('cost:daily:2025-10-19', '12.34', { ex: 86400 });

// Hourly keys expire in 1 hour
await kv.set('cost:hourly:2025-10-19:14', '0.85', { ex: 3600 });

// User daily keys expire in 24 hours
await kv.set('cost:user:user-123:2025-10-19', '0.45', { ex: 86400 });
```

## Fail-Open Behavior

KV operations should **fail open** (allow operations to continue if KV is unavailable):

```typescript
try {
  const costCheck = await checkCostBudget(userId);
  if (!costCheck.allowed) {
    return error('SERVICE_OVERLOADED');
  }
} catch (error) {
  // Log error but allow request to proceed
  logger.warn('Cost circuit breaker unavailable, allowing request', { error });
  // Continue with LLM call (fail open, not fail closed)
}
```

**Rationale:** KV is for protection, not core functionality. If KV is down, we log warnings but don't block users.

## Usage Examples

### Basic Get/Set

```typescript
import { kv } from '@/lib/kv/client';

// Set a value with 60 second TTL
await kv.set('test:key', 'value', { ex: 60 });

// Get a value
const value = await kv.get<string>('test:key');
console.log(value); // 'value'
```

### Atomic Increment

```typescript
// Increment cost counter atomically
await kv.incrbyfloat('cost:daily:2025-10-19', 0.02); // Add $0.02
```

### Get Multiple Keys

```typescript
// Get all keys matching a pattern
const keys = await kv.keys('cost:user:user-123:*');
const values = await Promise.all(keys.map((key) => kv.get(key)));
```

## Environment Variables

Required environment variables (configured in Vercel dashboard and `.env.local`):

```bash
KV_REST_API_URL=https://[name]-[project].kv.vercel-storage.com
KV_REST_API_TOKEN=...
```

**Security:** Never commit `KV_REST_API_TOKEN` to Git. Never expose to client (server-only).

## Testing

Test KV connectivity using the admin-only endpoint:

```bash
# Local testing
curl http://localhost:3000/api/admin/kv-test

# Production testing (requires admin authentication)
curl https://towerofbabel.vercel.app/api/admin/kv-test
```

## Common Pitfalls

1. **Forgetting TTL:** Always set expiration to prevent stale data
2. **Exposing credentials:** Never add `NEXT_PUBLIC_` prefix to KV variables
3. **Failing closed:** Always fail open if KV is unavailable
4. **Wrong data type:** Use `kv.get<string>()` for type safety
5. **Blocking operations:** KV operations are async, always `await`

## Free Tier Limits

Vercel KV free tier:
- **Storage:** 256MB
- **Requests:** 10,000 requests/day
- **Bandwidth:** Unlimited

If limits exceeded, operations will fail. Implement fail-open behavior to gracefully handle this.
