/**
 * Unit tests for useUsageNotification hook (Story 3.2 - Task 14)
 *
 * Tests notification trigger thresholds and dismissal logic.
 * Verifies AC#4, AC#5, AC#6, AC#7 from Story 3.2.
 *
 * @see lib/hooks/useUsageNotification.ts
 * @see docs/stories/3.2.story.md#task-14
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUsageNotification } from '@/lib/hooks/useUsageNotification';
import { useUsageStore } from '@/lib/stores/usageStore';

// Mock the Zustand store
vi.mock('@/lib/stores/usageStore');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useUsageNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Trial User Notifications (AC#4)', () => {
    it('should NOT show notification at 7/10 messages (below threshold)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 7,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(false);
    });

    it('should show notification at 8/10 messages (at threshold)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 8,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(true);
      expect(result.current.message).toContain('8 of 10 trial messages');
    });

    it('should show notification at 9/10 messages', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 9,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(true);
      expect(result.current.message).toContain('9 of 10 trial messages');
    });

    it('should NOT show notification at 10/10 messages (upgrade modal takes over)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 10,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(false);
    });

    it('should include upgrade link for trial users (AC#6)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 8,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.upgradeUrl).toBe('/pricing');
    });
  });

  describe('Pro User Notifications (AC#5)', () => {
    it('should NOT show notification at 79% usage (below threshold)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 79,
        messagesLimit: 100,
        tier: 'pro',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(false);
    });

    it('should show notification at 80% usage (at threshold)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 80,
        messagesLimit: 100,
        tier: 'pro',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(true);
      expect(result.current.message).toContain('80 of 100 messages this month');
    });

    it('should show notification at 95% usage', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 95,
        messagesLimit: 100,
        tier: 'pro',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(true);
    });

    it('should NOT include upgrade link for pro users (AC#6)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 80,
        messagesLimit: 100,
        tier: 'pro',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.upgradeUrl).toBeNull();
    });
  });

  describe('PAYG User Notifications', () => {
    it('should NEVER show notification for PAYG users (no limit)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 1000,
        messagesLimit: null,
        tier: 'payg',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(false);
    });
  });

  describe('Dismissal Logic (AC#7)', () => {
    it('should hide notification after dismissal', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 8,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      // Initially shown
      expect(result.current.show).toBe(true);

      // Dismiss
      act(() => {
        result.current.onDismiss();
      });

      // Should be hidden after dismissal
      expect(result.current.show).toBe(false);
    });

    it('should persist dismissal to localStorage', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 8,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      act(() => {
        result.current.onDismiss();
      });

      // localStorage should have dismissal key
      const dismissalKey = 'usage-notification-dismissed-trial-8';
      expect(localStorageMock.getItem(dismissalKey)).toBe('true');
    });

    it('should use usage-specific dismissal keys (AC#7)', () => {
      const { rerender } = renderHook(() => useUsageNotification());

      // Dismiss at 8/10
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 8,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      rerender();
      const { result: result8 } = renderHook(() => useUsageNotification());
      act(() => {
        result8.current.onDismiss();
      });

      // Should have 8/10 dismissal key
      expect(localStorageMock.getItem('usage-notification-dismissed-trial-8')).toBe('true');

      // Change to 9/10
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 9,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      // Notification should show again at 9/10 (different key)
      const { result: result9 } = renderHook(() => useUsageNotification());
      expect(result9.current.show).toBe(true);
      expect(localStorageMock.getItem('usage-notification-dismissed-trial-9')).toBeNull();
    });

    it('should remember dismissal on page reload', () => {
      // Dismiss at 8/10
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 8,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      const { result: result1 } = renderHook(() => useUsageNotification());
      act(() => {
        result1.current.onDismiss();
      });

      // Simulate page reload (new hook instance)
      const { result: result2 } = renderHook(() => useUsageNotification());

      // Should still be dismissed after "reload"
      expect(result2.current.show).toBe(false);
    });
  });

  describe('Notification Messages', () => {
    it('should include upgrade CTA for trial users', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 8,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.message).toContain('Upgrade to Pro');
      expect(result.current.message).toContain('Pay-As-You-Go');
    });

    it('should mention reset date for pro users', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 80,
        messagesLimit: 100,
        tier: 'pro',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.message).toContain('resets on your billing date');
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly at threshold values', () => {
      // Trial: exactly 8
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 8,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      const { result: trialResult } = renderHook(() => useUsageNotification());
      expect(trialResult.current.show).toBe(true);

      // Pro: exactly 80%
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 80,
        messagesLimit: 100,
        tier: 'pro',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      const { result: proResult } = renderHook(() => useUsageNotification());
      expect(proResult.current.show).toBe(true);
    });

    it('should handle 0 usage', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 0,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { result } = renderHook(() => useUsageNotification());

      expect(result.current.show).toBe(false);
    });
  });
});
