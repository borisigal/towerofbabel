/**
 * Admin Feedback Analytics Dashboard Page
 *
 * Displays aggregated feedback statistics for all interpretations.
 * Provides insights into quality trends and identifies culture pairs needing improvement.
 *
 * Authentication: Required (Supabase session)
 * Authorization: Admin only (is_admin = true)
 * Privacy: Only aggregated stats displayed (no message content)
 *
 * Features:
 * - Overall feedback statistics (inbound/outbound positive rates)
 * - Culture pair analysis (top 5 lowest positive rates)
 * - Date range filtering (7d, 30d, all time)
 * - CSV export of feedback metadata
 *
 * @see docs/stories/4.5.story.md
 */

import { createClient } from '@/lib/auth/supabaseServer';
import prisma from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  getOverallStats,
  getCulturePairStats,
  type DateRangeType,
} from '@/lib/services/feedbackAnalyticsService';
import { OverallStats } from '@/components/admin/OverallStats';
import { CulturePairTable } from '@/components/admin/CulturePairTable';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { ExportButton } from '@/components/admin/ExportButton';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Page props with searchParams for date range filtering
 */
interface FeedbackPageProps {
  searchParams: { range?: string };
}

/**
 * Admin Feedback Analytics Page
 *
 * Server Component - Renders on server, fetches aggregated statistics.
 * Uses Suspense for loading states.
 *
 * @param props - Page props with searchParams
 */
export default function FeedbackPage({
  searchParams,
}: FeedbackPageProps): JSX.Element {
  return (
    <Suspense fallback={<FeedbackDashboardSkeleton />}>
      <FeedbackDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Loading skeleton for feedback dashboard
 */
function FeedbackDashboardSkeleton(): JSX.Element {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

/**
 * Feedback Dashboard Content Component
 *
 * Async Server Component that fetches user auth status and feedback statistics.
 * Wrapped in Suspense boundary to show skeleton during loading.
 */
async function FeedbackDashboardContent({
  searchParams,
}: FeedbackPageProps): Promise<JSX.Element> {
  // 1. AUTHENTICATION - Get user identity from JWT
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Fallback auth check (middleware should catch this, but be defensive)
  if (authError || !user) {
    redirect('/sign-in');
  }

  // 2. AUTHORIZATION - Check admin flag from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { is_admin: true, name: true, email: true },
  });

  if (!dbUser || !dbUser.is_admin) {
    // Non-admin user trying to access admin page - redirect to dashboard
    redirect('/dashboard');
  }

  // 3. PARSE DATE RANGE from URL params (default: 30d)
  const validRanges: DateRangeType[] = ['7d', '30d', 'all'];
  const rangeParam = searchParams.range || '30d';
  const dateRange: DateRangeType = validRanges.includes(
    rangeParam as DateRangeType
  )
    ? (rangeParam as DateRangeType)
    : '30d';

  // 4. FETCH STATISTICS
  const [overallStats, culturePairStats] = await Promise.all([
    getOverallStats(dateRange),
    getCulturePairStats(dateRange),
  ]);

  // 5. RENDER dashboard with fetched data
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Feedback Analytics
        </h1>
        <p className="text-muted-foreground">
          Track interpretation quality trends and identify areas for improvement.
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <DateRangeFilter />
        <ExportButton />
      </div>

      {/* Overall Statistics Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Overall Statistics</h2>
        <OverallStats
          totalInterpretations={overallStats.total_interpretations}
          inbound={overallStats.inbound}
          outbound={overallStats.outbound}
        />
      </div>

      {/* Culture Pair Analysis */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Culture Pair Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Top 5 culture pairs with lowest positive feedback rates (needs
            attention)
          </p>
        </div>
        <CulturePairTable culturePairs={culturePairStats} />
      </div>

      {/* Privacy Notice */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Privacy Note:</strong> This dashboard displays only aggregated
          statistics and metadata. No message content is stored or displayed.
        </p>
      </div>
    </div>
  );
}
