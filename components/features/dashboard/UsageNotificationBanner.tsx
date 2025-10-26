/**
 * UsageNotificationBanner Component
 *
 * Displays an approaching-limit notification banner at the top of the dashboard.
 * Appears when trial users reach 8/10 messages or Pro users reach 80% of monthly limit.
 *
 * **Trigger Conditions (AC#4, AC#5):**
 * - Trial users: 8 or 9 messages used (notification includes upgrade CTA)
 * - Pro users: 80% of monthly limit used (informational, no upgrade needed)
 * - PAYG users: Never shown (no limit)
 *
 * **Behavior (AC#6, AC#7):**
 * - Dismissible via close button (X)
 * - Reappears on page reload if still at/above threshold
 * - Includes link to upgrade page (trial) or reset date info (pro)
 * - Keyboard accessible (focus, ESC to dismiss)
 *
 * @see docs/stories/3.2.story.md#task-7
 * @see architecture/16-coding-standards.md#component-patterns
 */

'use client';

import React from 'react';
import { useUsageNotification } from '@/lib/hooks/useUsageNotification';
import { useUpgradeModalStore } from '@/lib/stores/upgradeModalStore';

/**
 * UsageNotificationBanner Component
 *
 * Conditionally rendered banner at top of dashboard.
 * Uses useUsageNotification hook for logic.
 *
 * @example
 * ```tsx
 * // In Dashboard page
 * function DashboardPage() {
 *   return (
 *     <>
 *       <UsageNotificationBanner />
 *       <DashboardContent />
 *     </>
 *   );
 * }
 * ```
 */
export function UsageNotificationBanner(): JSX.Element | null {
  const { show, message, onDismiss, upgradeUrl } = useUsageNotification();
  const { setOpen } = useUpgradeModalStore();

  // Don't render if notification shouldn't be shown
  if (!show) {
    return null;
  }

  return (
    <div
      className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-6"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Message content */}
        <div className="flex-1">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {message}
            {upgradeUrl && (
              <>
                {' '}
                <button
                  onClick={() => setOpen(true, 'notification_banner')}
                  className="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100 transition-colors"
                  type="button"
                >
                  Upgrade Now
                </button>
              </>
            )}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 transition-colors"
          aria-label="Dismiss notification"
          type="button"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
