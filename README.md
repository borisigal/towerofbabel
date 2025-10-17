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
