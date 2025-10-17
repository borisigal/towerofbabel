# Database Module (`/lib/db`)

This module provides database access patterns for TowerOfBabel, ensuring secure, performant, and maintainable database operations.

## Critical Patterns

### 1. Repository Pattern (MANDATORY)

**Rule:** ALL database access MUST go through repository functions.

```typescript
// ❌ FORBIDDEN - Direct Prisma in API route
export async function POST(req: NextRequest) {
  const user = await prisma.user.findUnique({ where: { id } }); // WRONG
}

// ✅ REQUIRED - Repository function
import { findUserById } from '@/lib/db/repositories/userRepository';

export async function POST(req: NextRequest) {
  const user = await findUserById(userId); // CORRECT
}
```

**Benefits:**
- Centralized database access (easy to test and mock)
- Circuit breaker protection on all queries
- Consistent query optimization
- Future database migration made easier

### 2. Circuit Breaker Protection (MANDATORY)

**Rule:** ALL repository functions MUST wrap Prisma calls with `executeWithCircuitBreaker()`.

```typescript
import { executeWithCircuitBreaker } from '@/lib/db/connectionMonitor';

export async function findUserById(userId: string) {
  return executeWithCircuitBreaker(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tier: true }
    })
  );
}
```

**Why:** Prevents cascading failures when connection pool is exhausted (Supabase free tier: 60 connections).

### 3. Explicit `select` Clauses (MANDATORY)

**Rule:** NEVER fetch all columns. Always use explicit `select`.

```typescript
// ❌ BAD - Fetches all columns (slow, holds connection longer)
const user = await prisma.user.findUnique({ where: { id } });

// ✅ GOOD - Fetches only needed columns (fast, releases connection faster)
const user = await prisma.user.findUnique({
  where: { id },
  select: { tier: true, messages_used_count: true }
});
```

**Impact:** Reduces query time by 30-50%, releases connections faster, prevents pool exhaustion.

## File Structure

```
lib/db/
├── prisma.ts                    # Prisma singleton (prevents connection leaks)
├── connectionMonitor.ts         # Circuit breaker for connection pool protection
├── README.md                    # This file
└── repositories/
    └── userRepository.ts        # User database operations
```

## Usage Examples

### Creating a User

```typescript
import { createUser } from '@/lib/db/repositories/userRepository';

// After Supabase Auth sign-up
const { data: { user } } = await supabase.auth.signUp({ email, password });

const userRecord = await createUser({
  id: user.id,  // Must match Supabase Auth UUID
  email: user.email,
  name: user.user_metadata.name
});
```

### Authorization Check (Database as Source of Truth)

```typescript
import { findUserById } from '@/lib/db/repositories/userRepository';

// ✅ CORRECT - Query database for tier (source of truth)
const userRecord = await findUserById(userId);
if (userRecord.tier === 'trial' && userRecord.messages_used_count >= 10) {
  return error('Trial limit exceeded');
}

// ❌ FORBIDDEN - Using JWT app_metadata (can be stale for 1 hour)
const { data: { user } } = await supabase.auth.getUser();
if (user.app_metadata.tier === 'trial') { // WRONG - JWT is cached!
  return error('Trial limit exceeded');
}
```

### Incrementing Usage

```typescript
import { incrementUserUsage } from '@/lib/db/repositories/userRepository';

// After successful interpretation
const updatedUser = await incrementUserUsage(userId);
console.log(`User has ${updatedUser.messages_used_count} messages used`);
```

## Connection Pooling

### Configuration

The database connection uses PgBouncer transaction pooling to prevent connection exhaustion:

```bash
# .env
DATABASE_URL="postgresql://postgres:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&statement_cache_size=0"
```

**Parameters:**
- `pgbouncer=true` - Enables PgBouncer pooling
- `connection_limit=1` - Each serverless function creates max 1 connection
- `statement_cache_size=0` - Disables prepared statements (required for PgBouncer)

