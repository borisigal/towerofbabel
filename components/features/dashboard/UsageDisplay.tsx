'use client';

/**
 * Usage Display Component
 *
 * Shows user's current tier and message usage with visual progress bar.
 * Displays tier-specific information and upgrade CTA when approaching limits.
 *
 * Client Component - Interactive upgrade CTA requires client-side behavior.
 *
 * Features:
 * - Color-coded progress bar (green/yellow/red based on usage %)
 * - Tier-specific labels (Trial/Pro/PAYG)
 * - Upgrade CTA for trial users near limit (> 8/10 messages)
 * - Responsive layout
 *
 * @example
 * ```tsx
 * // Trial user with 7/10 messages used
 * <UsageDisplay tier="trial" messagesUsedCount={7} messagesLimit={10} />
 *
 * // Pro user with 45/100 messages used
 * <UsageDisplay tier="pro" messagesUsedCount={45} messagesLimit={100} />
 *
 * // PAYG user (no limit)
 * <UsageDisplay tier="payg" messagesUsedCount={12} />
 * ```
 */

interface UsageDisplayProps {
  /** User's current tier */
  tier: 'trial' | 'payg' | 'pro';
  /** Number of messages used */
  messagesUsedCount: number;
  /** Message limit for tier (undefined for PAYG) */
  messagesLimit?: number;
}

export function UsageDisplay({
  tier,
  messagesUsedCount,
  messagesLimit,
}: UsageDisplayProps): JSX.Element {
  // Calculate usage percentage (for color coding)
  const usagePercentage = messagesLimit
    ? (messagesUsedCount / messagesLimit) * 100
    : 0;

  // Determine progress bar color based on usage percentage
  const getProgressBarColor = (): string => {
    if (usagePercentage < 50) return 'bg-green-500';
    if (usagePercentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get tier-specific usage label
  const getUsageLabel = (): string => {
    if (tier === 'trial') {
      return `Trial: ${messagesUsedCount}/10 messages used`;
    }
    if (tier === 'pro') {
      return `Pro: ${messagesUsedCount}/100 messages used this month`;
    }
    return `Pay-as-you-go: ${messagesUsedCount} messages used`;
  };

  // Show upgrade CTA for trial users near limit (> 8/10 used)
  const showUpgradeCTA = tier === 'trial' && messagesUsedCount >= 8;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        {getUsageLabel()}
      </h2>

      {/* Progress bar (only for tiers with limits) */}
      {messagesLimit && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className={`${getProgressBarColor()} h-4 rounded-full transition-all duration-300`}
            style={{
              width: `${Math.min(usagePercentage, 100)}%`,
            }}
            role="progressbar"
            aria-valuenow={messagesUsedCount}
            aria-valuemin={0}
            aria-valuemax={messagesLimit}
            aria-label={`Usage: ${messagesUsedCount} of ${messagesLimit} messages used`}
          />
        </div>
      )}

      {/* Upgrade CTA for trial users near limit */}
      {showUpgradeCTA && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            You&apos;re almost out of trial messages. Upgrade to Pro for 100
            messages/month!
          </p>
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
            onClick={() => {
              // TODO: Epic 3 - Open upgrade modal
            }}
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
