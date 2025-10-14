# Epic 1: Foundation & Core Infrastructure (RESTRUCTURED)

**Expanded Goal:** Establish complete project foundation including Next.js application setup, TypeScript configuration, Tailwind CSS, testing framework, Git repository, Vercel deployment pipeline with preview and production environments, PostgreSQL database with Prisma ORM and RLS policies, authentication system (magic link + Google OAuth), monitoring infrastructure (Redis + Sentry), cost protection circuit breakers, and a basic dashboard that validates the entire stack is operational and deployable.

**⚠️ RESTRUCTURE NOTES:**
- Original Epic 1 had 5 stories with critical sequencing issues
- Restructured into 7 stories to fix dependency gaps and infrastructure validation
- See validation report for detailed rationale

---

## Story 1.1: Initialize Next.js Project with Testing Framework and Core Setup

**As a** developer,
**I want** a Next.js 14+ project initialized with TypeScript, Tailwind CSS, testing framework, environment variable template, health-check route, and project documentation,
**so that** I have a complete development foundation with testing capabilities and all infrastructure pieces ready for subsequent stories.

### Acceptance Criteria

1. Next.js 14+ project created with App Router enabled and TypeScript configured in strict mode
2. Tailwind CSS installed and configured with responsive breakpoints (mobile <640px, tablet 640-1024px, desktop >1024px)
3. ESLint and Prettier configured with TypeScript rules and auto-formatting on save
4. **CRITICAL RISK MITIGATION:** ESLint rule added to prevent JWT metadata usage for tier/usage checks:
   ```javascript
   "no-restricted-properties": ["error", {
     "object": "user",
     "property": "app_metadata",
     "message": "NEVER use user.app_metadata for tier/usage. Query database instead."
   }]
   ```
5. **NEW:** Vitest testing framework installed and configured:
   - Vitest 1.2+ with TypeScript support
   - React Testing Library 14+ for component tests
   - Sample test file created and passing (e.g., `tests/unit/sample.test.ts`)
   - Test scripts added to package.json (`npm test`, `npm run test:watch`)
6. **NEW:** Environment variable template created:
   - `.env.local.example` file with all required variables documented
   - Comments explain each variable's purpose
   - Template includes: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, LEMONSQUEEZY_API_KEY, LLM_API_KEY (placeholders)
7. **NEW:** Health-check API route created at `/api/health`:
   - Returns JSON: `{"status": "ok", "timestamp": "ISO-8601", "database": "pending"}`
   - Database status shows "pending" until Story 1.3 completes
   - Route accessible and returns 200 OK
8. **NEW:** README.md created with local setup instructions:
   - Prerequisites (Node.js version, npm/yarn)
   - Clone and install steps
   - Environment variable setup (copy .env.local.example)
   - Run development server
   - Run tests
9. Project structure created: /app, /components, /lib, /prisma, /public, /tests directories
10. Basic layout component with responsive navigation shell (empty, placeholder nav bar)
11. Development server runs successfully on localhost:3000
12. TypeScript compilation succeeds with no errors
13. Git repository initialized with meaningful .gitignore (node_modules, .env*, .next, etc.)

### Dependencies
- None (first story)

### Validates
- ✅ Testing framework ready for all subsequent stories
- ✅ Environment variable management system established
- ✅ Health-check route exists for Story 1.2 deployment validation
- ✅ Documentation foundation for developer onboarding

---

## Story 1.2: Set Up Vercel Deployment Pipeline

**As a** developer,
**I want** Vercel connected to the Git repository with automatic deployments for preview and production,
**so that** every code change is automatically deployed and testable in live environments.

### Acceptance Criteria

1. Vercel project created and linked to Git repository (GitHub/GitLab)
2. Automatic preview deployments configured for all branches (unique URL per branch)
3. Production deployment configured for main branch (custom domain optional for MVP)
4. **UPDATED:** Environment variables configured in Vercel dashboard from .env.local.example template:
   - All variables from template added to Vercel (preview and production environments)
   - Placeholder values replaced with actual service credentials (where available)
5. Successful deployment verified with accessible preview URL
6. Build logs show successful Next.js build with no errors
7. Health-check route (/api/health) returns 200 OK in deployed preview environment
   - Response shows `{"status": "ok", "timestamp": "...", "database": "pending"}`

### Dependencies
- **Requires:** Story 1.1 complete (health-check route must exist)

