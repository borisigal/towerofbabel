# LLM Provider Abstraction & Cost Protection

## Purpose

This module provides:
1. **LLM Service Layer**: Anthropic Claude Sonnet 4.5 adapter for cultural interpretation
2. **Provider Abstraction**: Unified interface for different LLM providers (Anthropic, OpenAI, xAI, Google)
3. **Cost Protection Circuit Breaker**: 3-layer cost protection to prevent runaway API costs

---

## LLM Service Layer (Story 2.2)

### Overview

The LLM service layer provides cultural interpretation using Claude Sonnet 4.5. It handles:
- Prompt generation (same-culture vs. cross-culture templates)
- API calls with timeout and retry logic
- Response parsing and validation
- Cost calculation and logging
- Comprehensive error handling

### Provider Selection

**Selected Provider:** Anthropic Claude Sonnet 4.5

**Rationale:**
- **Cost:** ~$0.012 per interpretation (88% margin on $0.10 PAYG price)
- **Quality:** Superior reasoning for cultural interpretation nuances
- **Privacy:** Zero data retention policy (best-in-class for user trust)
- **Speed:** 3-4 seconds average response time (< 5s requirement)

### Quick Start

```typescript
import { createLLMProvider } from '@/lib/llm/factory';

// Create provider instance
const llmProvider = createLLMProvider();

// Interpret a message
const result = await llmProvider.interpret({
  message: 'I appreciate your hard work on this project.',
  senderCulture: 'american',
  receiverCulture: 'japanese',
  sameCulture: false
});

console.log(result.interpretation.bottomLine);
console.log(`Cost: $${result.metadata.costUsd}`);
console.log(`Response time: ${result.metadata.responseTimeMs}ms`);
```

### Supported Providers

| Provider | Model | Status | Cost/Interp | Privacy | Speed |
|----------|-------|--------|-------------|---------|-------|
| **Anthropic** | Claude Sonnet 4.5 | ✅ Implemented | ~$0.012 | Zero retention | 3-4s |
| OpenAI | GPT-4 Turbo | ❌ Not yet | ~$0.015 | 30-day retention | 3-5s |
| xAI | Grok | ❌ Not yet | ~$0.010 | TBD | 4-6s |
| Google | Gemini 1.5 Pro | ❌ Not yet | ~$0.008 | 30-day retention | 4-5s |

**Note:** Story 2.2 implements Anthropic only. Other providers can be added later using the adapter pattern.

### Configuration

Add to `.env.local`:

```bash
# LLM Provider (anthropic | openai | xai | google)
LLM_PROVIDER=anthropic

# Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your_api_key_here

# Model identifier
LLM_MODEL=claude-sonnet-4-5-20250929

# Request timeout (milliseconds)
LLM_TIMEOUT_MS=10000
```

Get your Anthropic API key: https://console.anthropic.com/

### Prompt Templates

The service uses two prompt templates optimized for different scenarios:

#### Same-Culture Template

Used when sender and receiver share the same culture (e.g., American → American).

**Characteristics:**
- Emphasizes simple, clear explanation ("explain like 14-year-old")
- Single emotion scores (senderScore only)
- Focuses on subtext and what's really meant

**Example:**

```typescript
const result = await llmProvider.interpret({
  message: 'Thanks for your help!',
  senderCulture: 'american',
  receiverCulture: 'american',
  sameCulture: true
});

// Result includes:
// - bottomLine: Simple explanation
// - culturalContext: Communication style insights
// - emotions: [{ name: 'Gratitude', senderScore: 8 }, ...]
```

#### Cross-Culture Template

Used when sender and receiver have different cultures (e.g., American → Japanese).

**Characteristics:**
- Emphasizes cultural differences in communication
- Dual emotion scores (senderScore and receiverScore)
- Focuses on potential misunderstandings

**Example:**

```typescript
const result = await llmProvider.interpret({
  message: 'I appreciate your hard work on this project.',
  senderCulture: 'american',
  receiverCulture: 'japanese',
  sameCulture: false
});

// Result includes:
// - bottomLine: Cross-cultural explanation
// - culturalContext: Cultural differences insights
// - emotions: [{ name: 'Gratitude', senderScore: 8, receiverScore: 5 }, ...]
```

