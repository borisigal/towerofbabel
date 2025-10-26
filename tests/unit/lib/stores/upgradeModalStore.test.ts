/**
 * Unit Tests for upgradeModalStore (Story 3.3 - Task 12)
 *
 * Tests Zustand store for upgrade modal state management.
 * Verifies state initialization, setOpen actions, and trigger tracking.
 *
 * @see lib/stores/upgradeModalStore.ts
 * @see docs/stories/3.3.story.md#task-12
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUpgradeModalStore } from '@/lib/stores/upgradeModalStore';
import type { UpgradeModalTrigger } from '@/lib/stores/upgradeModalStore';

describe('upgradeModalStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { setOpen } = useUpgradeModalStore.getState();
    setOpen(false, 'proactive');
  });

  describe('Initial State', () => {
    it('should have correct initial state (open: false)', () => {
      const { open, trigger } = useUpgradeModalStore.getState();

      expect(open).toBe(false);
      expect(trigger).toBe('proactive');
    });
  });

  describe('setOpen Action', () => {
    it('should open modal with limit_exceeded trigger', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'limit_exceeded');

      const { open, trigger } = useUpgradeModalStore.getState();
      expect(open).toBe(true);
      expect(trigger).toBe('limit_exceeded');
    });

    it('should open modal with proactive trigger', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'proactive');

      const { open, trigger } = useUpgradeModalStore.getState();
      expect(open).toBe(true);
      expect(trigger).toBe('proactive');
    });

    it('should open modal with notification_banner trigger', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'notification_banner');

      const { open, trigger } = useUpgradeModalStore.getState();
      expect(open).toBe(true);
      expect(trigger).toBe('notification_banner');
    });

    it('should close modal with setOpen(false)', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // First open the modal
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState().open).toBe(true);

      // Then close it
      setOpen(false);

      const { open } = useUpgradeModalStore.getState();
      expect(open).toBe(false);
    });

    it('should default trigger to "proactive" if not provided', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Open without specifying trigger
      setOpen(true);

      const { open, trigger } = useUpgradeModalStore.getState();
      expect(open).toBe(true);
      expect(trigger).toBe('proactive');
    });

    it('should reset trigger to default when closing without specifying trigger', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Open with specific trigger
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState().trigger).toBe('limit_exceeded');

      // Close modal without specifying trigger
      setOpen(false);

      const { open, trigger } = useUpgradeModalStore.getState();
      expect(open).toBe(false);
      expect(trigger).toBe('proactive'); // Defaults to 'proactive' when not specified
    });

    it('should allow preserving trigger when closing by passing it explicitly', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Open with specific trigger
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState().trigger).toBe('limit_exceeded');

      // Close modal while preserving trigger
      setOpen(false, 'limit_exceeded');

      const { open, trigger } = useUpgradeModalStore.getState();
      expect(open).toBe(false);
      expect(trigger).toBe('limit_exceeded'); // Trigger explicitly preserved
    });
  });

  describe('Trigger Type Safety', () => {
    it('should only accept valid trigger types', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      const validTriggers: UpgradeModalTrigger[] = [
        'limit_exceeded',
        'proactive',
        'notification_banner',
      ];

      validTriggers.forEach((trigger) => {
        setOpen(true, trigger);
        expect(useUpgradeModalStore.getState().trigger).toBe(trigger);
      });
    });
  });

  describe('State Isolation', () => {
    it('should maintain independent state across multiple setOpen calls', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // First action
      setOpen(true, 'proactive');
      expect(useUpgradeModalStore.getState()).toEqual({
        open: true,
        trigger: 'proactive',
        setOpen: expect.any(Function),
      });

      // Second action
      setOpen(false);
      expect(useUpgradeModalStore.getState()).toEqual({
        open: false,
        trigger: 'proactive',
        setOpen: expect.any(Function),
      });

      // Third action with different trigger
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState()).toEqual({
        open: true,
        trigger: 'limit_exceeded',
        setOpen: expect.any(Function),
      });
    });
  });
});
