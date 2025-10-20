# TowerOfBabel

A cultural interpretation tool for cross-cultural communication, helping users understand how messages may be perceived differently across cultures.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 9.0.0 or higher (comes with Node.js)

You can verify your installations by running:

```bash
node --version
npm --version
```

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd TowerOfBabel
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This will install all required packages including Next.js, React, TypeScript, Tailwind CSS, and testing frameworks.

## Environment Setup

1. **Create your local environment file**

   ```bash
   cp .env.local.example .env.local
   ```

2. **Configure environment variables**

   Open `.env.local` and fill in the required values. Most variables are placeholders for future stories and can be left empty for now:
   - Database credentials (Story 1.3)
   - Supabase authentication (Story 1.4)
   - LLM provider API keys (Epic 2)
   - Lemon Squeezy payment keys (Epic 3)

## Database Setup

### Supabase PostgreSQL Setup

1. **Create Supabase Account**

   Sign up at [https://supabase.com](https://supabase.com) if you haven't already.

2. **Create New Project**

   - Go to Supabase dashboard → New Project
   - Choose your organization
   - Set project name (e.g., "TowerOfBabel")
   - Set strong database password (save this!)
   - Choose region: US East (recommended for lowest latency)

3. **Get Database Credentials**

   Go to Project Settings → Database and copy:
   - Connection Pooling (Session Mode) URL for `DATABASE_URL`
   - Direct Connection URL for `DIRECT_URL`
   - Supabase URL for `NEXT_PUBLIC_SUPABASE_URL`
   - Anon key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Configure Environment Variables**

   Update `.env.local` with your Supabase credentials:

   ```bash
   # Example format (replace with your actual values)
   DATABASE_URL='postgresql://postgres.project:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&statement_cache_size=0'
   DIRECT_URL='postgresql://postgres:password@db.project.supabase.co:5432/postgres'
   NEXT_PUBLIC_SUPABASE_URL='https://project.supabase.co'
   NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key'
   ```

   **Important Notes:**
   - `DATABASE_URL` must include `?pgbouncer=true&connection_limit=1&statement_cache_size=0`
   - Special characters in password must be URL-encoded (! → %21, $ → %24, etc.)
   - Never commit `.env.local` to version control

### Prisma Database Commands

```bash
# Generate Prisma Client (run after schema changes)
npm run db:generate

# Apply database migrations
npm run db:migrate

# Push schema without creating migration (prototyping)
npm run db:push

# Open Prisma Studio (visual database browser)
npm run db:studio

# Seed database with test users
npm run db:seed
```

### Test Users (Local Development)

After seeding, three test users are available:

| Email                | Tier  | Messages Used | Status    |
|---------------------|-------|---------------|-----------|
| trial1@test.local   | trial | 0/10          | Available |
| trial2@test.local   | trial | 10/10         | Exhausted |
| pro1@test.local     | pro   | 5/100         | Active    |

⚠️ **Note:** Test users do NOT have Supabase Auth accounts. For testing with authentication, create users via Supabase Auth UI.

### Row-Level Security (RLS) Policies

After running migrations, apply RLS policies via Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Open `prisma/rls-policies.sql`
3. Copy and execute the SQL commands

RLS policies enforce data isolation at the database level, ensuring users can only access their own data.

### Troubleshooting Database Connection

**"Can't reach database server" error:**
- Verify Supabase project is not paused
- Check DATABASE_URL format and credentials
- Ensure port 6543 for pooler connection (not 5432)
- URL-encode special characters in password

**"Prepared statement already exists" error:**
- Add `&statement_cache_size=0` to DATABASE_URL
- This disables prepared statements required by PgBouncer

**Connection pool exhaustion:**
- Verify `connection_limit=1` in DATABASE_URL
- Check circuit breaker state: see `/lib/db/README.md`

## Monitoring Infrastructure Setup (Story 1.5B)

### Vercel KV (Redis) Setup

Vercel KV provides distributed state management for LLM cost tracking and rate limiting.

1. **Create Vercel KV Instance**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard) → Storage → Create Database
   - Select **KV (Redis)**
   - Name: `towerofbabel-kv-production`
   - Region: US East (same as Supabase)
   - Click **Create** (uses free tier: 256MB storage, 10K requests/day)