### Validates
- ✅ CI/CD pipeline operational
- ✅ Environment variable system working in deployed environment
- ✅ Health-check route accessible in production

---

## Story 1.3: Configure PostgreSQL Database with Prisma ORM and Security Policies

**As a** developer,
**I want** PostgreSQL database provisioned (Supabase) with Prisma ORM, connection pooling, and row-level security policies configured,
**so that** I have a secure, type-safe, migration-managed database ready for user and interpretation data that scales under load.

### Acceptance Criteria

1. PostgreSQL database provisioned (Supabase free tier)
2. Prisma installed and initialized with PostgreSQL provider
3. **CRITICAL RISK MITIGATION:** Prisma singleton pattern implemented with connection pooling:
   - DATABASE_URL configured with `?pgbouncer=true&connection_limit=1`
   - Singleton pattern implemented in `/lib/db/prisma.ts` prevents connection leaks in serverless functions
   - Query optimization: All queries use explicit `select` clauses (fetch only needed columns)
4. **CRITICAL RISK MITIGATION:** Connection circuit breaker implemented (`/lib/db/connectionMonitor.ts`):
   - Detects "too many connections" errors (Prisma error code P1001)
   - Opens circuit breaker after 5 consecutive connection errors
   - Logs connection pool metrics every 5 minutes
   - Provides `executeWithCircuitBreaker<T>()` wrapper function for all database operations
5. Initial schema defined with User, Interpretation, and Subscription models matching technical assumptions:
   - **User:** id, email, name, created_at, tier, messages_used_count, messages_reset_date, lemonsqueezy_customer_id, is_admin
   - **Interpretation:** id, user_id, timestamp, culture_sender, culture_receiver, character_count, interpretation_type, feedback, cost_usd, llm_provider, response_time_ms
   - **Subscription:** id, user_id, lemonsqueezy_subscription_id, status, current_period_end
6. Initial migration created and applied successfully to development database
7. Prisma Client generated with TypeScript types
8. Database connection tested via Prisma Studio or simple query (e.g., `prisma.user.count()`)
9. Database URL stored securely in environment variables (.env.local for local, Vercel env for deployed)
10. **NEW (MOVED FROM STORY 1.4):** Row-level security (RLS) policies enabled on User, Interpretation, Subscription tables:
    - Users can only read/write their own User record
    - Users can only read/write their own Interpretation records
    - Users can only read their own Subscription records
    - RLS policies tested with Supabase SQL editor
11. **UPDATED:** Health-check route updated to test database connection:
    - Update `/api/health` to query database (e.g., `await prisma.user.count()`)
    - Response shows `{"status": "ok", "timestamp": "...", "database": "connected"}` when database reachable
    - Handle database errors gracefully (return "disconnected" status)
12. Seed script created for local development test data:
    - Creates 3 test users: trial (0/10 used), trial (10/10 used), pro (5/100 used)
    - Seeded users have known credentials for testing (documented in README)
    - Seed script: `npm run db:seed`

### Dependencies
- **Requires:** Story 1.2 complete (deployment pipeline for database migrations)

### Validates
- ✅ Database operational and connection pooling working
- ✅ Security policies in place BEFORE authentication uses database
- ✅ Health-check validates full database connectivity
- ✅ Test data available for local development

---

## Story 1.4: Implement Authentication with Supabase Auth

**As a** user,
**I want** to sign in using magic link email or Google OAuth,
**so that** I can access the interpretation tool without managing passwords.

### Acceptance Criteria

1. Supabase Auth configured with magic link (email) provider and Google OAuth provider
2. Supabase client SDK installed (`@supabase/supabase-js`)
3. Sign-in page created at `/app/(auth)/sign-in/page.tsx`:
   - Email input field with validation
   - "Send Magic Link" button
   - "Sign in with Google" button (OAuth)
   - Loading states during authentication
4. Magic link email sent automatically by Supabase (no separate email service needed)
5. Magic link callback route handles email verification and redirects to dashboard
6. Google OAuth flow completes successfully and creates user session
7. User record created in database on first sign-in with default values:
   - tier="trial"
   - messages_used_count=0
   - trial_start_date=now()
   - is_admin=false
8. Middleware created to protect app routes using Supabase session:
   - `/app/(dashboard)/*` routes require authentication
   - Unauthenticated users redirected to `/sign-in`
   - Middleware uses `supabase.auth.getUser()` for session validation
