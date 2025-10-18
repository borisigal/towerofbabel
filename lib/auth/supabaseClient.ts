import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for browser-side usage (client components).
 *
 * Use this client in:
 * - Client components ('use client')
 * - Sign-in pages
 * - OAuth flows
 * - Any browser-side authentication logic
 *
 * @returns Supabase browser client instance
 *
 * @example
 * ```typescript
 * 'use client';
 * import { createClient } from '@/lib/auth/supabaseClient';
 *
 * const supabase = createClient();
 * await supabase.auth.signInWithOtp({ email });
 * ```
 */
export function createClient(): ReturnType<typeof createBrowserClient> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