### Error Handling

The service throws specific error types for different failure scenarios:

```typescript
import {
  LLMTimeoutError,
  LLMRateLimitError,
  LLMAuthError,
  LLMParsingError,
  LLMProviderError,
} from '@/lib/llm/errors';

try {
  const result = await llmProvider.interpret(request);
} catch (error) {
  if (error instanceof LLMTimeoutError) {
    // Request exceeded 10 seconds
    return { error: 'Request timed out. Please try again.' };
  }

  if (error instanceof LLMRateLimitError) {
    // Rate limit exceeded (429)
    const retryAfter = error.retryAfter; // seconds
    return { error: `Rate limited. Retry after ${retryAfter}s` };
  }

  if (error instanceof LLMAuthError) {
    // Invalid API key (401)
    logger.error('Check ANTHROPIC_API_KEY in .env.local');
    return { error: 'Service configuration error' };
  }

  if (error instanceof LLMParsingError) {
    // Malformed response from Claude
    logger.error('Failed to parse Claude response', { error });
    return { error: 'Failed to process interpretation' };
  }

  if (error instanceof LLMProviderError) {
    // Generic API error
    const statusCode = error.statusCode;
    return { error: `Service error (${statusCode})` };
  }
}
```

### Response Structure

```typescript
interface LLMResult {
  interpretation: {
    bottomLine: string;          // 2-3 sentence explanation
    culturalContext: string;     // 2-4 sentence cultural insights
    emotions: Array<{
      name: string;              // Dynamically detected emotion
      senderScore: number;       // 0-10 intensity in sender's culture
      receiverScore?: number;    // 0-10 intensity in receiver's culture (cross-culture only)
      explanation?: string;      // Why this emotion is present
    }>;
  };
  metadata: {
    costUsd: number;             // Cost of this interpretation
    responseTimeMs: number;      // Response time
    tokenCount: number;          // Total tokens used
    model: string;               // Model used (e.g., claude-sonnet-4-5-20250929)
  };
}
```

### Cost Tracking

The adapter automatically calculates costs based on Claude Sonnet 4.5 pricing:

- **Input tokens:** $3.00 per 1M tokens
- **Output tokens:** $15.00 per 1M tokens
- **Average cost:** ~$0.012 per interpretation

Costs are logged automatically for monitoring:

```typescript
// Logged before LLM call
logger.info({
  timestamp: '2025-10-22T10:00:00.000Z',
  culturePair: 'american → japanese',
  characterCount: 42,
  sameCulture: false,
}, 'Calling Claude for interpretation');

// Logged after successful call
logger.info({
  timestamp: '2025-10-22T10:00:04.123Z',
  responseTimeMs: 4123,
  costUsd: 0.012,
  tokenCount: 1250,
  model: 'claude-sonnet-4-5-20250929',
  success: true,
}, 'Claude interpretation successful');
```

**CRITICAL:** Message content is NEVER logged (privacy-first design).

### Testing

#### Unit Tests

Run unit tests (no API key required):

```bash
npm test tests/unit/lib/llm/prompts.test.ts          # Prompt generation
npm test tests/unit/lib/llm/anthropicAdapter.test.ts # Response parsing & errors
```

**Coverage:** 80%+ for service layer (Vitest with mocked API responses)

#### Integration Tests

Run integration tests with real API (requires API key):

```bash
# Set ANTHROPIC_API_KEY in .env.local first
npm test tests/integration/lib/llm/anthropicAdapter.integration.test.ts
```

**Note:** Integration tests are skipped in CI (only run locally for validation).

---

## Cost Circuit Breaker Integration

**CRITICAL:** All LLM API calls MUST check cost budget BEFORE making request and track cost AFTER receiving response.

### Integration Pattern (Epic 2 Story 2.3)

```typescript
import { checkCostBudget, trackCost } from '@/lib/llm/costCircuitBreaker';

// BEFORE LLM call
const costCheck = await checkCostBudget(user.id);
if (!costCheck.allowed) {
  logger.warn('LLM call blocked by cost circuit breaker', {
    userId: user.id,
    layer: costCheck.layer,
  });
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'SERVICE_OVERLOADED',
        message: 'Service temporarily overloaded. Please try again later.',
      },
    },
    { status: 503 }
  );
}

// Make LLM API call
const result = await llmProvider.interpret(
  body.message,
  body.sender_culture,
  body.receiver_culture,
  body.mode
);

// AFTER LLM call - track cost
await trackCost(user.id, result.metadata.costUsd);
```

