/**
 * Vercel KV (Redis) client for distributed state management.
 *
 * CRITICAL: Used for LLM cost circuit breaker (Story 1.5C).
 *
 * Environment variables required:
 * - KV_REST_API_URL: Vercel KV REST API URL
 * - KV_REST_API_TOKEN: Vercel KV authentication token
 *
 * @example
 * ```typescript
 * import { kv } from '@/lib/kv/client';
 * await kv.set('key', 'value');
 * const value = await kv.get('key');
 * ```
 */

import { kv } from '@vercel/kv';

export { kv };
