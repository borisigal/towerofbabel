'use client';

import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface UserStats {
  totalUsage: number;
  interpretationsCount: number;
  optimizationsCount: number;
  uniqueCulturePairsCount: number;
}

/**
 * User Statistics Card Component
 *
 * Displays user engagement statistics on the pricing page:
 * - Total usage with interpretations/optimizations breakdown
 * - Top 3 culture pairs by usage
 *
 * Fetches data from /api/user/stats endpoint.
 */
export function UserStatsCard(): JSX.Element {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/user/stats');
        const data = await response.json();

        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.error?.message || 'Failed to load stats');
        }
      } catch {
        setError('Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8 animate-pulse">
        <div className="h-5 bg-white/10 rounded w-48 mb-4" />
        <div className="h-4 bg-white/10 rounded w-32 mb-2" />
        <div className="h-4 bg-white/10 rounded w-36" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8">
        <p className="text-white/60 text-sm">Unable to load usage statistics</p>
      </div>
    );
  }

  // Don't show card if user has no usage
  if (stats.totalUsage === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8">
        <p className="text-white/80 text-base">
          Start using TowerOfBabel to see your usage statistics here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6 mb-8 space-y-4">
      {/* Total Usage */}
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />
        <p className="text-lg text-white/70">
          You&apos;ve interpreted: <span className="text-white font-semibold">{stats.totalUsage} messages</span>
        </p>
      </div>

      {/* Insights Gained - unique cross-cultural pairs */}
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />
        <p className="text-lg text-white/70">
          Insights gained: <span className="text-white font-semibold">{stats.uniqueCulturePairsCount} cultural patterns learned</span>
        </p>
      </div>
    </div>
  );
}
