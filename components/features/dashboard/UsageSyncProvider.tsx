/**
 * UsageSyncProvider Component
 *
 * Client Component wrapper that syncs usage data from server to Zustand store on mount.
 * Provides loading skeleton while fetching and error banner if fetch fails.
 *
 * **Purpose:**
 * - Enables usage sync in Server Component pages (Dashboard)
 * - Wraps client-side hook (useSyncUsageFromServer) in Client Component
 * - Shows loading state during initial fetch
 * - Handles errors gracefully
 *
 * @see docs/stories/3.2.story.md#task-11
 * @see architecture/16-coding-standards.md#component-patterns
 */

'use client';

import { ReactNode } from 'react';
import { useSyncUsageFromServer } from '@/lib/hooks/useSyncUsageFromServer';
import { logger } from '@/lib/observability/logger';

/**
 * Props for UsageSyncProvider component.
 */
interface UsageSyncProviderProps {
  /** Child components to render after usage sync completes */
  children: ReactNode;
}

/**
 * UsageSyncProvider Component
 *
 * Wraps dashboard content and syncs usage data on mount.
 * Renders children after successful sync or shows error banner on failure.
 *
 * @example
 * ```tsx
 * // In Dashboard page (Server Component)
 * export default function DashboardPage() {
 *   return (
 *     <UsageSyncProvider>
 *       <DashboardContent />
 *     </UsageSyncProvider>
 *   );
 * }
 * ```
 */
export function UsageSyncProvider({ children }: UsageSyncProviderProps): JSX.Element {
  const { loading, error } = useSyncUsageFromServer();

  // Show loading skeleton while fetching usage data
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  // Show error banner if fetch failed (non-blocking, still render children)
  if (error) {
    logger.warn({ error }, 'Usage sync failed, continuing with default state');
    // Don't block the UI, just log the error
    // Children will still render with default Zustand store values
  }

  // Render children after successful sync
  return <>{children}</>;
}
