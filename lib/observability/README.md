# Observability - Logging and Monitoring

## Purpose

Provides production-grade observability for TowerOfBabel through:

1. **Structured Logging** (Pino) - JSON logs for querying and analysis
2. **Error Tracking** (Sentry) - Production error monitoring and alerts
3. **Breadcrumbs** - Automatic log trail for debugging errors

## Structured Logging with Pino

### Why Pino?

- **Production-grade:** Zero-overhead, fast performance
- **Structured:** JSON output (easy to query in Vercel logs)
- **Pretty-printing:** Colorized output in development
- **Type-safe:** TypeScript-friendly API

### Usage

```typescript
import { logger } from '@/lib/observability/logger';

// Info logs (normal operation)
logger.info({ userId, action: 'interpretation' }, 'User requested interpretation');

// Warning logs (potential issues)
logger.warn({ costUsd: 1.50, limit: 1.00 }, 'Cost limit exceeded');

// Error logs (failures)
logger.error({ error: error.message }, 'LLM API call failed');
```

### Log Levels

Pino uses numeric log levels:

| Level | Name  | Number | When to Use |
|-------|-------|--------|-------------|
| trace | TRACE | 10     | Very detailed debug info (disabled by default) |
| debug | DEBUG | 20     | Detailed debug info (disabled by default) |
| info  | INFO  | 30     | Normal operation (default level) |
| warn  | WARN  | 40     | Potential issues, degraded performance |
| error | ERROR | 50     | Failures, exceptions |
| fatal | FATAL | 60     | Critical errors causing shutdown |

**Default level:** `info` (30) - logs info, warn, error, and fatal (not trace or debug)

**Override level:**
```bash
# .env.local
LOG_LEVEL=debug  # Enable debug logs
```

## Sentry Integration (Story 1.5B)

### Breadcrumbs Strategy

**What are Breadcrumbs?**

Breadcrumbs are a trail of events leading up to an error. When an error occurs in Sentry, you see the breadcrumbs that led to the error, making debugging much easier.

**Automatic Breadcrumb Creation:**

All logs at `info` level and above automatically create Sentry breadcrumbs:

```typescript
// These logs create breadcrumbs that appear in Sentry error context
logger.info({ userId, tier: 'trial' }, 'User signed in');
logger.info({ culture_pair: 'american-japanese' }, 'LLM API call started');
logger.warn({ costUsd: 0.05 }, 'Cost approaching limit');
logger.error({ error: err.message }, 'LLM API call failed');  // ← Error captured
```

**Sentry Error View:**
```
❌ ERROR: LLM API call failed

Breadcrumbs:
1. [INFO] User signed in (userId: user-123, tier: trial)
2. [INFO] LLM API call started (culture_pair: american-japanese)
3. [WARN] Cost approaching limit (costUsd: 0.05)
4. [ERROR] LLM API call failed (error: timeout)
```

### Breadcrumb Filtering

Only logs at **info level (30) and above** create breadcrumbs:

- ✅ `info` → Breadcrumb (level: 'info')
- ✅ `warn` → Breadcrumb (level: 'warning')
- ✅ `error` → Breadcrumb (level: 'error')
- ❌ `debug` → No breadcrumb (too noisy)
- ❌ `trace` → No breadcrumb (too noisy)

**Rationale:** Debug logs are too verbose for production debugging. Info-level logs provide the right balance of context without overwhelming Sentry.

### Level Mapping

Pino levels are automatically mapped to Sentry levels:

| Pino Level | Sentry Level |
|------------|--------------|
| info (30+) | info         |
| warn (40+) | warning      |
| error (50+) | error        |

### Manual Sentry Capture

