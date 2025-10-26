/**
 * Upgrade Modal Provider Component
 *
 * Client Component wrapper that renders the UpgradeModal and connects it to Zustand stores.
 * Used in Server Components (like Dashboard page) to provide modal functionality.
 *
 * @module components/features/upgrade/UpgradeModalProvider
 */

'use client';

import { UpgradeModal } from './UpgradeModal';
import { useUpgradeModalStore } from '@/lib/stores/upgradeModalStore';
import { useUsageStore } from '@/lib/stores/usageStore';

/**
 * Upgrade Modal Provider Component
 *
 * Wraps UpgradeModal with Zustand store connections.
 * Can be added to any page without prop drilling.
 *
 * @example
 * ```tsx
 * // In Dashboard page (Server Component)
 * export default function DashboardPage() {
 *   return (
 *     <>
 *       <DashboardContent />
 *       <UpgradeModalProvider />
 *     </>
 *   );
 * }
 * ```
 */
export function UpgradeModalProvider(): JSX.Element {
  const { open, trigger, setOpen } = useUpgradeModalStore();
  const { tier: currentTier, messagesUsed, messagesLimit } = useUsageStore();

  return (
    <UpgradeModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      currentTier={currentTier}
      messagesUsed={messagesUsed}
      messagesLimit={messagesLimit ?? undefined}
    />
  );
}
