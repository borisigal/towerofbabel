# Technical Assumptions

## Repository Structure

**Monorepo**

**Rationale:** Single Next.js application with collocated frontend and backend (API routes) simplifies MVP development, deployment, and maintenance. No need for separate repos when all code is tightly coupled. This matches Brief's recommendation for monolithic architecture.

## Service Architecture

**Monolithic Next.js Application with API Routes**

TowerOfBabel will be built as a single Next.js 14+ application using the App Router architecture. Frontend (React components) and backend (API routes) coexist in the same codebase, deployed together on Vercel.

**Key Services:**
- **Frontend:** React components rendered server-side (SSR) and client-side for interactive features
- **API Routes:** Next.js API handlers for authentication, LLM orchestration, usage tracking, Lemon Squeezy webhooks
- **External Integrations:** LLM provider APIs, Lemon Squeezy payment API, email service (magic links)

**Rationale:**
- Monolith is appropriate for MVP scope (2-3 week timeline, single developer)
- Next.js API routes provide serverless function behavior without microservices complexity
- Can extract services later if scaling requires (premature optimization avoided)
- Matches Brief's explicit recommendation: "Monolithic for MVP (single Next.js application)"

## Testing Requirements

**Unit + Integration Testing with Manual QA Convenience**

**Testing Strategy:**
- **Unit Tests:** Critical business logic (usage tracking, pricing calculations, metadata storage)
- **Integration Tests:** API routes (authentication flow, interpretation endpoint, Lemon Squeezy webhooks)
- **Manual Testing:** UI/UX workflows, cross-browser compatibility, LLM output quality
- **No E2E automation for MVP:** Defer to Phase 2 (Playwright/Cypress adds complexity, slows 2-3 week timeline)

**Testing Convenience Features:**
- Test mode flags for bypassing LLM calls (use mock responses)
- Lemon Squeezy test mode for payment flow validation
- Seeded test accounts with various tier/usage states
- Local development endpoints for quick manual testing

**Rationale:**
- Unit + integration testing catches critical bugs (data integrity, payment logic) without E2E overhead
- Manual testing sufficient for MVP with small feature surface
- LLM output quality requires human evaluation (not automatable easily)
- Fast iteration prioritized over comprehensive test coverage for 2-3 week launch

**Testing Tools:**
- **Framework:** Vitest (fast, modern, TypeScript-first)
- **Integration:** Supertest or Next.js testing utilities
- **Manual QA:** Browserstack or manual cross-browser checks

## Additional Technical Assumptions and Requests

**Frontend Stack:**
- **Framework:** Next.js 14+ with App Router (React 18+)
- **Language:** TypeScript (strict mode for type safety)
- **Styling:** Tailwind CSS for rapid UI development and responsive utilities
- **UI Components:** shadcn/ui or Radix UI (accessible, customizable primitives)
- **State Management:** React Context + hooks (avoid Redux complexity for MVP)
- **Form Handling:** React Hook Form (performance, built-in validation)

**Backend Stack:**
- **API:** Next.js API routes (collocated with frontend)
- **Language:** TypeScript (shared types between frontend/backend)
- **Authentication:** NextAuth.js (magic link + Google OAuth support)
- **Database:** PostgreSQL via Vercel Postgres or Supabase
- **ORM:** Prisma (type-safe queries, migration management, excellent DX)

**LLM Integration:**
- **Primary Provider:** TBD based on Week 1 benchmarking (Grok, GPT-4 Turbo, Claude 3.5 Sonnet, Gemini 1.5 Pro)
- **Selection Criteria:**
  1. Cost per interpretation (target <$0.02 to maintain 80% margin)
  2. Quality of cultural interpretation output
  3. Data retention policy (prefer shortest retention period)
  4. Response time (target 3-5 seconds)
- **Prompt Strategy:**
  - **3 prompt templates:** Same-culture (single scores), different-culture (dual scores), emphasis on "explain like 14-year-old" tone
  - **Dynamic emotion detection:** LLM identifies top 3 emotions (not preset list)
  - **Structured output:** JSON response format for reliable parsing (emotion scores, bottom line, cultural context)
- **Fallback Strategy:** If primary provider fails, queue retry for 5 minutes (no secondary provider for MVP to reduce complexity)

**Database Schema (Prisma):**
```
User {
  id, email, name, created_at, tier (trial|payg|pro),
  messages_used_count, messages_reset_date, lemonsqueezy_customer_id
}

Interpretation {
  id, user_id, timestamp, culture_sender, culture_receiver,
  character_count, interpretation_type (inbound|outbound),
  feedback (up|down|null), cost_usd
}

Subscription {
  id, user_id, lemonsqueezy_subscription_id, status, current_period_end
}
```

**Payments:**
- **Provider:** Lemon Squeezy
- **Implementation:**
  - Pro tier: Standard subscription ($10/month recurring)
  - Pay-as-you-go: Metered billing ($0.50 per interpretation)
  - Trial: 14 days, 10 messages (no payment method required initially)
- **Webhooks:** Handle subscription lifecycle events (created, canceled, payment failed)

**Hosting & Infrastructure:**
- **Primary Host:** Vercel (Next.js native platform)
  - Automatic deployments from Git
  - Edge functions for low-latency API routes
  - Built-in analytics and monitoring
- **Database Host:** Vercel Postgres or Supabase (managed PostgreSQL)
- **CDN:** Vercel Edge Network (automatic, global distribution)
- **Monitoring:** Vercel Analytics + Sentry (error tracking)
- **Email Service:** Resend or SendGrid (magic link auth, usage notifications)

**Security & Privacy:**
- **Message Privacy:** Zero message content storage (only metadata: user_id, timestamp, culture_pair, character_count, feedback)
- **Provider Transparency:** Privacy page displays current LLM provider and links to their data retention policy
- **HTTPS:** Enforced by Vercel (automatic SSL certificates)
- **Rate Limiting:** Implemented via API middleware (Vercel Edge Middleware or Upstash Redis)
- **API Key Security:** Environment variables for all secrets (LLM API keys, Lemon Squeezy keys, database URLs)
- **GDPR Compliance:** Cookie consent banner, privacy policy, user data deletion endpoint

**Development Workflow:**
- **Version Control:** Git + GitHub
- **Branch Strategy:** main (production), develop (staging), feature branches
- **CI/CD:** Vercel automatic deployments (preview URLs for PRs, production deploys from main)
- **Environment Management:** .env.local (local), Vercel environment variables (staging/production)
- **Code Quality:** ESLint + Prettier (enforce TypeScript standards, auto-formatting)

**Performance Targets:**
- **First Contentful Paint:** <2 seconds
- **Interpretation API Response:** <10 seconds (target 3-5 seconds)
- **Database Query Latency:** <100ms (Prisma + PostgreSQL connection pooling)
- **Bundle Size:** <300KB initial JS bundle (code splitting, dynamic imports for heavy components)

---
