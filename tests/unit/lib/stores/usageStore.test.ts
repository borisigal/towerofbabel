/**
 * Unit tests for usageStore (Story 3.2 - Task 12)
 *
 * Tests Zustand usage store for real-time usage tracking.
 * Verifies state management, setUsage, and incrementUsage functions.
 *
 * @see lib/stores/usageStore.ts
 * @see docs/stories/3.2.story.md#task-12
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUsageStore } from '@/lib/stores/usageStore';

describe('usageStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useUsageStore());
    act(() => {
      result.current.setUsage(0, null, 'trial');
    });
  });

  describe('Initial State', () => {
    it('should have default initial values', () => {
      const { result } = renderHook(() => useUsageStore());

      expect(result.current.messagesUsed).toBe(0);
      expect(result.current.messagesLimit).toBeNull();
      expect(result.current.tier).toBe('trial');
    });
  });

  describe('setUsage', () => {
    it('should set trial user usage correctly', () => {
      const { result } = renderHook(() => useUsageStore());

      act(() => {
        result.current.setUsage(7, 10, 'trial');
      });

      expect(result.current.messagesUsed).toBe(7);
      expect(result.current.messagesLimit).toBe(10);
      expect(result.current.tier).toBe('trial');
    });

    it('should set pro user usage correctly', () => {
      const { result } = renderHook(() => useUsageStore());

      act(() => {
        result.current.setUsage(45, 100, 'pro');
      });

      expect(result.current.messagesUsed).toBe(45);
      expect(result.current.messagesLimit).toBe(100);
      expect(result.current.tier).toBe('pro');
    });

    it('should set PAYG user usage correctly (null limit)', () => {
      const { result } = renderHook(() => useUsageStore());

      act(() => {
        result.current.setUsage(25, null, 'payg');
      });

      expect(result.current.messagesUsed).toBe(25);
      expect(result.current.messagesLimit).toBeNull();
      expect(result.current.tier).toBe('payg');
    });

    it('should update existing values', () => {
      const { result } = renderHook(() => useUsageStore());

      // Set initial values
      act(() => {
        result.current.setUsage(5, 10, 'trial');
      });

      // Update values
      act(() => {
        result.current.setUsage(8, 10, 'trial');
      });

      expect(result.current.messagesUsed).toBe(8);
      expect(result.current.messagesLimit).toBe(10);
      expect(result.current.tier).toBe('trial');
    });
  });

  describe('incrementUsage', () => {
    it('should increment messages used by 1', () => {
      const { result } = renderHook(() => useUsageStore());

      // Set initial state
      act(() => {
        result.current.setUsage(5, 10, 'trial');
      });

      // Increment
      act(() => {
        result.current.incrementUsage();
      });

      expect(result.current.messagesUsed).toBe(6);
      expect(result.current.messagesLimit).toBe(10);
      expect(result.current.tier).toBe('trial');
    });

    it('should increment from 0', () => {
      const { result } = renderHook(() => useUsageStore());

      act(() => {
        result.current.setUsage(0, 10, 'trial');
      });

      act(() => {
        result.current.incrementUsage();
      });

      expect(result.current.messagesUsed).toBe(1);
    });

    it('should increment multiple times', () => {
      const { result } = renderHook(() => useUsageStore());

      act(() => {
        result.current.setUsage(0, 10, 'trial');
      });

      // Increment 3 times
      act(() => {
        result.current.incrementUsage();
        result.current.incrementUsage();
        result.current.incrementUsage();
      });

      expect(result.current.messagesUsed).toBe(3);
    });

    it('should work for PAYG users (no limit)', () => {
      const { result } = renderHook(() => useUsageStore());

      act(() => {
        result.current.setUsage(100, null, 'payg');
      });

      act(() => {
        result.current.incrementUsage();
      });

      expect(result.current.messagesUsed).toBe(101);
      expect(result.current.messagesLimit).toBeNull();
    });

    it('should not modify tier or limit when incrementing', () => {
      const { result } = renderHook(() => useUsageStore());

      act(() => {
        result.current.setUsage(5, 100, 'pro');
      });

      act(() => {
        result.current.incrementUsage();
      });

      expect(result.current.tier).toBe('pro');
      expect(result.current.messagesLimit).toBe(100);
    });
  });

  describe('State Persistence Across Components', () => {
    it('should share state between multiple hook calls', () => {
      const { result: result1 } = renderHook(() => useUsageStore());
      const { result: result2 } = renderHook(() => useUsageStore());

      // Update via first hook
      act(() => {
        result1.current.setUsage(7, 10, 'trial');
      });

      // Both hooks should reflect the same state
      expect(result1.current.messagesUsed).toBe(7);
      expect(result2.current.messagesUsed).toBe(7);
      expect(result1.current.tier).toBe('trial');
      expect(result2.current.tier).toBe('trial');
    });

    it('should propagate increment across hooks', () => {
      const { result: result1 } = renderHook(() => useUsageStore());
      const { result: result2 } = renderHook(() => useUsageStore());

      act(() => {
        result1.current.setUsage(5, 10, 'trial');
      });

      // Increment via second hook
      act(() => {
        result2.current.incrementUsage();
      });

      // Both hooks should reflect the increment
      expect(result1.current.messagesUsed).toBe(6);
      expect(result2.current.messagesUsed).toBe(6);
    });
  });
});
