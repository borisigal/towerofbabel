import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/authService';

/**
 * Auth callback route handler for Supabase authentication.
 *
 * Handles callback from:
 * 1. Magic link email authentication
 * 2. Google OAuth authentication
 *
 * Flow:
 * 1. Extract authorization code from URL query parameters
 * 2. Exchange code for session using Supabase (PKCE flow)
 * 3. Create user record in database if first sign-in
 * 4. Redirect to dashboard on success
 * 5. Redirect to sign-in with error message on failure
 *
 * CRITICAL: This route uses createServerClient directly to ensure proper
 * cookie handling for PKCE code verifier exchange.
 *
 * @param request - Next.js request object with URL query parameters
 * @returns Redirect response to dashboard or sign-in page
 *
 * @example
 * Magic link URL: http://localhost:3000/auth/callback?code=abc123
 * OAuth URL: http://localhost:3000/auth/callback?code=xyz789
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors (user denied consent, etc.)
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/sign-in?error=${encodeURIComponent(
        errorDescription || error
      )}`
    );
  }

  // Code is required for authentication
  if (!code) {
    console.error('Auth callback missing code parameter');
    return NextResponse.redirect(
      `${requestUrl.origin}/sign-in?error=Missing+authentication+code`
    );
  }

  // Create response to modify cookies
  const response = NextResponse.redirect(`${requestUrl.origin}/dashboard`);

  const cookieStore = cookies();

  // Create Supabase client with cookie handling for PKCE flow
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { [key: string]: unknown }) {
          // Set cookie in response (cookies() is read-only in route handlers)
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: { [key: string]: unknown }) {
          // Remove cookie from response
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Exchange authorization code for session (PKCE flow)
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    console.error('Error exchanging code for session:', exchangeError);
    return NextResponse.redirect(
      `${requestUrl.origin}/sign-in?error=${encodeURIComponent(
        exchangeError.message
      )}`
    );
  }

  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error getting authenticated user:', userError);
    return NextResponse.redirect(
      `${requestUrl.origin}/sign-in?error=Authentication+failed`
    );
  }

  try {
    // Create user record in database if first sign-in
    await getOrCreateUser(user);

    // Return the response with updated cookies
    return response;
  } catch (dbError) {
    console.error('Error creating user in database:', dbError);

    // Authentication succeeded but database operation failed
    await supabase.auth.signOut();

    return NextResponse.redirect(
      `${requestUrl.origin}/sign-in?error=Account+setup+failed.+Please+try+again.`
    );
  }
}