For errors that need extra context beyond breadcrumbs:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // ... code
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'interpretation',
      tier: userTier,
    },
    extra: {
      culture_pair: `${senderCulture}-${receiverCulture}`,
      cost_usd: costUsd,
    },
  });
}
```

## Development vs Production

### Local Development

**Logging:**
- Pretty-printed logs with colors (via `pino-pretty`)
- Timestamps in readable format (HH:MM:ss)
- No hostname/PID clutter

**Sentry:**
- Disabled by default (prevents noise in Sentry dashboard)
- Enable with: `SENTRY_ENABLE_DEV=true` in `.env.local`

### Production

**Logging:**
- Structured JSON logs
- Automatically ingested by Vercel
- Queryable in Vercel dashboard logs

**Sentry:**
- Enabled automatically
- Sample rates:
  - 100% of errors captured
  - 10% of performance transactions
  - 10% of profiling traces
  - 10% of session replays (100% on error)

## Best Practices

### 1. Log Context, Not Messages

```typescript
// ❌ BAD - Hard to query
logger.info('User user-123 signed in with tier trial');

// ✅ GOOD - Structured, queryable
logger.info({ userId: 'user-123', tier: 'trial' }, 'User signed in');
```

### 2. Don't Log Sensitive Data

```typescript
// ❌ BAD - Logs password
logger.info({ email, password }, 'User attempting sign-in');

// ✅ GOOD - No sensitive data
logger.info({ email }, 'User attempting sign-in');
```

**Never log:**
- Passwords
- API keys
- Session tokens
- Credit card numbers
- Full message content (PII)

### 3. Use Appropriate Log Levels

```typescript
// ✅ INFO - Normal operation
logger.info({ userId }, 'User requested interpretation');

// ✅ WARN - Potential issue
logger.warn({ costUsd, limit }, 'Cost approaching 80% of limit');

// ✅ ERROR - Failure
logger.error({ error: err.message }, 'LLM API call failed');
```

### 4. Log Costs for Analysis

```typescript
// Track LLM costs for margin analysis
logger.info({
  cost_usd: 0.02,
  tokens: 1000,
  model: 'gpt-4-turbo',
  user_tier: 'trial',
}, 'Interpretation completed');
```

**Rationale:** Enables querying Vercel logs to validate 80% margin goal (PRD requirement).

### 5. Log Before Critical Operations

```typescript
logger.info({ userId, tier }, 'Checking usage limits');
const usageCheck = await checkUsageLimit(userId);

logger.info({ userId, culture_pair }, 'Calling LLM API');
const result = await llmProvider.interpret(...);

logger.info({ userId, costUsd }, 'Updating cost tracking');
await trackCost(userId, costUsd);
```

**Rationale:** If an operation fails, breadcrumbs show exactly where it failed.

## Querying Logs in Vercel

Vercel automatically ingests structured logs. Query logs in Vercel dashboard:

1. Go to Vercel Dashboard → Your Project → Logs
2. Use filters:
   - **userId:** Find all logs for a specific user
   - **cost_usd:** Find expensive interpretations
   - **error:** Find all errors

Example queries:
```
userId:"user-123"
cost_usd:>0.05
error:*timeout*
tier:"trial"
```

## Common Pitfalls

1. **Using console.log:** Always use `logger` instead of `console.log` for structured logging
2. **Logging in loops:** Avoid excessive logging in loops (creates noise)
3. **Not logging context:** Always include context (userId, tier, etc.) for debugging
4. **Logging too much:** Debug logs are disabled in production for a reason
5. **Forgetting error handling:** Always log errors with context (not just error.message)

## Testing Breadcrumbs

Test breadcrumbs by triggering an error and checking Sentry:

1. Visit `/api/admin/sentry-test` (requires admin authentication)
2. Check Sentry dashboard → Issues → Latest error
3. Verify breadcrumbs appear with log context

## Related Documentation

- `/lib/kv/README.md` - KV (Redis) client for cost tracking
- `instrumentation.ts` - Sentry initialization
- `sentry.client.config.ts` - Client-side Sentry config
- `sentry.server.config.ts` - Server-side Sentry config