2. **Copy KV Credentials**

   After creation, copy the credentials from the database details page:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

3. **Add KV Credentials to Environment Variables**

   **Local development:**
   ```bash
   # Add to .env.local
   KV_REST_API_URL=https://[name]-[project].kv.vercel-storage.com
   KV_REST_API_TOKEN=...
   ```

   **Vercel deployed environments:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add both variables to all environments (Production, Preview, Development)

4. **Verify KV Connection**

   ```bash
   # Start dev server
   npm run dev

   # Test KV endpoint (requires admin authentication)
   curl http://localhost:3000/api/admin/kv-test

   # Expected response:
   {
     "success": true,
     "kv_status": "connected",
     "test_key_set": true,
     "test_key_retrieved": true,
     "test_value": "ok"
   }
   ```

### Sentry Error Tracking Setup

Sentry provides error tracking and performance monitoring for production debugging.

1. **Create Sentry Account**

   Sign up at [https://sentry.io](https://sentry.io) if you haven't already.

2. **Create New Project**

   - Platform: **Next.js**
   - Project name: `towerofbabel`
   - Team: Personal (or create team)
   - **Skip the wizard** - we have manual configuration

3. **Copy Sentry DSN**

   After project creation, copy the DSN from Project Settings → Client Keys (DSN)

4. **Add Sentry DSN to Environment Variables**

   **Local development:**
   ```bash
   # Add to .env.local
   SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
   NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]

   # Optional: Enable Sentry in local development (default: disabled)
   # SENTRY_ENABLE_DEV=true
   ```

   **Vercel deployed environments:**
   - Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to all environments

   **Note:** `NEXT_PUBLIC_SENTRY_DSN` should have the same value as `SENTRY_DSN`. The `NEXT_PUBLIC_` prefix makes it available in the browser. Sentry DSN is safe to expose (public DSN, Sentry validates events server-side).

5. **Verify Sentry Connection**

   ```bash
   # Test Sentry endpoint (requires admin authentication)
   curl http://localhost:3000/api/admin/sentry-test

   # Expected response:
   {
     "success": true,
     "sentry_status": "error_captured",
     "message": "Test error sent to Sentry. Check Sentry dashboard."
   }
   ```

   Then check your Sentry dashboard at [https://sentry.io](https://sentry.io) to verify the test error appears.

6. **Configure Sentry Alerts**

   - Go to Sentry Dashboard → Alerts
   - Create alert rules:
     - Alert on error rate > 5% (15 minute window)
     - Alert on new errors
     - Send alerts to email (or Slack integration)

### Admin-Only Test Endpoints

The KV and Sentry test endpoints require admin authentication:

1. **Create Admin User**

   ```bash
   # Option 1: Update seed user
   npm run db:studio
   # In Prisma Studio, set is_admin = true for a test user

   # Option 2: Run SQL in Supabase Dashboard
   UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
   ```

2. **Sign in as Admin**

   - Sign in via the authentication page with your admin user
   - Navigate to test endpoints:
     - KV test: `http://localhost:3000/api/admin/kv-test`
     - Sentry test: `http://localhost:3000/api/admin/sentry-test`

### Enhanced Health Check

The health check endpoint now reports monitoring infrastructure status:

```bash
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-19T...",
  "database": "connected",
  "kv": "connected",
  "sentry": "active",
  "costCircuitBreaker": "operational"
}
```

## LLM Cost Protection (Story 1.5C)

### 3-Layer Cost Circuit Breaker

The application implements a 3-layer cost protection circuit breaker to prevent runaway LLM API costs:

**Layer 1: Daily Limit ($50/day default)**
- Prevents total daily cost overruns across all users
- Redis key: `cost:daily:YYYY-MM-DD`
- TTL: 24 hours (auto-resets at midnight UTC)
- Sentry alert when > 80% ($40)

**Layer 2: Hourly Limit ($5/hour default)**
- Catches sudden cost spikes (e.g., coordinated abuse attack)
- Redis key: `cost:hourly:YYYY-MM-DD:HH`
- TTL: 1 hour (auto-resets every hour)
- Sentry alert when > 80% ($4)

**Layer 3: Per-User Daily Limit ($1/user/day default)**
- Prevents individual user abuse (e.g., automated script)
- Redis key: `cost:user:USER_ID:YYYY-MM-DD`
- TTL: 24 hours (auto-resets at midnight UTC)

### Configuring Cost Limits

Cost limits are configurable via environment variables in `.env.local`:

```bash
# Daily cost limit for all users combined (USD)
COST_LIMIT_DAILY=50

# Hourly cost limit for all users combined (USD)
COST_LIMIT_HOURLY=5

# Per-user daily cost limit (USD)
COST_LIMIT_USER_DAILY=1
```

### Monitoring Costs

**Admin Cost Metrics Endpoint:**

```bash
# Test cost metrics endpoint (requires admin authentication)
curl http://localhost:3000/api/admin/cost-metrics

# Expected response:
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
    { "userId": "user-xyz", "cost": 0.45 }
  ]
}
```

**Use Cases:**
- Abuse detection: Identify users with abnormally high costs
- Cost trending: Monitor daily/hourly cost patterns
- Budget planning: Determine if cost limits need adjustment

### Fail-Open Behavior

When Redis (Vercel KV) is unavailable, the circuit breaker **fails open** (allows requests) instead of blocking users. This prioritizes user experience over temporary cost risk, as Redis downtime is rare (Upstash 99.99% uptime).

**See:** `/lib/llm/README.md` for integration documentation and troubleshooting

**Status Values:**
- `database`: `"connected"` | `"disconnected"`
- `kv`: `"connected"` | `"disconnected"`
- `sentry`: `"active"` | `"not_configured"`

**Note:** Health check always returns 200 OK even if dependencies are down. This allows monitoring to detect issues without marking entire app as unhealthy.

### Troubleshooting Monitoring

**KV connection fails:**
- Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set correctly
- Check Vercel KV instance is active in Vercel Dashboard
- Ensure variables are set for the correct environment

**Sentry errors not appearing:**
- Verify `SENTRY_DSN` is set correctly
- Check Sentry project exists and is active
- Enable Sentry in local dev: `SENTRY_ENABLE_DEV=true` in `.env.local`
- Errors are disabled in local development by default (prevents noise)

**Admin endpoints return 403 Forbidden:**
- Verify your user has `is_admin = true` in the database
- Check you're signed in with the correct account
- See Prisma Studio: `npm run db:studio`

## Running the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Verify Installation

- **Homepage**: Visit http://localhost:3000 to see the welcome page
- **Health Check**: Visit http://localhost:3000/api/health to verify the API is working

Expected health check response:

```json
{
  "status": "ok",
  "timestamp": "2025-10-16T...",
  "database": "connected"
}
```

**Note:** `database` shows `"connected"` when PostgreSQL is configured and reachable (Story 1.3).

## Dashboard (Story 1.5A)

The authenticated user dashboard is the main workspace after signing in. It displays user account information and will host the interpretation tool in Epic 2.

### Accessing the Dashboard

1. **Sign in** via the authentication page (Story 1.4)
2. Navigate to `/dashboard` or click the dashboard link after sign-in
3. The dashboard displays:
   - Welcome message with your name or email
   - Current tier and message usage (Trial/Pro/PAYG)
   - Visual progress bar showing usage percentage
   - Interpretation form placeholder (Epic 2)

### Expected Behavior

**Trial User (0-10 messages used):**
```
Welcome to TowerOfBabel, user@example.com

Trial: 3/10 messages used
[=====>-----] (30% - green progress bar)

[Interpretation tool coming soon (Epic 2)]
```

**Pro User (monthly limit):**
```
Welcome to TowerOfBabel, John Doe

Pro: 47/100 messages used this month
[============>---] (47% - green progress bar)

[Interpretation tool coming soon (Epic 2)]
```

**Pay-as-you-go User:**
```
Welcome to TowerOfBabel, sarah@company.com

Pay-as-you-go: 12 messages used
(No progress bar - no message limit)

[Interpretation tool coming soon (Epic 2)]
```

### Progress Bar Color Coding

- **Green** (< 50% used): Plenty of messages remaining
- **Yellow** (50-80% used): Approaching limit
- **Red** (> 80% used): Near exhaustion
- **Upgrade CTA** (Trial users at 8+ messages): Prompt to upgrade to Pro

### Troubleshooting

**Dashboard shows "Account Setup Incomplete" error:**
- Your account exists in Supabase Auth but not in the database
- This can happen if the webhook didn't fire during sign-up
- **Solution:** Sign out and sign in again, or contact support
- Database record should be created automatically on first sign-in

**Dashboard doesn't show updated tier after payment:**
- This should NOT happen if database-as-source-of-truth pattern is working correctly
- Dashboard always queries database for tier, NOT JWT (which can be cached for 1 hour)
- If you see stale tier information, this is a CRITICAL bug - please report it
- **See:** `/tests/integration/payment-flow.test.ts` for the test that validates this behavior

**Dashboard shows incorrect message count:**
- Message counts are incremented after each interpretation
- Counts reset monthly for Pro users (1st of each month)
- Trial users have a lifetime limit (10 messages total)
- **Verify:** Check your user record in Prisma Studio: `npm run db:studio`

### Database-as-Source-of-Truth Pattern

The dashboard implements a CRITICAL pattern to prevent blocking paid users:

**The Problem:**
- JWT tokens cache user metadata (tier, usage) for up to 1 hour
- When a user pays for Pro tier, the database updates immediately
- But the JWT remains cached with the old tier for up to 1 hour
- If we checked the JWT, the user would be blocked despite paying

**The Solution:**
- Dashboard ALWAYS queries the database for tier and usage
- JWT is ONLY used for authentication (user identity)
- Database is ONLY used for authorization (tier, usage limits)
- This ensures paid users get immediate access after upgrade

**See:**
- `/lib/auth/README.md` - Full pattern documentation
- `/tests/integration/payment-flow.test.ts` - CRITICAL test validating this
- `architecture/14-critical-risk-mitigation.md#risk-1` - Risk analysis

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

Test files are located in the `/tests` directory and follow the pattern `*.test.ts` or `*.spec.ts`.

## Code Quality

### Linting

Run ESLint to check for code quality issues:

```bash
npm run lint
```

### Formatting

Format all files with Prettier:

```bash
npm run format
```

Check formatting without making changes:

```bash
npm run format:check
```

## Project Structure

```
towerofbabel/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles with Tailwind
├── components/            # React components (organized in future stories)
│   ├── ui/               # UI primitives (shadcn/ui)
│   ├── features/         # Feature-specific components
│   └── layout/           # Layout components
├── lib/                   # Utility functions and business logic
│   ├── auth/             # Authentication utilities (Story 1.4)
│   ├── llm/              # LLM provider integration (Epic 2)
│   ├── services/         # Business logic services
│   └── types/            # Shared TypeScript types
├── prisma/                # Database schema and migrations (Story 1.3)
├── public/                # Static assets
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── .env.local.example     # Environment variable template
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier configuration
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest test configuration
└── package.json           # Dependencies and scripts
```

## Technology Stack

- **Framework**: Next.js 14.1+ with App Router
- **Language**: TypeScript 5.3+ (strict mode)
- **Styling**: Tailwind CSS 3.4+
- **Testing**: Vitest 1.2+ with React Testing Library
- **Code Quality**: ESLint 8+ and Prettier 3+

## Available Scripts

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start development server            |
| `npm run build`        | Build for production                |
| `npm start`            | Start production server             |
| `npm run lint`         | Run ESLint                          |
| `npm run format`       | Format code with Prettier           |
| `npm run format:check` | Check formatting without changes    |
| `npm test`             | Run all tests                       |
| `npm run test:watch`   | Run tests in watch mode             |
| `npm run db:generate`  | Generate Prisma Client              |
| `npm run db:migrate`   | Run database migrations             |
| `npm run db:push`      | Push schema without creating migration |
| `npm run db:studio`    | Open Prisma Studio (database GUI)   |
| `npm run db:seed`      | Seed database with test users       |

## Deployment

### Vercel Deployment Pipeline

This project is deployed on Vercel with automatic CI/CD integration.

**Production URL**: https://towerofbabel.vercel.app

**Vercel Project**: [View on Vercel Dashboard](https://vercel.com/dashboard)

### How Deployments Work

#### Production Deployments

Production deployments are **automatically triggered** when code is pushed to the `main` branch:

```bash
git push origin main
```

- Vercel detects the push to `main`
- Runs build process (TypeScript compilation, ESLint, Next.js build)
- Deploys to production URL if build succeeds
- Previous deployment remains live until new one completes (zero downtime)

#### Preview Deployments

Preview deployments are **automatically created** for all non-main branches:

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and push:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/my-feature
   ```

3. **Access preview URL:**
   - Vercel automatically generates a unique preview URL
   - Format: `towerofbabel-[hash]-[username].vercel.app`
   - Each branch gets a persistent URL that updates with new commits
   - Preview deployments include Vercel Deployment Protection (authentication required)

4. **View deployment status:**
   - Check Vercel dashboard → Deployments tab
   - GitHub PR comments automatically include preview URL

### Environment Variables

Environment variables are configured in the Vercel dashboard under **Settings → Environment Variables**.

**Current Configuration:**
- All variables from `.env.local.example` are configured in Vercel
- Variables are set for **Production**, **Preview**, and **Development** environments
- Many variables use placeholder values until their respective stories are implemented:
  - Database credentials: Story 1.3
  - Supabase Auth: Story 1.4
  - LLM API keys: Epic 2
  - Lemon Squeezy keys: Epic 3

**To update environment variables:**
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Edit the variable
3. Redeploy for changes to take effect

### Verifying Deployments

#### Health Check Endpoint

After each deployment, verify the application is running correctly:

```bash
# Production
curl https://towerofbabel.vercel.app/api/health

# Expected response
{
  "status": "ok",
  "timestamp": "2025-10-16T...",
  "database": "connected"
}
```

The `database` field shows connection status. If `"disconnected"`, verify database credentials and Supabase project status.

#### Build Logs

To check build logs:
1. Go to Vercel dashboard → Your project
2. Click on the deployment
3. View the **Building** tab for detailed logs

### Deployment Protection

**Preview deployments** have Vercel Deployment Protection enabled by default:
- Requires Vercel authentication to access
- Protects in-progress features from unauthorized viewing
- Production deployments remain publicly accessible

To access a protected preview deployment:
1. Click the preview URL
2. Authenticate with your Vercel account
3. View the deployed preview

### Troubleshooting Deployments

**Build Failures:**
- Check build logs in Vercel dashboard for specific errors
- Verify code builds locally: `npm run build`
- Ensure all tests pass: `npm test`
- Check TypeScript compilation: `npx tsc --noEmit`

**Environment Variable Issues:**
- Verify all required variables are set in Vercel dashboard
- Check variable names match `.env.local.example` exactly
- Redeploy after changing environment variables

**Deployment Not Triggering:**
- Verify Git repository is connected in Vercel settings
- Check that branch is pushed to GitHub: `git push origin <branch-name>`
- Ensure automatic deployments are enabled in Vercel settings

## Development Guidelines

### TypeScript

- Strict mode enabled (catches bugs at compile-time)
- Explicit return types required on functions
- No `any` types allowed (use `unknown` or proper types)

### Code Style

- Prettier handles formatting automatically
- ESLint enforces code quality rules
- Use descriptive variable names
- Comment complex logic explaining **why**, not **what**

### Testing

- Write tests for all business logic
- Mirror source file structure in `/tests` directory
- Use descriptive test names with `describe` and `it` blocks

### Components

- Server Components by default (no 'use client' directive)
- Only use Client Components when needed for:
  - Event handlers (onClick, onChange, etc.)
  - State management (useState, useReducer)
  - Browser APIs (localStorage, window, etc.)

## Critical Security Note

This project includes a custom ESLint rule to prevent a critical security issue:

**NEVER** use `user.app_metadata` for authorization checks (tier, usage limits, etc.). Always query the database for real-time user data. See `/lib/auth/README.md` (Story 1.4) for details.

## Next Steps

Foundation infrastructure complete (Stories 1.1-1.3). Upcoming stories will add:

- ✅ **Story 1.1**: Next.js project setup
- ✅ **Story 1.2**: Vercel deployment pipeline
- ✅ **Story 1.3**: PostgreSQL database with Prisma
- **Story 1.4**: Supabase authentication
- **Story 1.5**: LLM integration and cost protection
- **Epic 2**: Cultural interpretation features
- **Epic 3**: Payment processing with Lemon Squeezy

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]