## 3-Layer Protection Architecture

The cost circuit breaker implements 3 independent protection layers to prevent runaway costs:

### Layer 1: Daily Cost Limit ($50/day default)

**Purpose:** Prevents total daily cost overruns across all users

```typescript
// Redis key: cost:daily:2025-10-19 → $12.34
// TTL: 24 hours (auto-resets at midnight UTC)
// Threshold: $50/day (configurable via COST_LIMIT_DAILY)
// Alert: Sentry warning when > 80% ($40)
```

**When triggered:** No users can make LLM calls until midnight UTC reset

### Layer 2: Hourly Cost Limit ($5/hour default)

**Purpose:** Catches sudden cost spikes (e.g., coordinated abuse attack)

```typescript
// Redis key: cost:hourly:2025-10-19:14 → $0.85
// TTL: 1 hour (auto-resets every hour)
// Threshold: $5/hour (configurable via COST_LIMIT_HOURLY)
// Alert: Sentry warning when > 80% ($4)
```

**Rationale:** Even if daily limit is $50, hourly limit prevents spending entire budget in 1 hour

### Layer 3: Per-User Daily Limit ($1/user/day default)

**Purpose:** Prevents individual user abuse (e.g., automated script)

```typescript
// Redis key: cost:user:user-123:2025-10-19 → $0.45
// TTL: 24 hours (auto-resets at midnight UTC)
// Threshold: $1/user/day (configurable via COST_LIMIT_USER_DAILY)
// No alert: Per-user limits are expected (trial users exhaust quota)
```

**Rationale:** If one user consumes entire daily budget, other users can still use service

## Fail-Open Behavior

**Critical Design Decision:** When Redis (Vercel KV) is unavailable, the circuit breaker **fails open** (allows requests) instead of **failing closed** (blocking requests).

**Rationale:**
- User Experience: If Redis is down, users can still use service
- Temporary Risk: Redis downtime is rare (Upstash 99.99% uptime)
- Alerting: Sentry errors show Redis issues immediately
- Graceful Degradation: Service degrades gracefully instead of hard failure

**Implementation:**

```typescript
export async function checkCostBudget(userId: string): Promise<CostCheckResult> {
  try {
    // ... all layer checks
    return { allowed: true };
  } catch (error) {
    logger.error('Cost circuit breaker failed - allowing request (fail open)', { error });
    return { allowed: true }; // Don't block users if Redis down
  }
}
```

## Cost Limits Configuration

Cost limits are configurable via environment variables:

```bash
# Daily cost limit for all users combined (USD)
# Default: $50/day prevents runaway costs
COST_LIMIT_DAILY=50

# Hourly cost limit for all users combined (USD)
# Default: $5/hour catches sudden spikes
COST_LIMIT_HOURLY=5

# Per-user daily cost limit (USD)
# Default: $1/user/day prevents individual abuse
COST_LIMIT_USER_DAILY=1
```

**Default Values Rationale:**
- **$50/day:** Based on 2,500 interpretations/day × $0.02/interpretation = $50 max daily cost
- **$5/hour:** 1/10th of daily limit prevents burst spending entire budget
- **$1/user/day:** 50 interpretations × $0.02 = $1 per user (reasonable max for single user)

## Monitoring

### Admin Endpoint: `/api/admin/cost-metrics`

**Access:** Admin-only (requires `is_admin` flag in database)

**Response Format:**

```json
{
  "success": true,
  "daily": {
    "current": 12.34,
    "limit": 50,
    "percentage": 24.68
  },
  "hourly": {
    "current": 0.85,
    "limit": 5,
    "percentage": 17
  },
  "topUsers": [
    { "userId": "user-abc", "cost": 0.75 },
    { "userId": "user-xyz", "cost": 0.45 },
    { "userId": "user-123", "cost": 0.30 }
  ]
}
```

