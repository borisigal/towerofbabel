# Authentication Pattern Documentation

**CRITICAL:** This document explains the database-as-source-of-truth pattern that MUST be followed for all tier/usage authorization checks in TowerOfBabel.

---

## The Problem: JWT Session Delay

Supabase Auth uses JWTs (JSON Web Tokens) for session management. JWTs cache user metadata (tier, usage count, etc.) for **up to 1 hour**. This creates a critical timing issue:

**Scenario:**
1. Trial user exhausts 10 free messages
2. User upgrades to Pro tier ($10/month) via Lemon Squeezy
3. Database immediately updates: `tier="pro"`
4. **BUT** JWT still cached: `user.app_metadata.tier="trial"` for up to 1 hour
5. ❌ User is blocked from using the service despite paying → **CRITICAL UX BUG**

This is unacceptable for a paid product. The solution: **Database as Source of Truth**.

---

## The Solution: Database-as-Source-of-Truth Pattern

### Rule: Authentication vs. Authorization

| Concept | Source | Use Case | Example |
|---------|--------|----------|---------|
| **Authentication** | JWT (Supabase Auth) | Identity check | "Who is this user? What's their ID?" |
| **Authorization** | Database (Prisma) | Permission check | "What tier are they? How many messages used?" |

### Code Pattern

#### ❌ FORBIDDEN - Using JWT for Authorization

```typescript
// API route: /api/interpret
const { data: { user } } = await supabase.auth.getUser();

// WRONG - Using JWT metadata for tier check
if (user.app_metadata.tier === 'trial' && user.app_metadata.messages_used >= 10) {
  return error('Limit exceeded'); // ❌ Uses stale cached data
}
```

**Why This Fails:**
- JWT caches `app_metadata` for up to 1 hour
- After payment, database updates immediately but JWT remains stale
- Paid users get blocked from service they just purchased

#### ✅ REQUIRED - Database as Source of Truth

```typescript
// API route: /api/interpret
import { findUserById } from '@/lib/db/repositories/userRepository';

// Step 1: JWT for authentication (identity check)
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return error('Unauthorized'); // Authentication failed
}

// Step 2: Database for authorization (permission check)
const userRecord = await findUserById(user.id);
if (!userRecord) {
  return error('User not found');
}

// Step 3: Check tier/usage from DATABASE (real-time data)
if (userRecord.tier === 'trial' && userRecord.messages_used_count >= 10) {
  return error('Limit exceeded'); // ✅ Uses real-time data
}
```

**Why This Works:**
- Database updates immediately after payment
- Authorization checks always use real-time data
- Paid users get instant access after upgrade

---

## Critical Use Cases

### Use Case 1: API Route Authorization

**Location:** All API routes in `/app/api/**`

**Pattern:**
```typescript
export async function POST(req: NextRequest) {
  // 1. AUTHENTICATION (JWT) - Identity check
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }},
      { status: 401 }
    );
  }

  // 2. AUTHORIZATION (Database) - Permission check
  const userRecord = await findUserById(user.id);
  if (!userRecord) {
    return NextResponse.json(
      { success: false, error: { code: 'USER_NOT_FOUND', message: 'User record not found' }},
      { status: 404 }
    );
  }

  // 3. TIER/USAGE CHECK (Database) - Business logic
  if (userRecord.tier === 'trial' && userRecord.messages_used_count >= 10) {
    return NextResponse.json(
      { success: false, error: { code: 'LIMIT_EXCEEDED', message: 'Trial limit reached' }},
      { status: 403 }
    );
  }

  // 4. BUSINESS LOGIC
  // ... proceed with interpretation
}
```

### Use Case 2: Middleware Route Protection

**Location:** `/middleware.ts`

**Pattern:**
```typescript
export async function middleware(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware ONLY checks authentication (identity)
  // Authorization (tier/usage) is handled in API routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return response;
}
```

