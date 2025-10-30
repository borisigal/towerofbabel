import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js middleware for route protection using Supabase authentication.
 *
 * CRITICAL: This middleware runs on EVERY request matching the config.matcher pattern.
 * It must be efficient and handle Supabase session cookies properly.
 *
 * Protected Routes:
 * - /dashboard/* - Requires authentication (Story 1.5A dashboard page)
 * - /admin/* - Requires authentication (Story 4.5 admin analytics)
 *
 * Public Routes:
 * - / (landing page)
 * - /sign-in
 * - /auth/callback
 * - /api/* (protected separately in API routes)
 *
 * Flow:
 * 1. Create Supabase server client with cookie handling
 * 2. Check if user is authenticated (supabase.auth.getUser())
 * 3. If unauthenticated and accessing protected route → redirect to /sign-in
 * 4. If authenticated and accessing protected route → allow access
 *
 * IMPORTANT: This middleware ONLY handles authentication (identity check).
 * Authorization (tier/usage checks for dashboard, admin checks for /admin)
 * MUST be done in the page/API route via database query.
 * See app/(dashboard)/dashboard/page.tsx for database-as-source-of-truth pattern (Story 1.5A).
 * See app/admin/feedback/page.tsx for admin authorization pattern (Story 4.5).
 *
 * @see architecture/16-coding-standards.md#api-route-structure-mandatory-order
 * @see lib/auth/README.md
 * @see app/(dashboard)/dashboard/page.tsx - Dashboard implementation (Story 1.5A)
 * @see app/admin/feedback/page.tsx - Admin dashboard implementation (Story 4.5)
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Set cookie in request (for subsequent operations in this middleware)
          request.cookies.set({
            name,
            value,
            ...options,
          });
          // Set cookie in response (to send to browser)
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          // Remove cookie in request
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          // Remove cookie in response
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Protect admin routes (Story 4.5)
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    const redirectUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

/**
 * Matcher configuration for middleware.
 *
 * Routes to protect:
 * - /dashboard/* (all dashboard routes)
 * - /admin/* (all admin routes - Story 4.5)
 *
 * Routes to exclude (handled separately):
 * - / (landing page - public)
 * - /sign-in (auth page - public)
 * - /auth/* (auth callback - public)
 * - /api/* (protected in API routes)
 * - /_next/* (Next.js internals)
 * - /favicon.ico, /images/*, etc. (static files)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
