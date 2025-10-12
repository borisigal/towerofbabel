# 13. Development Workflow

## Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1

# LLM Provider (Week 1: Select one)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# XAI_API_KEY=xai-...
# GOOGLE_AI_API_KEY=AI...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Vercel KV (Redis) - REQUIRED for cost circuit breaker
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# Cost Limits
DAILY_COST_LIMIT=50
HOURLY_COST_LIMIT=5
USER_DAILY_COST_LIMIT=1

# Pro Tier (TBD based on benchmarking)
PRO_MESSAGE_LIMIT=100
```

## Setup Commands

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with API keys
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

## Development Commands

```bash
npm run dev              # Start dev server
npm test                 # Run tests
npm run lint             # ESLint (includes JWT check rule)
npm run format           # Prettier
npx prisma studio        # Database GUI
```

---
