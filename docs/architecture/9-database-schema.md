# 9. Database Schema

See [Section 4: Data Models](#4-data-models) for complete Prisma schema.

**Key Highlights:**
- **Users table:** Supabase Auth linkage, tier, usage tracking
- **Interpretations table:** Metadata only (NO message content)
- **Subscriptions table:** Lemon Squeezy subscription lifecycle
- **LemonSqueezyEvents table:** Webhook idempotency (prevent replay attacks)
- **RLS Policies:** Row-level security enforced at database layer
- **Indexes:** Optimized for common queries (user_id, culture pairs, timestamps)
- **Connection Pooling:** PgBouncer enabled (`?pgbouncer=true&connection_limit=1`)

---