**Why Middleware is Limited to Authentication:**
- Middleware runs on EVERY request (high frequency)
- Database queries in middleware would be expensive
- Authorization checks belong in API routes (lower frequency, only when needed)

### Use Case 3: Payment Flow (Critical)

**Location:** Lemon Squeezy webhook handler `/app/api/webhooks/lemonsqueezy/route.ts`

**Pattern:**
```typescript
// Webhook: subscription_payment_success
export async function POST(req: NextRequest) {
  // 1. Verify webhook signature
  const signature = req.headers.get('x-signature');
  if (!verifySignature(signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse webhook payload
  const { customer_id, subscription_id } = await req.json();

  // 3. Update user tier in DATABASE (immediate effect)
  const user = await findUserByLemonSqueezyCustomerId(customer_id);
  await updateUserTier(user.id, 'pro');

  // 4. JWT will be stale for up to 1 hour, but database is updated
  // Next API request will query database and allow access immediately

  return NextResponse.json({ success: true });
}
```

**Critical Flow:**
1. User pays → Lemon Squeezy sends webhook → Database updates `tier="pro"`
2. User makes API request → JWT still has `tier="trial"` (stale)
3. API route queries database → Gets `tier="pro"` (real-time)
4. User gets immediate access despite stale JWT ✅

---

## Enforcement

### ESLint Rule

The project has a custom ESLint rule to prevent accidental JWT metadata usage:

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-properties": ["error", {
      "object": "user",
      "property": "app_metadata",
      "message": "CRITICAL: NEVER use user.app_metadata for tier/usage checks. Query database instead (see /lib/auth/README.md)."
    }]
  }
}
```

This rule will **fail builds** if you try to access `user.app_metadata` in code.

### Code Review Checklist

Before merging any PR, verify:
- [ ] API routes use `findUserById()` for tier/usage checks
- [ ] No `user.app_metadata` usage for authorization
- [ ] Middleware only checks authentication, not authorization
- [ ] Payment webhooks update database immediately

---

## Supabase Client Usage

### Browser Client (Client Components)

**File:** `lib/auth/supabaseClient.ts`

**Use in:**
- Sign-in page (`app/(auth)/sign-in/page.tsx`)
- Client components with `'use client'` directive
- OAuth flows

**Example:**
```typescript
'use client';
import { createClient } from '@/lib/auth/supabaseClient';

