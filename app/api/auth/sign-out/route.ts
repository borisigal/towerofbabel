import { createClient } from '@/lib/auth/supabaseServer';
import { NextResponse } from 'next/server';

/**
 * Sign-out API route handler.
 *
 * Clears Supabase session and returns success response.
 *
 * Flow:
 * 1. Create server-side Supabase client
 * 2. Call supabase.auth.signOut() to clear session
 * 3. Return success JSON (client handles redirect)
 *
 * This route MUST use POST method (not GET) to prevent CSRF attacks.
 * Sign-out actions should never be triggered via simple link clicks.
 *
 * @returns JSON response with success status
 *
 * @example
 * ```typescript
 * // Client-side usage
 * const handleSignOut = async () => {
 *   const response = await fetch('/api/auth/sign-out', { method: 'POST' });
 *   if (response.ok) {
 *     window.location.href = '/';
 *   }
 * };
 * ```
 */
export async function POST(): Promise<NextResponse> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign-out error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Return success - client will handle redirect
  return NextResponse.json({ success: true }, { status: 200 });
}