9. **CRITICAL RISK MITIGATION:** Authentication pattern established and documented:
   - JWT provides user identity ONLY (authentication)
   - Database query provides tier/usage (authorization - source of truth)
   - Pattern documented in `/lib/auth/README.md` with code examples:
     ```typescript
     // ✅ CORRECT - Database as source of truth
     const { data: { user } } = await supabase.auth.getUser(); // Identity
     const userRecord = await prisma.user.findUnique({ where: { id: user.id } }); // Authorization
     if (userRecord.tier === 'trial' && userRecord.messages_used_count >= 10) {
       return error('Limit exceeded');
     }
     ```
   - README includes warning about JWT session delay (1 hour cache)
10. Sign-out functionality implemented:
    - Sign-out button calls `supabase.auth.signOut()`
    - Clears session and redirects to landing page
11. Session persists across page refreshes using Supabase session management
12. **UPDATED:** Authentication tested with RLS policies from Story 1.3:
    - Verify users can only access their own data
    - Test cross-user data access blocked by RLS

### Dependencies
- **Requires:** Story 1.3 complete (database and RLS policies must exist)

### Validates
- ✅ Authentication working with both magic link and OAuth
- ✅ User records created in database automatically
- ✅ RLS policies enforce data isolation
- ✅ Authentication pattern documented for all future stories

---

## Story 1.5A: Create Basic Dashboard and Infrastructure Validation

**As a** developer and user,
**I want** an authenticated dashboard that displays my account information and validates the entire stack integration,
**so that** I can verify authentication, database, and deployment are working together correctly.

### Acceptance Criteria

1. Authenticated dashboard page created at `/app/(dashboard)/dashboard/page.tsx`
2. Dashboard displays welcome message: "Welcome to TowerOfBabel, [User Name]"
   - User name fetched from database (not JWT)
3. Dashboard shows user's current tier and messages used: "Trial: 0/10 messages used"
   - Tier and usage fetched from DATABASE query (following Story 1.4 auth pattern)
   - **Explicitly follows pattern from `/lib/auth/README.md`** (database as source of truth)
4. Dashboard includes placeholder for interpretation form:
   - Empty div with clear TODO comment: "<!-- TODO: Epic 2 Story 2.1 - Interpretation form goes here -->"
   - Basic styling/layout in place (Tailwind classes)
5. Navigation bar includes:
   - App logo/name
   - Sign-out button (functional, uses Supabase auth)
   - User email/name display
6. Unauthenticated users redirected to sign-in page when accessing dashboard (middleware from Story 1.4)
7. Dashboard is fully responsive (mobile, tablet, desktop breakpoints)
8. **CRITICAL RISK MITIGATION:** Integration test created for payment flow validation:
   - Test scenario: Trial user (10/10 messages used) → upgrades to Pro → dashboard immediately shows Pro tier
   - Test validates database query (not JWT) is used for tier/usage display
   - Test file: `/tests/integration/payment-flow.test.ts`
   - Uses Vitest framework from Story 1.1
9. Dashboard styling uses Tailwind CSS with consistent spacing and typography
10. Loading states implemented (skeleton or spinner while fetching user data)

### Dependencies
- **Requires:** Story 1.4 complete (authentication must work)
- **Requires:** Story 1.1 complete (testing framework for integration test)

### Validates
- ✅ Full stack integration (auth + database + deployment)
- ✅ Database-as-source-of-truth pattern working correctly
- ✅ User experience foundation established
- ✅ Payment flow will work correctly (via integration test)

---

## Story 1.5B: Set Up Monitoring Infrastructure (Vercel KV + Sentry)

**As a** developer,
**I want** Redis (Vercel KV) and Sentry error monitoring configured and validated,
**so that** I have the infrastructure needed for cost tracking and error monitoring before building features that depend on them.

### Acceptance Criteria

