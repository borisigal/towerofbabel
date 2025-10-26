'use client';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { UsageIndicator } from '@/components/features/dashboard/UsageIndicator';
import { useUpgradeModalStore } from '@/lib/stores/upgradeModalStore';
import { useUsageStore } from '@/lib/stores/usageStore';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Dashboard Navigation Component
 *
 * Persistent navigation bar for authenticated dashboard pages.
 * Displays app logo, user information, and sign-out button.
 *
 * Client Component - Uses SignOutButton which requires client-side interactivity.
 *
 * Responsive behavior:
 * - Desktop: Full layout with all elements visible
 * - Tablet: Abbreviated user info
 * - Mobile: Hamburger menu or stacked layout (future enhancement)
 *
 * @example
 * ```tsx
 * <DashboardNav userName="Sarah Johnson" userEmail="sarah@example.com" />
 * <DashboardNav userEmail="user@example.com" /> // No name provided
 * ```
 */

interface DashboardNavProps {
  /** User's display name (optional) */
  userName?: string | null;
  /** User's email address */
  userEmail: string;
}

/**
 * DashboardNav component - renders navigation bar with upgrade button and user info.
 *
 * @param props - Dashboard navigation props
 * @returns JSX element
 */
export function DashboardNav({ userName, userEmail }: DashboardNavProps): JSX.Element {
  const displayName = userName || userEmail;
  const { setOpen } = useUpgradeModalStore();
  const { tier } = useUsageStore();

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / App Name */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
              TowerOfBabel
            </h1>
          </div>

          {/* Right side: User Info, Usage Indicator, Upgrade Button, Sign-out Button */}
          <div className="flex items-center gap-4">
            {/* User Info (hidden on small mobile, visible on larger screens) */}
            <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
              {displayName}
            </div>

            {/* Usage Indicator */}
            <UsageIndicator />

            {/* Upgrade Button (only shown for non-Pro users) - Story 3.3 */}
            {tier !== 'pro' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true, 'proactive')}
                className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/20"
                aria-label="Upgrade your plan"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Upgrade</span>
              </Button>
            )}

            {/* Sign-out Button */}
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
