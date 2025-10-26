/**
 * Upgrade Modal Store
 *
 * Zustand store for managing upgrade modal state across the application.
 * Enables triggering modal from multiple locations (API errors, nav link, notification banner).
 *
 * @module lib/stores/upgradeModalStore
 */

import { create } from 'zustand';

/**
 * Trigger types for upgrade modal
 * - limit_exceeded: User hit usage limit (automatic trigger)
 * - proactive: User clicked "Upgrade" link in navigation
 * - notification_banner: User clicked "Upgrade Now" in notification banner
 */
export type UpgradeModalTrigger =
  | 'limit_exceeded'
  | 'proactive'
  | 'notification_banner';

/**
 * Upgrade modal state interface
 */
interface UpgradeModalState {
  /** Whether modal is currently open */
  open: boolean;
  /** How the modal was triggered (for analytics tracking) */
  trigger: UpgradeModalTrigger;
  /**
   * Opens or closes the modal
   * @param open - Whether to open or close modal
   * @param trigger - How the modal was triggered (defaults to 'proactive')
   */
  setOpen: (open: boolean, trigger?: UpgradeModalTrigger) => void;
}

/**
 * Zustand store for upgrade modal state
 *
 * @example
 * ```typescript
 * // Open modal when API returns limit exceeded
 * const { setOpen } = useUpgradeModalStore();
 * if (error.code === 'LIMIT_EXCEEDED') {
 *   setOpen(true, 'limit_exceeded');
 * }
 * ```
 */
export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  open: false,
  trigger: 'proactive',
  setOpen: (open, trigger = 'proactive') => set({ open, trigger }),
}));
