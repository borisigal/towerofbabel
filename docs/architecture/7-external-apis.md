# 7. External APIs

## LLM Provider APIs

Week 1 benchmarking will determine final selection based on cost, quality, privacy, and speed.

### OpenAI API
- **Base URL:** `https://api.openai.com/v1`
- **Authentication:** Bearer token
- **Key Endpoint:** `POST /chat/completions`
- **Cost Tracking:** `usage.total_tokens`
- **Data Retention:** 30 days for abuse monitoring

### Anthropic API (Claude)
- **Base URL:** `https://api.anthropic.com/v1`
- **Authentication:** `x-api-key` header
- **Key Endpoint:** `POST /messages`
- **Data Retention:** Zero-data retention policy (privacy advantage)

### xAI API (Grok)
- **Base URL:** `https://api.x.ai/v1`
- **Authentication:** Bearer token
- **Key Endpoint:** `POST /chat/completions` (OpenAI-compatible)
- **Models:** `grok-beta`, `grok-vision-beta`
- **Integration Note:** Can reuse OpenAI adapter with different base URL
- **Data Retention:** TBD (verify during benchmarking)

### Google AI API (Gemini)
- **Base URL:** `https://generativelanguage.googleapis.com/v1beta`
- **Authentication:** API key in query param
- **Key Endpoint:** `POST /models/gemini-pro:generateContent`

---

## Lemon Squeezy API
- **Base URL:** `https://api.lemonsqueezy.com/v1`
- **Authentication:** Bearer token (API Key)
- **Key Endpoints:**
  - `POST /checkouts` - Create Checkout
  - `GET /subscriptions` - Retrieve subscriptions
  - `POST /subscriptions/{id}` - Update subscription
  - Webhook events (signature verification mandatory)
- **Idempotency:** Use `LemonSqueezyEvent` table to prevent duplicate processing
- **Benefits:** Merchant of record (handles VAT/tax), supports 135+ countries including Israel

---

## Supabase Auth API
- **Purpose:** Magic link + Google OAuth authentication
- **SDK:** `@supabase/supabase-js`
- **Key Methods:**
  - `supabase.auth.signInWithOtp({ email })` - Magic link
  - `supabase.auth.signInWithOAuth({ provider: 'google' })` - Google OAuth
  - `supabase.auth.getUser()` - Get session user
- **Row-Level Security:** PostgreSQL RLS policies enforce data isolation

---

## Vercel KV (Redis) API
- **Purpose:** Cost circuit breaker, rate limiting
- **SDK:** `@vercel/kv`
- **Key Methods:**
  - `kv.get(key)` - Retrieve value
  - `kv.incrbyfloat(key, amount)` - Increment cost counters
  - `kv.expire(key, ttl)` - Set auto-expiration
- **Free Tier:** 256MB (sufficient for cost tracking)

---
