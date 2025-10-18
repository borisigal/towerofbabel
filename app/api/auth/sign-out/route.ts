import { createClient } from '@/lib/auth/supabaseServer';
import { NextResponse } from 'next/server';

/**
 * Sign-out API route handler.
 *
 * Clears Supabase session and redirects to landing page.
 *
 * Flow:
 * 1. Create server-side Supabase client
 * 2. Call supabase.auth.signOut() to clear session
 * 3. Redirect to landing page (/)
 *
 * This route MUST use POST method (not GET) to prevent CSRF attacks.
 * Sign-out actions should never be triggered via simple link clicks.
 *
 * @returns Redirect response to landing page
 *
 * @example
 * ```typescript
 * // Client-side usage
 * const handleSignOut = async () => {
 *   await fetch('/api/auth/sign-out', { method: 'POST' });
 *   window.location.href = '/';
 * };
 * ```
 */
export async function POST(): Promise<NextResponse> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign-out error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Redirect to landing page after successful sign-out
  return NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
  );
}
