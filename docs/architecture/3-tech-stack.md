# 3. Tech Stack

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.3+ | Type-safe frontend code, shared types with backend | Catches bugs at compile-time, excellent IDE support, PRD specifies strict mode, enables refactoring confidence for 2-3 week timeline |
| **Frontend Framework** | Next.js | 14.1+ | React framework with App Router, SSR/SSG, API routes | Unified fullstack framework, App Router provides modern patterns, Vercel-optimized deployment, server components reduce bundle size (< 300KB goal) |
| **UI Component Library** | shadcn/ui | Latest | Accessible component primitives (Radix UI + Tailwind) | Copy-paste components (not npm dependency, reduces bundle), WCAG 2.1 AA compliant out-of-box, customizable, aligns with PRD accessibility requirements |
| **State Management** | React Context + Zustand | React 18.2+, Zustand 4.5+ | Client-side state (user session, form state, usage counter) | Avoid Redux complexity for MVP, Context for auth/user state, Zustand for global UI state (usage counter updates), lightweight (< 5KB) |
| **Backend Language** | TypeScript | 5.3+ | Type-safe API routes, shared types with frontend | Same as frontend - unified type system, `/lib/types` shared between client/server, reduces bugs in business logic (usage tracking, pricing) |
| **Backend Framework** | Next.js API Routes | 14.1+ | Serverless functions for backend logic | Collocated with frontend (monolith architecture), automatic deployment, Vercel edge optimization, no separate backend server needed |
| **API Style** | REST | - | HTTP JSON API (POST /api/interpret, GET /api/user) | Simple, well-understood, broad tooling support, sufficient for MVP's ~10 endpoints, PRD doesn't require real-time (GraphQL/tRPC overkill) |
| **Database** | PostgreSQL | 15+ | Relational database for user, interpretation metadata, subscriptions | ACID guarantees (critical for billing), robust, excellent Prisma support, Supabase provides serverless PostgreSQL with connection pooling |
| **ORM** | Prisma | 5.9+ | Type-safe database queries, migrations | Generates TypeScript types from schema, migration management, excellent DX, connection pooling configuration for serverless (PgBouncer) |
| **Cache** | Vercel KV (Upstash Redis) | Latest | **REQUIRED:** Rate limiting, LLM cost circuit breaker, response caching (optional) | **Epic 1 CRITICAL:** Distributed cost tracking (3-layer protection), 256MB free tier sufficient for cost counters, enables safe production deployment |
| **File Storage** | Supabase Storage | Latest | (Future) User-uploaded files if needed | Not required for MVP (no file uploads), 1GB free tier, S3-compatible API, already in stack |
| **Authentication** | Supabase Auth | Latest | Magic link email + Google OAuth, session management | Built-in magic link emails (no separate email service), generous free tier, row-level security (RLS) policies, saves $120+/year vs. Resend |
| **Frontend Testing** | Vitest + React Testing Library | Vitest 1.2+, RTL 14+ | Unit tests for components, hooks, utility functions | Fast (Vite-powered), TypeScript-first, Jest-compatible API, PRD specifies Vitest for speed |
| **Backend Testing** | Vitest + Supertest | Vitest 1.2+, Supertest 6.3+ | Integration tests for API routes | Same test runner as frontend (consistency), Supertest for HTTP assertions, mock LLM/Stripe calls |
| **E2E Testing** | (Deferred to Phase 2) | - | End-to-end workflow testing | PRD explicitly defers E2E automation (Playwright/Cypress) to Phase 2 for MVP speed |
| **Build Tool** | Next.js Built-in | 14.1+ | Webpack/Turbopack bundler, code splitting | Next.js handles bundling, no separate Vite/Webpack config needed, automatic code splitting, tree-shaking |
| **Bundler** | Turbopack (Next.js 14) | 14.1+ | Fast bundler for development, production builds | Next.js 14 uses Turbopack for dev (10x faster than Webpack), Webpack for production (mature, stable) |
| **CSS Framework** | Tailwind CSS | 3.4+ | Utility-first CSS, responsive design | Rapid UI development, PurgeCSS reduces final CSS (< 50KB), shadcn/ui integration, PRD specifies Tailwind for speed |
| **IaC Tool** | Vercel CLI + Git Integration | Latest | Infrastructure as code via vercel.json | No Terraform/CloudFormation needed (Vercel simplifies IaC), `vercel.json` for configuration, Git-driven deployments |
| **CI/CD** | Vercel (GitHub Integration) | - | Automatic deployments, preview URLs | PRD specifies Vercel, automatic preview per PR, production deploy from main, zero configuration CI/CD |
| **Monitoring** | Vercel Analytics + Sentry | Sentry SDK 7.100+ | Core Web Vitals, error tracking, performance monitoring | Vercel Analytics built-in (FCP, TTI), Sentry for error tracking + performance profiling, alerts on critical errors |
| **Logging** | Pino (structured logging) | 8.17+ | Structured JSON logs for debugging, cost tracking | Production-grade logging, structured output (easy to query), log LLM costs/durations, Vercel automatically ingests logs |
| **LLM Provider (TBD)** | OpenAI / Anthropic / xAI / Google | GPT-4 Turbo / Claude 3.5 Sonnet / Grok / Gemini 1.5 Pro | Cultural interpretation via LLM API calls | **Week 1 benchmarking determines selection** based on: (1) cost < $0.02/interpretation, (2) quality of cultural output, (3) data retention policy, (4) response time 3-5s |
| **Payment Processing** | Stripe | SDK 14.14+ | Subscriptions ($10/month Pro) + metered billing ($0.50 PAYG) | Industry-standard, PCI-compliant (NFR10), excellent webhook system, supports both subscription + usage-based billing, no direct card handling |
| **Code Quality** | ESLint + Prettier | ESLint 8+, Prettier 3+ | Linting TypeScript, auto-formatting | Enforce code standards, PRD specifies ESLint + Prettier, auto-format on save, catches common errors, includes custom rule for JWT metadata check, Use good JS docs style comments on all public functions, interfaces etc... |