### Circuit Breaker

The circuit breaker opens after 5 consecutive connection errors:

```typescript
import { getCircuitBreakerState, resetCircuitBreaker } from '@/lib/db/connectionMonitor';

// Check circuit breaker state
const state = getCircuitBreakerState();
if (state.isOpen) {
  console.error('Circuit breaker open - database unavailable');
}

// Admin-only: Reset circuit breaker
resetCircuitBreaker(); // Only after verifying database is healthy
```

## Common Pitfalls

### 1. Forgetting PgBouncer Parameters

```bash
# ❌ WRONG - Missing pgbouncer parameters
DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"

# ✅ CORRECT - Includes pgbouncer parameters
DATABASE_URL="postgresql://postgres:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&statement_cache_size=0"
```

### 2. Not Using Prisma Singleton

Development hot-reload will create new PrismaClient instances, exhausting connections. Always import from `/lib/db/prisma.ts`.

```typescript
// ❌ WRONG - Creates new instance
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ✅ CORRECT - Uses singleton
import prisma from '@/lib/db/prisma';
```

### 3. Skipping Circuit Breaker

Direct Prisma calls bypass connection monitoring:

```typescript
// ❌ WRONG - Bypasses circuit breaker
const user = await prisma.user.findUnique({ where: { id } });

// ✅ CORRECT - Uses circuit breaker
const user = await executeWithCircuitBreaker(() =>
  prisma.user.findUnique({ where: { id } })
);
```

### 4. Using JWT for Authorization

JWT caches tier for 1 hour. When user upgrades, database updates immediately but JWT still shows "trial":

```typescript
// ❌ FORBIDDEN - JWT can be stale
const { data: { user } } = await supabase.auth.getUser();
if (user.app_metadata.tier === 'trial') { // Can block paid users!
  return error('Upgrade required');
}

// ✅ REQUIRED - Database is source of truth
const userRecord = await findUserById(user.id);
if (userRecord.tier === 'trial') { // Always correct
  return error('Upgrade required');
}
```

**ESLint Rule:** The project has a custom ESLint rule that flags `user.app_metadata` usage.

## Testing

Repository functions are easy to test by mocking:

```typescript
import { vi } from 'vitest';
import * as userRepository from '@/lib/db/repositories/userRepository';

// Mock repository function
vi.spyOn(userRepository, 'findUserById').mockResolvedValue({
  id: 'user-123',
  tier: 'trial',
  messages_used_count: 5,
});

// Test API route that uses repository
const response = await POST(mockRequest);
expect(response.status).toBe(200);
```

## Migrations

### Development

```bash
# Create and apply migration
npx prisma migrate dev --name add_field

# Push schema without creating migration (for prototyping)
npx prisma db push
```

### Production (Vercel)

Migrations are applied automatically during build via `prisma migrate deploy`.

## Troubleshooting

### "Too many connections" Error

1. Check circuit breaker state: `getCircuitBreakerState()`
2. Verify `connection_limit=1` in DATABASE_URL
3. Ensure using Prisma singleton (not creating new instances)
4. Check for connection leaks (queries not awaited)

### "Prepared statement already exists" Error

PgBouncer doesn't support prepared statements. Add `statement_cache_size=0` to DATABASE_URL.

### Migration Failures

If using PgBouncer pooler for migrations, you may need direct connection:

```bash
# Set DIRECT_URL for migrations
DIRECT_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
```

Then add to `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Architecture References

- [Critical Risk Mitigation](/docs/architecture/14-critical-risk-mitigation.md) - Connection pool exhaustion
- [Coding Standards](/docs/architecture/16-coding-standards.md) - Repository pattern requirements
- [Data Models](/docs/architecture/4-data-models.md) - Database schema design

## Support

For database issues, check:
1. `.ai/debug-log.md` - Development debugging notes
2. Supabase dashboard - Connection metrics
3. Vercel logs - Production errors
