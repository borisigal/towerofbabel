import { createClient } from '@/lib/auth/supabaseServer';
import { findUserById } from '@/lib/db/repositories/userRepository';
import { redirect } from 'next/navigation';
import { log } from '@/lib/observability/logger';

/**
 * Middleware to block cancelled users from accessing dashboard.
 *
 * CRITICAL - FINANCIALLY SENSITIVE:
 * Cancelled users must not have any access to dashboard features.
 * This middleware enforces the business rule that cancelled = no access.
 *
 * **How it works:**
 * 1. Authenticates user via Supabase Auth
 * 2. Queries database for user tier (database-as-source-of-truth pattern)
 * 3. If tier is 'cancelled', redirects to /subscription-required page
 * 4. Logs access attempts from cancelled users for security audit
 *
 * **Where to use:**
 * - Dashboard layout (`app/(dashboard)/layout.tsx`) - protects all dashboard routes
 * - Any protected page that cancelled users should not access
 *
 * **Security Requirement:** Cancelled users = NO ACCESS (financially sensitive)
 *
 * @returns void - Redirects to subscription-required if user is cancelled
 * @throws Redirects to sign-in if not authenticated
 *
 * @example
 * ```typescript
 * // In app/(dashboard)/layout.tsx
 * export default async function DashboardLayout({ children }) {
 *   await checkCancelledStatus(); // CRITICAL: Check cancelled status
 *   return <div>{children}</div>;
 * }
 * ```
 *
 * @see Story 3.5 - AC 8: CRITICAL SECURITY
 * @see architecture/16-coding-standards.md#jsdoc-for-public-apis
 */
export async function checkCancelledStatus(): Promise<void> {
  // 1. AUTHENTICATION
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in');
  }

  // 2. AUTHORIZATION - Database as source of truth
  const userRecord = await findUserById(user.id);

  if (!userRecord) {
    redirect('/sign-in');
  }

  // 3. CRITICAL CHECK: Block cancelled users
  if (userRecord.tier === 'cancelled') {
    // SECURITY AUDIT LOG
    log.warn('Cancelled user attempted dashboard access', {
      userId: user.id,
      tier: 'cancelled',
      security: 'access_denied',
      timestamp: new Date().toISOString(),
    });

    redirect('/subscription-required');
  }

  // User has valid tier (trial, payg, or pro) - allow access
}
