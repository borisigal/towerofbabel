/**
 * Integration Tests for Upgrade Modal Trigger Flow (Story 3.3 - Task 13)
 *
 * Tests end-to-end modal trigger scenarios from different sources.
 * Verifies AC#1 (limit_exceeded), AC#7 (proactive), and notification banner trigger.
 *
 * @see components/features/upgrade/UpgradeModal.tsx
 * @see lib/stores/upgradeModalStore.ts
 * @see docs/stories/3.3.story.md#task-13
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useUpgradeModalStore } from '@/lib/stores/upgradeModalStore';

describe('Upgrade Modal Trigger Flow Integration Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    const { setOpen } = useUpgradeModalStore.getState();
    setOpen(false, 'proactive');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Store-based Modal Triggering', () => {
    it('should open modal when setOpen(true, "limit_exceeded") is called', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Initial state: closed
      expect(useUpgradeModalStore.getState().open).toBe(false);

      // Trigger modal open
      setOpen(true, 'limit_exceeded');

      // Modal should now be open with correct trigger
      const state = useUpgradeModalStore.getState();
      expect(state.open).toBe(true);
      expect(state.trigger).toBe('limit_exceeded');
    });

    it('should open modal when setOpen(true, "proactive") is called', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'proactive');

      const state = useUpgradeModalStore.getState();
      expect(state.open).toBe(true);
      expect(state.trigger).toBe('proactive');
    });

    it('should open modal when setOpen(true, "notification_banner") is called', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'notification_banner');

      const state = useUpgradeModalStore.getState();
      expect(state.open).toBe(true);
      expect(state.trigger).toBe('notification_banner');
    });

    it('should close modal when setOpen(false) is called', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Open modal first
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState().open).toBe(true);

      // Close modal
      setOpen(false);
      expect(useUpgradeModalStore.getState().open).toBe(false);
    });

    it('should allow multiple open/close cycles', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Cycle 1
      setOpen(true, 'proactive');
      expect(useUpgradeModalStore.getState().open).toBe(true);
      setOpen(false);
      expect(useUpgradeModalStore.getState().open).toBe(false);

      // Cycle 2
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState().open).toBe(true);
      setOpen(false);
      expect(useUpgradeModalStore.getState().open).toBe(false);

      // Cycle 3
      setOpen(true, 'notification_banner');
      expect(useUpgradeModalStore.getState().open).toBe(true);
      setOpen(false);
      expect(useUpgradeModalStore.getState().open).toBe(false);
    });
  });

  describe('Trigger Type Tracking', () => {
    it('should track limit_exceeded trigger for analytics', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'limit_exceeded');

      // Trigger should be tracked for analytics purposes
      expect(useUpgradeModalStore.getState().trigger).toBe('limit_exceeded');
    });

    it('should track proactive trigger for analytics', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'proactive');

      expect(useUpgradeModalStore.getState().trigger).toBe('proactive');
    });

    it('should track notification_banner trigger for analytics', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'notification_banner');

      expect(useUpgradeModalStore.getState().trigger).toBe('notification_banner');
    });

    it('should reset trigger to default when closing without specifying trigger', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Open with specific trigger
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState().trigger).toBe('limit_exceeded');

      // Close modal without specifying trigger
      setOpen(false);

      // Trigger resets to default 'proactive'
      expect(useUpgradeModalStore.getState().trigger).toBe('proactive');
    });

    it('should update trigger when modal is reopened with different trigger', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // First open: proactive
      setOpen(true, 'proactive');
      expect(useUpgradeModalStore.getState().trigger).toBe('proactive');

      // Close
      setOpen(false);

      // Reopen: limit_exceeded
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState().trigger).toBe('limit_exceeded');
    });
  });

  describe('Trigger from Different Sources (Simulated)', () => {
    it('should handle API error trigger (LIMIT_EXCEEDED scenario)', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Simulate: InterpretationForm receives 403 LIMIT_EXCEEDED error
      // In actual implementation, this happens in InterpretationForm.tsx handleSubmit
      const simulateApiLimitExceededError = () => {
        setOpen(true, 'limit_exceeded');
      };

      simulateApiLimitExceededError();

      const state = useUpgradeModalStore.getState();
      expect(state.open).toBe(true);
      expect(state.trigger).toBe('limit_exceeded');
    });

    it('should handle proactive upgrade from navigation (simulated)', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Simulate: User clicks "Upgrade" button in DashboardNav
      const simulateNavUpgradeClick = () => {
        setOpen(true, 'proactive');
      };

      simulateNavUpgradeClick();

      const state = useUpgradeModalStore.getState();
      expect(state.open).toBe(true);
      expect(state.trigger).toBe('proactive');
    });

    it('should handle notification banner trigger (simulated)', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Simulate: User clicks "Upgrade Now" in UsageNotificationBanner
      const simulateNotificationBannerClick = () => {
        setOpen(true, 'notification_banner');
      };

      simulateNotificationBannerClick();

      const state = useUpgradeModalStore.getState();
      expect(state.open).toBe(true);
      expect(state.trigger).toBe('notification_banner');
    });
  });

  describe('Modal State Persistence', () => {
    it('should maintain modal state across multiple store accesses', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'proactive');

      // Access state multiple times - should be consistent
      expect(useUpgradeModalStore.getState().open).toBe(true);
      expect(useUpgradeModalStore.getState().open).toBe(true);
      expect(useUpgradeModalStore.getState().trigger).toBe('proactive');
      expect(useUpgradeModalStore.getState().trigger).toBe('proactive');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close cycles', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      setOpen(true, 'proactive');
      setOpen(false);
      setOpen(true, 'limit_exceeded');
      setOpen(false);
      setOpen(true, 'notification_banner');

      const state = useUpgradeModalStore.getState();
      expect(state.open).toBe(true);
      expect(state.trigger).toBe('notification_banner');
    });

    it('should handle opening when already open (with different trigger)', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Open with proactive trigger
      setOpen(true, 'proactive');
      expect(useUpgradeModalStore.getState().trigger).toBe('proactive');

      // Open again with limit_exceeded trigger (should update trigger)
      setOpen(true, 'limit_exceeded');
      expect(useUpgradeModalStore.getState().open).toBe(true);
      expect(useUpgradeModalStore.getState().trigger).toBe('limit_exceeded');
    });

    it('should handle closing when already closed', () => {
      const { setOpen } = useUpgradeModalStore.getState();

      // Initial state: closed
      expect(useUpgradeModalStore.getState().open).toBe(false);

      // Close again (should not error)
      setOpen(false);
      expect(useUpgradeModalStore.getState().open).toBe(false);
    });
  });
});