1. **Vercel KV (Redis) Setup:**
   - Vercel KV instance created in Vercel dashboard
   - KV credentials added to environment variables (local and Vercel):
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`
   - Vercel KV SDK installed (`@vercel/kv`)
   - KV client configured in `/lib/kv/client.ts`
2. **Vercel KV Validation:**
   - Test endpoint created at `/api/admin/kv-test` (admin only):
     - Sets a test key: `await kv.set('test:health', 'ok')`
     - Retrieves test key: `await kv.get('test:health')`
     - Returns success/failure status
   - Manual test confirms KV working in deployed environment
3. **Sentry Setup:**
   - Sentry project created (free tier)
   - Sentry SDK installed (`@sentry/nextjs`)
   - Sentry initialized in `instrumentation.ts` (Next.js 14 pattern):
     - DSN configured from environment variable `SENTRY_DSN`
     - Environment set (development, preview, production)
     - Sample rate configured (100% errors, 10% performance for MVP)
4. **Sentry Validation:**
   - Test error endpoint created at `/api/admin/sentry-test` (admin only):
     - Triggers test error: `throw new Error('Sentry test error')`
     - Captures with context: `Sentry.captureException(error, { tags: { test: true } })`
   - Test error appears in Sentry dashboard with correct environment tag
   - Sentry breadcrumbs configured (API requests, database queries logged)
5. **Environment Variables Updated:**
   - `.env.local.example` updated with KV and Sentry variables
   - README updated with KV and Sentry setup instructions
6. **Health-Check Route Enhanced:**
   - `/api/health` updated to include monitoring status:
     ```json
     {
       "status": "ok",
       "timestamp": "...",
       "database": "connected",
       "kv": "connected",
       "sentry": "active"
     }
     ```
   - Gracefully handles monitoring service failures (don't block health check)
7. **No Features Built Yet:**
   - This story only sets up infrastructure
   - Cost circuit breaker and tracking deferred to Story 1.5C
   - Validates monitoring works before building on top of it

### Dependencies
- **Requires:** Story 1.5A complete (admin authentication for test endpoints)

### Validates
- ✅ Redis (Vercel KV) operational and accessible
- ✅ Sentry error tracking configured and receiving events
- ✅ Monitoring infrastructure ready for Story 1.5C (cost protection)

---

## Story 1.5C: Implement LLM Cost Protection Circuit Breakers

**As a** developer,
**I want** multi-layer cost protection circuit breakers implemented using Redis,
**so that** LLM API costs are tracked and limited to protect the 80% gross margin goal from day 1.

### Acceptance Criteria

1. **Cost Circuit Breaker Implementation** (`/lib/llm/costCircuitBreaker.ts`):
   - `checkCostBudget(userId: string)` function implemented with 3-layer protection:
     - **Layer 1:** Daily limit ($50) - key: `cost:daily:${YYYY-MM-DD}`
     - **Layer 2:** Hourly limit ($5) - key: `cost:hourly:${YYYY-MM-DD}:${HH}`
     - **Layer 3:** Per-user daily limit ($1) - key: `cost:user:${userId}:${YYYY-MM-DD}`
   - Returns: `{ allowed: boolean, reason?: string, layer?: 'daily' | 'hourly' | 'user' }`
   - Uses Vercel KV from Story 1.5B for distributed tracking
2. **Cost Tracking Implementation:**
   - `trackCost(userId: string, costUsd: number)` function implemented:
     - Increments daily cost counter with TTL (24 hours)
     - Increments hourly cost counter with TTL (1 hour)
     - Increments per-user daily cost with TTL (24 hours)
     - Uses `kv.incrbyfloat()` for atomic operations
3. **Circuit Breaker Behavior:**
   - When limit exceeded, returns error instead of allowing LLM call
   - Fails open if Redis unavailable (don't block users, log warning)
   - Automatic reset when TTL expires (no manual intervention)
4. **Cost Monitoring Endpoint** (`/api/admin/cost-metrics`):
   - Admin-only route (checks user `is_admin` flag from database)
   - Returns current cost metrics:
     ```json
     {
       "daily": { "current": 12.34, "limit": 50, "percentage": 24.68 },
       "hourly": { "current": 0.85, "limit": 5, "percentage": 17 },
       "topUsers": [
         { "userId": "...", "cost": 0.45 },
         ...
       ]
     }
     ```
   - Includes top 10 users by daily cost (for abuse detection)
5. **Alerting Configuration:**
   - Sentry alert created for cost limit warnings:
     - Alert when daily cost > $40 (80% of $50 limit)
     - Alert when hourly cost > $4 (80% of $5 limit)
     - Alert when circuit breaker triggered
   - Alerts include context (layer, current cost, user if applicable)
6. **Integration Preparation** (no LLM calls yet, Epic 2):
   - Documentation in `/lib/llm/README.md` explains integration pattern:
     ```typescript
     // BEFORE LLM call (Epic 2 Story 2.3)
     const costCheck = await checkCostBudget(user.id);
     if (!costCheck.allowed) {
       return NextResponse.json({ error: 'SERVICE_OVERLOADED' }, { status: 503 });
     }

     // AFTER LLM call
     await trackCost(user.id, result.metadata.costUsd);
     ```
   - README includes examples and troubleshooting
7. **Unit Tests for Cost Circuit Breaker:**
   - Test: Cost within limits → allowed=true
   - Test: Daily limit exceeded → allowed=false, layer='daily'
   - Test: Hourly limit exceeded → allowed=false, layer='hourly'
   - Test: Per-user limit exceeded → allowed=false, layer='user'
   - Test: Redis unavailable → allowed=true (fail open), warning logged
   - Uses Vitest framework from Story 1.1
8. **Environment Variables:**
   - Cost limits configurable via environment variables:
     - `COST_LIMIT_DAILY` (default: 50)
     - `COST_LIMIT_HOURLY` (default: 5)
     - `COST_LIMIT_USER_DAILY` (default: 1)
   - `.env.local.example` updated with cost limit variables

### Dependencies
- **Requires:** Story 1.5B complete (Vercel KV and Sentry must be operational)

### Validates
- ✅ Multi-layer cost protection implemented and tested
- ✅ Cost tracking infrastructure ready for Epic 2 (LLM integration)
- ✅ Alerting configured to prevent cost overruns
- ✅ Fail-open behavior ensures user experience not blocked by monitoring failures

---

## Epic 1 Completion Checklist

**Before marking Epic 1 complete, verify:**

- [ ] All 7 stories completed with acceptance criteria met
- [ ] Health-check route returns all green statuses:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-10-06T...",
    "database": "connected",
    "kv": "connected",
    "sentry": "active"
  }
  ```
