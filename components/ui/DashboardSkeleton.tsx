/**
 * Dashboard Skeleton Component
 *
 * Loading placeholder for dashboard page.
 * Matches exact dimensions of real content to prevent layout shift.
 *
 * Shows skeleton UI for:
 * - Header (welcome message)
 * - Usage card (tier and progress bar)
 * - Interpretation placeholder
 *
 * Uses Tailwind animate-pulse for loading animation.
 */

export function DashboardSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="h-9 sm:h-10 w-64 sm:w-96 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Usage Card Skeleton */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Interpretation Placeholder Skeleton */}
      <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 min-h-[380px] flex flex-col items-center justify-center">
        <div className="h-7 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-5 w-80 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}
