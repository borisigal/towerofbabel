/**
 * UsageIndicator Component
 *
 * Displays a compact, color-coded indicator showing user's current message usage and limits.
 * Updates in real-time via Zustand store when user performs interpretations.
 *
 * **Display Variants:**
 * - Trial users: "7/10 messages" (green/yellow/red based on percentage)
 * - Pro users: "45/100 messages" (green/yellow/red based on percentage)
 * - PAYG users: "$0.50 per interpretation" (blue, no limit)
 *
 * **Color Coding (AC#8):**
 * - Green: < 50% used (healthy usage)
 * - Yellow: 50-80% used (moderate usage)
 * - Red: > 80% used (high usage, approaching limit)
 * - Blue: PAYG (no limit, neutral color)
 *
 * **Responsive Design (AC#9):**
 * - Desktop (≥ 640px): "7/10 messages used"
 * - Mobile (< 640px): "7/10" (abbreviated, screen reader gets full context)
 *
 * @see docs/stories/3.2.story.md#task-3
 * @see architecture/16-coding-standards.md#component-patterns
 */

'use client';

import React from 'react';
import { useUsageStore } from '@/lib/stores/usageStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Returns Tailwind CSS classes for usage indicator background and text color.
 *
 * Implements color-coding system based on usage percentage:
 * - Green: < 50% used
 * - Yellow: 50-80% used
 * - Red: > 80% used
 * - Blue: PAYG (no limit)
 *
 * Colors meet WCAG 2.1 AA contrast requirements (4.5:1 ratio).
 *
 * @param used - Number of messages used
 * @param limit - Maximum messages allowed (null for PAYG unlimited)
 * @returns Tailwind CSS class string for background and text colors
 */
function getUsageColor(used: number, limit: number | null): string {
  // PAYG users: neutral blue (no limit)
  if (!limit) {
    return 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100';
  }

  const percentage = (used / limit) * 100;

  if (percentage < 50) {
    // Green: Healthy usage
    return 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100';
  }

  if (percentage < 80) {
    // Yellow: Moderate usage
    return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100';
  }

  // Red: High usage (approaching limit)
  return 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100';
}

/**
 * Returns tooltip content based on user tier.
 *
 * Provides additional context about usage limits and reset dates.
 *
 * @param tier - User subscription tier
 * @param limit - Maximum messages allowed (null for PAYG)
 * @returns Tooltip content string
 */
function getTooltipContent(
  tier: 'trial' | 'payg' | 'pro',
  limit: number | null
): string {
  if (tier === 'trial') {
    return `Trial: ${limit} messages, expires after 14 days`;
  }

  if (tier === 'pro') {
    return `Pro: ${limit} messages per month, resets monthly`;
  }

  // PAYG
  return 'Pay-as-you-go: $0.50 per interpretation, no monthly limit';
}

/**
 * UsageIndicator Component
 *
 * Compact badge/pill component displaying current usage status.
 * Integrates with Zustand store for real-time updates.
 *
 * @example
 * ```tsx
 * // In DashboardNav.tsx
 * <div className="flex items-center gap-4">
 *   <UsageIndicator />
 *   <UserMenu />
 * </div>
 * ```
 */
export function UsageIndicator(): JSX.Element {
  const { messagesUsed, messagesLimit, tier } = useUsageStore();

  // Determine display text based on tier
  let displayText: string;
  if (tier === 'payg') {
    // PAYG: Show price per interpretation
    displayText = '$0.50 per interpretation';
  } else {
    // Trial/Pro: Show usage fraction
    displayText = `${messagesUsed}/${messagesLimit}`;
  }

  // Get color classes based on usage percentage
  const colorClasses = getUsageColor(messagesUsed, messagesLimit);

  // Get tooltip content
  const tooltipText = getTooltipContent(tier, messagesLimit);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClasses} transition-colors`}
            role="status"
            aria-label={
              tier === 'payg'
                ? 'Pay-as-you-go: $0.50 per interpretation'
                : `${messagesUsed} of ${messagesLimit} messages used`
            }
          >
            {tier === 'payg' ? (
              // PAYG: Show full text on all screen sizes
              <span className="text-xs sm:text-sm">{displayText}</span>
            ) : (
              // Trial/Pro: Responsive text (abbreviated on mobile)
              <>
                <span className="text-xs sm:text-sm">{displayText}</span>
                <span className="hidden sm:inline ml-1">messages used</span>
                {/* Screen reader only text for mobile */}
                <span className="sr-only sm:hidden">messages used</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
