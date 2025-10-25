/**
 * useUsageNotification Hook
 *
 * Custom React hook for determining when to show approaching-limit notifications.
 * Implements localStorage-based dismissal tracking to prevent notification spam.
 *
 * **Notification Triggers (AC#4, AC#5):**
 * - Trial users: 8/10 messages used (80%)
 * - Pro users: 80% of monthly limit
 * - PAYG users: No notification (unlimited)
 *
 * **Dismissal Behavior (AC#7):**
 * - Notification dismissible via close button
 * - Reappears on page reload if still at/above threshold
 * - Uses usage-specific localStorage key (dismissed at 8/10 won't hide 9/10)
 *
 * @see docs/stories/3.2.story.md#task-5
 * @see architecture/16-coding-standards.md#component-patterns
 */

'use client';

import { useEffect, useState } from 'react';
import { useUsageStore } from '@/lib/stores/usageStore';

/**
 * Notification data returned by hook.
 */
export interface UsageNotification {
  /** Whether to show the notification */
  show: boolean;
  /** Notification message text */
  message: string;
  /** Callback to dismiss notification */
  onDismiss: () => void;
  /** URL to upgrade page or pricing page */
  upgradeUrl: string | null;
}

/**
 * Determines if notification should be shown based on tier and usage.
 *
 * **Thresholds:**
 * - Trial: Show when messagesUsed >= 8 (but < 10, since at 10 upgrade modal takes over)
 * - Pro: Show when messagesUsed / messagesLimit >= 0.8
 * - PAYG: Never show (no limit)
 *
 * @param tier - User's subscription tier
 * @param messagesUsed - Current messages used
 * @param messagesLimit - Maximum messages allowed (null for PAYG)
 * @returns Whether notification should be shown
 */
function shouldShowNotification(
  tier: 'trial' | 'payg' | 'pro',
  messagesUsed: number,
  messagesLimit: number | null
): boolean {
  // PAYG users: Never show (no limit)
  if (tier === 'payg') {
    return false;
  }

  // Trial users: Show when at 8 or 9 messages (not 10, upgrade modal handles that)
  if (tier === 'trial') {
    return messagesUsed >= 8 && messagesUsed < 10;
  }

  // Pro users: Show when at 80% or above
  if (tier === 'pro' && messagesLimit) {
    const percentage = (messagesUsed / messagesLimit) * 100;
    return percentage >= 80;
  }

  return false;
}

/**
 * Generates notification message based on tier and usage.
 *
 * @param tier - User's subscription tier
 * @param messagesUsed - Current messages used
 * @param messagesLimit - Maximum messages allowed
 * @returns Notification message text
 */
function getNotificationMessage(
  tier: 'trial' | 'payg' | 'pro',
  messagesUsed: number,
  messagesLimit: number | null
): string {
  if (tier === 'trial') {
    return `You've used ${messagesUsed} of ${messagesLimit} trial messages. Upgrade to Pro or use Pay-As-You-Go after trial ends.`;
  }

  if (tier === 'pro' && messagesLimit) {
    return `You've used ${messagesUsed} of ${messagesLimit} messages this month. Your usage resets on your billing date.`;
  }

  return '';
}

/**
 * Custom hook for usage notification logic.
 *
 * Tracks notification dismissal state in localStorage with usage-specific keys.
 * Reappears when usage increases to new threshold (e.g., dismissed at 8/10, shows again at 9/10).
 *
 * @returns Notification data including show flag, message, and dismiss handler
 *
 * @example
 * ```tsx
 * function UsageNotificationBanner() {
 *   const { show, message, onDismiss, upgradeUrl } = useUsageNotification();
 *
 *   if (!show) return null;
 *
 *   return (
 *     <div className="notification-banner">
 *       <p>{message}</p>
 *       {upgradeUrl && <a href={upgradeUrl}>Upgrade Now</a>}
 *       <button onClick={onDismiss}>✕</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUsageNotification(): UsageNotification {
  const { tier, messagesUsed, messagesLimit } = useUsageStore();
  const [isDismissed, setIsDismissed] = useState(false);

  // Generate unique dismissal key for this usage level
  const dismissalKey = `usage-notification-dismissed-${tier}-${messagesUsed}`;

  // Check localStorage on mount and when usage changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(dismissalKey) === 'true';
      setIsDismissed(dismissed);
    }
  }, [dismissalKey]);

  // Determine if notification should be shown
  const shouldShow =
    shouldShowNotification(tier, messagesUsed, messagesLimit) && !isDismissed;

  // Generate message
  const message = getNotificationMessage(tier, messagesUsed, messagesLimit);

  // Determine upgrade URL (null for Pro users, they don't need to upgrade)
  const upgradeUrl = tier === 'trial' ? '/pricing' : null;

  // Dismiss handler
  const onDismiss = (): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(dismissalKey, 'true');
      setIsDismissed(true);
    }
  };

  return {
    show: shouldShow,
    message,
    onDismiss,
    upgradeUrl,
  };
}