- [ ] Integration test passes (payment flow validates database-as-source-of-truth)
- [ ] Unit tests pass for cost circuit breaker
- [ ] Environment variables documented in `.env.local.example`
- [ ] README includes complete local setup instructions
- [ ] Deployment pipeline operational (preview and production)
- [ ] Authentication working with both magic link and Google OAuth
- [ ] RLS policies enforce data isolation
- [ ] Monitoring infrastructure (Redis + Sentry) validated
- [ ] Cost protection circuit breakers tested
- [ ] All critical risk mitigations implemented:
  - ✅ ESLint rule prevents JWT metadata usage
  - ✅ Prisma connection pooling + circuit breaker
  - ✅ Database-as-source-of-truth pattern documented
  - ✅ LLM cost circuit breaker operational

**Epic 1 Success Criteria:**
- Developer can clone repo, run `npm install`, copy `.env.local.example`, and have working local environment
- Every code push automatically deploys to preview environment
- Authentication, database, and monitoring infrastructure fully operational
- Cost protection prevents budget overruns from day 1
- Foundation ready for Epic 2 (Interpretation Engine) development

---

## Changes from Original Epic 1

**Stories Restructured:** 5 → 7 stories

**Story 1.1 - Added:**
- Vitest testing framework setup
- `.env.local.example` template creation
- Health-check route creation
- README.md with setup instructions

**Story 1.2 - No changes**
- Now works correctly (health-check exists from Story 1.1)

**Story 1.3 - Added:**
- RLS policy configuration (moved from Story 1.4)
- Health-check database connectivity update
- More comprehensive validation

**Story 1.4 - Removed:**
- RLS policies (moved to Story 1.3)

**Story 1.5 - Split into 3 stories:**
- **Story 1.5A:** Dashboard + integration test (validates stack)
- **Story 1.5B:** Monitoring infrastructure setup (Redis + Sentry)
- **Story 1.5C:** Cost protection circuit breakers (depends on 1.5B)

**Critical Issues Fixed:**
1. ✅ Testing framework initialized in Story 1.1 (not last-minute in 1.5)
2. ✅ Health-check route exists before Story 1.2 needs it
3. ✅ RLS policies configured with database setup (Story 1.3)
4. ✅ Monitoring infrastructure validated before building features on it
5. ✅ Environment variable template created early for consistent configuration
6. ✅ Each story has single responsibility and clear dependencies
