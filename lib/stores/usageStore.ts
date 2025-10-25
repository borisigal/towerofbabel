import { create } from 'zustand';

/**
 * Usage state interface defining the shape of the usage store.
 * Tracks user's message usage, limits, and tier information.
 */
interface UsageState {
  /** Number of messages used by the user */
  messagesUsed: number;
  /** Maximum messages allowed (null for unlimited PAYG) */
  messagesLimit: number | null;
  /** User's subscription tier */
  tier: 'trial' | 'payg' | 'pro';
  /**
   * Sets the usage state from server data.
   * @param used - Current messages used count
   * @param limit - Maximum messages allowed (null for PAYG)
   * @param tier - User's subscription tier
   */
  setUsage: (used: number, limit: number | null, tier: 'trial' | 'payg' | 'pro') => void;
  /**
   * Increments the messages used count by 1.
   * Called after successful interpretation.
   */
  incrementUsage: () => void;
}

/**
 * Global Zustand store for tracking user message usage across components.
 *
 * This store provides real-time usage tracking that updates automatically
 * across all components that consume it (UsageIndicator, UsageNotificationBanner, etc.).
 *
 * @example
 * ```typescript
 * // In a component
 * const { messagesUsed, messagesLimit, incrementUsage } = useUsageStore();
 *
 * // After successful interpretation
 * incrementUsage();
 * ```
 */
export const useUsageStore = create<UsageState>((set) => ({
  messagesUsed: 0,
  messagesLimit: null,
  tier: 'trial',
  setUsage: (used, limit, tier) =>
    set({ messagesUsed: used, messagesLimit: limit, tier }),
  incrementUsage: () =>
    set((state) => ({ messagesUsed: state.messagesUsed + 1 })),
}));
