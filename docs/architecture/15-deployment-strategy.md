# 15. Deployment Strategy

## Deployment Checklist

**Pre-Launch (Epic 1 Complete):**
1. [ ] All environment variables configured in Vercel
2. [ ] Supabase RLS policies enabled
3. [ ] Prisma migrations applied to production database
4. [ ] Sentry project created and DSN configured
5. [ ] Lemon Squeezy webhook endpoint registered
6. [ ] Cost circuit breaker tested with mock LLM calls
7. [ ] Integration tests passing (payment flow, auth, cost limits)
8. [ ] Lighthouse score ≥ 90 (mobile + desktop)

**Launch (Epic 5 Complete):**
1. [ ] Custom domain configured (optional for MVP)
2. [ ] SSL certificate verified
3. [ ] Analytics tracking verified
4. [ ] Error monitoring operational (Sentry)
5. [ ] Cost monitoring dashboard accessible
6. [ ] Lemon Squeezy live mode enabled (switch from test mode)
7. [ ] Final security audit (rate limiting, RLS, webhook signatures)

---
