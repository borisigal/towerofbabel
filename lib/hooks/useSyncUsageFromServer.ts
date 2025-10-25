/**
 * useSyncUsageFromServer Hook
 *
 * Custom React hook that fetches user's latest usage data from the server
 * and synchronizes it with the Zustand usage store on component mount.
 *
 * **Purpose (AC#10):**
 * - Ensures usage indicator reflects actual database state on page load
 * - Prevents stale client-side data from showing incorrect usage
 * - Complements database-as-source-of-truth pattern from Story 3.1
 *
 * **Usage:**
 * Call this hook once at the top level of the Dashboard page (or app root)
 * to sync usage data when user first loads the page.
 *
 * @see docs/stories/3.2.story.md#task-10
 * @see architecture/16-coding-standards.md#component-patterns
 */

'use client';

import { useEffect, useState } from 'react';
import { useUsageStore } from '@/lib/stores/usageStore';
import { logger } from '@/lib/observability/logger';

/**
 * Response data from GET /api/user/usage endpoint.
 */
interface UsageApiResponse {
  success: boolean;
  data?: {
    tier: 'trial' | 'payg' | 'pro';
    messages_used: number;
    messages_limit: number | null;
    trial_end_date: string | null;
    reset_date: string | null;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Hook state data returned to caller.
 */
export interface UsageSyncState {
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * Custom hook to sync usage data from server to Zustand store.
 *
 * Fetches usage data from GET /api/user/usage on mount and updates
 * the global Zustand store. Provides loading and error states.
 *
 * **Behavior:**
 * - Fetches once on mount (not on every render)
 * - Updates Zustand store with server data
 * - Handles errors gracefully (logs error, doesn't crash app)
 * - Returns loading/error states for UI feedback
 *
 * @returns Hook state with loading and error flags
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   const { loading, error } = useSyncUsageFromServer();
 *
 *   if (loading) return <Skeleton />;
 *   if (error) return <ErrorBanner message={error} />;
 *
 *   return <DashboardContent />;
 * }
 * ```
 */
export function useSyncUsageFromServer(): UsageSyncState {
  const { setUsage } = useUsageStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * Syncs usage data from server to Zustand store.
     * Fetches from /api/user/usage and updates global state.
     *
     * @returns Promise that resolves when sync completes
     */
    async function syncUsage(): Promise<void> {
      try {
        const response = await fetch('/api/user/usage');
        const data: UsageApiResponse = await response.json();

        if (response.ok && data.success && data.data) {
          // Update Zustand store with server data
          setUsage(
            data.data.messages_used,
            data.data.messages_limit,
            data.data.tier
          );
          setError(null);
        } else {
          // API returned error response
          const errorMessage =
            data.error?.message || 'Failed to fetch usage data';
          logger.error({ error: data.error }, 'Usage sync failed');
          setError(errorMessage);
        }
      } catch (err) {
        // Network error or JSON parsing error
        const errorMessage = 'Network error while fetching usage data';
        logger.error({ error: err }, 'Usage sync error');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    // Fetch usage data on mount
    syncUsage();

    // Empty dependency array: only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, error };
}