**Use Cases:**
- **Abuse Detection:** Identify users with abnormally high costs
- **Cost Trending:** Monitor daily/hourly cost patterns over time
- **Budget Planning:** Determine if cost limits need adjustment

### Sentry Alerts

**3 Types of Alerts:**

1. **Warning Alerts (80% threshold):**
   - Daily cost > $40 (80% of $50 limit)
   - Hourly cost > $4 (80% of $5 limit)
   - Level: `warning`
   - Tags: `circuit_breaker: daily/hourly`, `threshold: 80%`

2. **Error Alerts (circuit breaker triggered):**
   - When requests are blocked due to limit exceeded
   - Level: `error`
   - Tags: `circuit_breaker: daily/hourly/user`, `triggered: true`
   - Includes: userId, layer, currentCost, limit

3. **Error Alerts (Redis unavailable):**
   - When circuit breaker fails to connect to Redis
   - Level: `error`
   - Tags: `component: cost-circuit-breaker`, `redis: unavailable`

## Common Pitfalls

### 1. Forgetting to check cost budget before LLM call
**Risk:** Costs accumulate without circuit breaker protection
**Fix:** Add `checkCostBudget` BEFORE every LLM API call

### 2. Forgetting to track cost after LLM call
**Risk:** Circuit breaker never triggers (no costs tracked)
**Fix:** Add `trackCost` AFTER every successful LLM response

### 3. Not setting TTL on Redis keys
**Risk:** Keys never expire, stale data accumulates
**Fix:** Always call `kv.expire` after `kv.incrbyfloat` (handled automatically in `trackCost`)

### 4. Blocking users when Redis unavailable
**Risk:** Service outage during Redis downtime
**Fix:** Fail open in try-catch (return `{ allowed: true }`)

### 5. Using non-atomic operations for cost tracking
**Risk:** Race conditions cause lost cost updates
**Fix:** Always use `kv.incrbyfloat` (atomic), never get-then-set

### 6. Exposing internal cost limits to users
**Risk:** Attackers know exact limits to stay under
**Fix:** Return generic "SERVICE_OVERLOADED" error, not "Cost limit: $50"

### 7. Hard-coding cost limits instead of environment variables
**Risk:** Can't adjust limits without code changes
**Fix:** Load from `process.env.COST_LIMIT_*` with defaults

### 8. Not testing fail-open behavior
**Risk:** Service breaks when Redis unavailable
**Fix:** Unit test must verify `allowed=true` when Redis throws error

## Testing

### Unit Tests

See `/tests/unit/lib/llm/costCircuitBreaker.test.ts` for comprehensive unit tests covering:
- Cost within all limits → allowed=true
- Daily limit exceeded → allowed=false, layer='daily'
- Hourly limit exceeded → allowed=false, layer='hourly'
- Per-user limit exceeded → allowed=false, layer='user'
- Redis unavailable → allowed=true (fail open), warning logged
- Cost tracking increments all counters atomically
- TTL set on all cost counters

### Local Testing

Set low cost limits in `.env.local` for faster testing:

```bash
COST_LIMIT_DAILY=1.0
COST_LIMIT_HOURLY=0.5
COST_LIMIT_USER_DAILY=0.1
```

Then test each layer triggers correctly:

```typescript
// Test daily limit
await trackCost('user-1', 0.5); // 3 times = $1.50 > $1.00 limit
const result = await checkCostBudget('user-2');
// Expected: { allowed: false, layer: 'daily' }

// Test hourly limit
await trackCost('user-2', 0.3); // 2 times = $0.60 > $0.50 limit
const result = await checkCostBudget('user-3');
// Expected: { allowed: false, layer: 'hourly' }

// Test user limit
await trackCost('user-4', 0.05); // 3 times = $0.15 > $0.10 limit
const result = await checkCostBudget('user-4');
// Expected: { allowed: false, layer: 'user' }
```

## Architecture Integration

**Dependencies:**
- Vercel KV (Redis): `/lib/kv/client.ts` from Story 1.5B
- Sentry: `@sentry/nextjs` from Story 1.5B
- Logger: `/lib/observability/logger.ts` from Story 1.3

**Future Integration:**
- Epic 2 Story 2.3: Interpretation API will use cost circuit breaker before all LLM calls
- Epic 3: Usage analytics will aggregate cost data for billing