---

## Key Technology Decisions Explained

**1. Supabase Auth Replacing NextAuth.js + Resend**
- **Why:** Built-in magic link emails save $120+/year, 2-3 hour setup time savings, row-level security policies included
- **Trade-off:** JWT session delay (mitigated by database as source of truth pattern)

**2. Vercel KV (Redis) - REQUIRED for Epic 1**
- **Why:** LLM cost circuit breaker is CRITICAL risk mitigation, cannot defer to Epic 3
- **Cost:** Free tier (256MB) sufficient for cost tracking, paid tier ($0.20/100K requests) if needed at scale

**3. Zustand Added for State Management**
- **Why:** React Context works for auth/user state, but usage counter needs optimistic updates across multiple components. Zustand provides lightweight global state (< 5KB) without Redux boilerplate.
- **Alternative Considered:** Pure React Context - rejected due to prop drilling for usage counter updates, re-render performance issues.

**4. Pino for Logging**
- **Why:** Need structured logging to track LLM costs per interpretation (validate 80% margin goal). Pino is production-grade, zero-overhead, JSON output integrates with Vercel logs.
- **Alternative Considered:** `console.log` - rejected, unstructured logs hard to query for cost analysis.

**5. LLM Provider TBD**
- **Why:** PRD explicitly states "Week 1 benchmarking determines provider" based on cost/quality/privacy/speed criteria.
- **Architecture Implication:** Adapter pattern abstracts provider-specific APIs, enabling rapid switching without code changes.

---

## Version Pinning Strategy

**Rationale for Version Selection:**
- **Major versions pinned** (Next.js 14.x, React 18.x) - avoid breaking changes
- **Minor versions flexible** (14.1+) - allow patch/security updates
- **Lock file committed** (`package-lock.json`) - reproducible builds across team/CI

**Upgrade Strategy Post-MVP:**
- **Security patches:** Auto-apply via Dependabot
- **Minor versions:** Review changelog, test in preview environment, merge if non-breaking
- **Major versions:** Defer to Phase 2 (focus on features, not framework upgrades during MVP)

---

## Dependency Count Target

**Goal:** < 50 direct dependencies (minimizes attack surface, reduces bundle size)

**Current Estimate:**
- Next.js + React: 1 (Next.js includes React)
- Prisma: 2 (client + CLI)
- Supabase: 1 (`@supabase/supabase-js`)
- Tailwind CSS: 1
- shadcn/ui: 0 (copy-paste, not npm dependency)
- Zustand: 1
- Stripe: 1
- Vercel KV: 1 (`@vercel/kv`)
- Sentry: 1
- Pino: 1
- Vitest + Testing Library: 3 (dev dependencies)
- TypeScript + ESLint + Prettier: 5 (dev dependencies)
- LLM SDK: 1 (OpenAI/Anthropic/xAI/Google)

**Total: ~20 direct dependencies** - well under 50 target, leaves room for future additions.

---