export function SignInButton() {
  const supabase = createClient();

  const handleSignIn = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    // ...
  };
}
```

### Server Client (Server Components, API Routes, Middleware)

**File:** `lib/auth/supabaseServer.ts`

**Use in:**
- Middleware (`middleware.ts`)
- API routes (`app/api/**`)
- Server components (default Next.js components)
- Server actions

**Example:**
```typescript
import { createClient } from '@/lib/auth/supabaseServer';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // ...
}
```

---

## Middleware Implementation

**File:** `/middleware.ts`

**Purpose:**
- Protect dashboard routes from unauthenticated users
- Redirect unauthenticated users to `/sign-in`

**Pattern:**
```typescript
export async function middleware(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  // Protect /dashboard/* routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Important:**
- Middleware runs on **every request**
- Only checks **authentication** (is user signed in?)
- Does NOT check **authorization** (tier, usage limits)
- Authorization is handled in API routes with database queries

---

## Troubleshooting

### Issue: "User just paid but still gets 'Trial limit exceeded' error"

**Diagnosis:**
- Check if API route uses `user.app_metadata` for tier check
- Search codebase for `app_metadata` usage: `grep -r "app_metadata" app/api/`

**Fix:**
```typescript
// BEFORE (incorrect)
if (user.app_metadata.tier === 'trial') { ... }

// AFTER (correct)
const userRecord = await findUserById(user.id);
if (userRecord.tier === 'trial') { ... }
```

### Issue: "User signed out but still sees dashboard"

**Diagnosis:**
- Check if middleware is configured correctly
- Verify middleware matcher pattern includes dashboard routes

**Fix:**
- Ensure `middleware.ts` has correct matcher configuration
- Clear browser cookies and test again

### Issue: "Sign-in works but user record not created in database"

**Diagnosis:**
- Check auth callback route (`app/auth/callback/route.ts`)
- Verify `getOrCreateUser()` is called after session exchange

**Fix:**
- Ensure callback route calls `await getOrCreateUser(user)` after successful authentication
- Check database connection is working
- Verify Prisma schema matches Supabase tables

---

## Session Management

### Session Duration

**Default:** 7 days

**Configuration:** Supabase dashboard → Authentication → Settings → JWT expiry

**Auto-Refresh:** Supabase SDK automatically refreshes session before expiration

### Session Storage

**Cookie Name:** `sb-[project]-auth-token`

**Properties:**
- HttpOnly: Yes (prevents JavaScript access for security)
- Secure: Yes (HTTPS only in production)
- SameSite: Lax

### Session Persistence

**Behavior:**
- Survives page refreshes (cookie persists)
- Survives browser close/reopen (cookie persists)
- Cleared on sign-out
- Expires after 7 days of inactivity

---

## Related Files

### Authentication Files
- `lib/auth/supabaseClient.ts` - Browser-side Supabase client
- `lib/auth/supabaseServer.ts` - Server-side Supabase client
- `lib/auth/authService.ts` - User creation service
- `app/auth/callback/route.ts` - Auth callback handler
- `middleware.ts` - Route protection middleware

### Repository Files
- `lib/db/repositories/userRepository.ts` - User database operations
- `lib/db/prisma.ts` - Prisma client singleton

### Architecture Documentation
- `docs/architecture/14-critical-risk-mitigation.md` - Risk #1: JWT Session Delay
- `docs/architecture/16-coding-standards.md` - API Route Patterns

---

## Common Pitfalls to Avoid

1. ❌ **Using JWT for tier/usage checks:** Always query database
2. ❌ **Forgetting to call `getOrCreateUser()` in callback:** User won't exist in database
3. ❌ **Mismatched user IDs:** Always use `authUser.id` when creating database record
4. ❌ **Missing middleware matcher:** Dashboard won't be protected
5. ❌ **Using browser client in server components:** Use `supabaseServer.ts` instead
6. ❌ **Checking authorization in middleware:** Keep middleware lightweight, check in API routes

---

## Testing Recommendations

### Manual Testing

1. **Authentication Flow:**
   - Sign in with magic link
   - Sign in with Google OAuth
   - Verify user created in database
   - Verify redirects to dashboard

2. **Authorization Flow:**
   - Create trial user with 10 messages used
   - Upgrade to Pro via webhook simulation
   - Immediately attempt interpretation
   - Verify access granted (database check, not JWT)

3. **Session Management:**
   - Sign in, refresh page → still authenticated
   - Sign out → redirects to landing page
   - Access dashboard without auth → redirects to sign-in

### Automated Testing (Future Story)

```typescript
// Example integration test (Story 1.5A)
describe('Payment Flow - Immediate Tier Update', () => {
  it('should allow interpretation immediately after Pro upgrade', async () => {
    // 1. Create trial user with 10/10 messages exhausted
    const user = await createTestUser({ tier: 'trial', messages_used_count: 10 });

    // 2. Simulate Lemon Squeezy webhook
    await simulateLemonSqueezyWebhook('subscription_payment_success', {
      customer_id: user.lemonsqueezy_customer_id,
    });

    // 3. Attempt interpretation IMMEDIATELY (JWT still stale)
    const response = await fetch('/api/interpret', {
      method: 'POST',
      headers: { Cookie: user.sessionCookie }, // Stale JWT with tier=trial
      body: JSON.stringify({ message: 'test', ... })
    });

    // 4. MUST succeed (database check, not JWT check)
    expect(response.status).toBe(200);
  });
});
```

---

**Last Updated:** Story 1.4 - Authentication Implementation
**Author:** Development Agent (James)
**Review Required:** Yes - Critical security pattern
