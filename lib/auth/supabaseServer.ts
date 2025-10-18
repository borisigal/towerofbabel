import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for server-side usage (middleware, API routes, server components).
 *
 * CRITICAL: This client manages session cookies automatically and must be used
 * for all server-side authentication checks.
 *
 * Use this client in:
 * - Middleware (route protection)
 * - API routes
 * - Server components
 * - Server actions
 *
 * @returns Supabase server client instance with cookie management
 *
 * @example
 * ```typescript
 * // In API route
 * import { createClient } from '@/lib/auth/supabaseServer';
 *
 * export async function GET() {
 *   const supabase = createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   // ...
 * }
 * ```
 */
export function createClient(): ReturnType<typeof createServerClient> {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { [key: string]: unknown }) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Handle cookie setting errors in middleware
            // This can happen when setting cookies in middleware
          }
        },
        remove(name: string, options: { [key: string]: unknown }) {
          try {
            cookieStore.set(name, '', options);
          } catch {
            // Handle cookie removal errors in middleware
          }
        },
      },
    }
  );
}
