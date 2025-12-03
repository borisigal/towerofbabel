import { createClient } from '@/lib/auth/supabaseServer';
import { findUserById } from '@/lib/db/repositories/userRepository';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { DashboardHeader } from '@/components/features/dashboard/DashboardHeader';
import { UsageNotificationBanner } from '@/components/features/dashboard/UsageNotificationBanner';
import { UsageSyncProvider } from '@/components/features/dashboard/UsageSyncProvider';
import { BillingReturnHandler } from '@/components/features/dashboard/BillingReturnHandler';
import { InterpretationForm } from '@/components/features/interpretation/InterpretationForm';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { UpgradeModalProvider } from '@/components/features/upgrade/UpgradeModalProvider';

/**
 * Dashboard page - Main authenticated user workspace.
 *
 * CRITICAL: This page implements the database-as-source-of-truth pattern.
 * User tier and usage are fetched from DATABASE (not JWT app_metadata).
 * This ensures paid users get immediate access after upgrade (Risk #1 mitigation).
 *
 * Server Component - Renders on server, fetches user data directly from database.
 * Uses Suspense for loading states to prevent blank screen during data fetch.
 *
 * @see /lib/auth/README.md - Database-as-source-of-truth pattern documentation
 * @see architecture/14-critical-risk-mitigation.md#risk-1
 */
export default function DashboardPage(): JSX.Element {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

/**
 * Dashboard Content Component
 *
 * Async Server Component that fetches user data from database.
 * Wrapped in Suspense boundary to show skeleton during loading.
 */
async function DashboardContent(): Promise<JSX.Element> {
  // 1. AUTHENTICATION - Get user identity from JWT (WHO is the user?)
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Fallback auth check (middleware should catch this, but be defensive)
  if (authError || !user) {
    redirect('/sign-in');
  }

  // 2. AUTHORIZATION - Get tier/usage from DATABASE (WHAT can they do?)
  // CRITICAL: This is the database-as-source-of-truth pattern
  // JWT may be stale for up to 1 hour after payment, but database is always current
  const userRecord = await findUserById(user.id);

  // Handle case where user exists in auth but not in database
  if (!userRecord) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-200 mb-2">
            Account Setup Incomplete
          </h1>
          <p className="text-red-300 mb-4">
            Your account exists in authentication but not in our database.
            Please contact support or try signing out and back in.
          </p>
          <a
            href="/api/auth/sign-out"
            className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
          >
            Sign Out
          </a>
        </div>
      </div>
    );
  }

  // 3. RENDER dashboard with user data from database
  return (
    <UsageSyncProvider>
      {/* Billing Portal Return Handler - Story 3.5 */}
      <BillingReturnHandler />

      <div>
        {/* Welcome Header */}
        <DashboardHeader name={userRecord.name} email={userRecord.email} />

        {/* Usage Notification Banner - Story 3.2 */}
        <UsageNotificationBanner />

        {/* Interpretation Form - Story 2.1 */}
        <InterpretationForm />
      </div>

      {/* Upgrade Modal - Story 3.3 */}
      <UpgradeModalProvider />
    </UsageSyncProvider>
  );
}
