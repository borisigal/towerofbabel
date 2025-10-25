/**
 * Integration Tests for Usage Update Flow (Story 3.2 - Task 16)
 *
 * Tests end-to-end usage update flow including:
 * - Usage indicator updates after interpretation
 * - Notification banner trigger conditions
 * - Dismissal and re-appearance logic
 * - Page load synchronization
 *
 * Verifies AC#3, AC#4, AC#7, AC#10 from Story 3.2.
 *
 * @see components/features/dashboard/UsageIndicator.tsx
 * @see components/features/dashboard/UsageNotificationBanner.tsx
 * @see lib/hooks/useSyncUsageFromServer.ts
 * @see docs/stories/3.2.story.md#task-16
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { UsageIndicator } from '@/components/features/dashboard/UsageIndicator';
import { UsageNotificationBanner } from '@/components/features/dashboard/UsageNotificationBanner';
import { useUsageStore } from '@/lib/stores/usageStore';

// Mock MSW server for API calls
const server = setupServer();

// Start server before tests
beforeEach(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // Clear localStorage
  localStorage.clear();
  // Reset Zustand store
  const { setUsage } = useUsageStore.getState();
  setUsage(0, null, 'trial');
});

afterEach(() => {
  server.resetHandlers();
  server.close();
});

describe('Usage Update Flow Integration Tests', () => {
  describe('Usage Indicator Updates After Interpretation (AC#3)', () => {
    it('should update usage indicator after successful interpretation', async () => {
      // Setup: Mock API responses
      server.use(
        http.get('/api/user/usage', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tier: 'trial',
              messages_used: 5,
              messages_limit: 10,
              trial_end_date: '2025-11-05T00:00:00Z',
              reset_date: null,
            },
          });
        })
      );

      // Initial render with 5/10 usage
      const { setUsage } = useUsageStore.getState();
      setUsage(5, 10, 'trial');

      const { rerender } = render(<UsageIndicator />);

      // Initial state: 5/10
      expect(screen.getByText(/5\/10/)).toBeInTheDocument();

      // Simulate interpretation success (increment usage)
      const { incrementUsage } = useUsageStore.getState();
      incrementUsage();

      // Re-render to reflect state change
      rerender(<UsageIndicator />);

      // Usage should now show 6/10
      await waitFor(() => {
        expect(screen.getByText(/6\/10/)).toBeInTheDocument();
      });
    });

    it('should update color when usage crosses threshold', async () => {
      const { setUsage } = useUsageStore.getState();

      // Start at 4/10 (green: 40%)
      setUsage(4, 10, 'trial');
      const { container: container1, rerender } = render(<UsageIndicator />);
      let indicator = container1.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-green-/);

      // Increment to 6/10 (yellow: 60%)
      setUsage(6, 10, 'trial');
      rerender(<UsageIndicator />);
      indicator = container1.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-yellow-/);

      // Increment to 9/10 (red: 90%)
      setUsage(9, 10, 'trial');
      rerender(<UsageIndicator />);
      indicator = container1.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-red-/);
    });
  });

  describe('Notification Banner Trigger (AC#4)', () => {
    it('should NOT show banner at 7/10 messages (below threshold)', () => {
      const { setUsage } = useUsageStore.getState();
      setUsage(7, 10, 'trial');

      render(<UsageNotificationBanner />);

      // Banner should not be visible
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should show banner when trial user reaches 8/10 messages', async () => {
      const { setUsage } = useUsageStore.getState();
      setUsage(8, 10, 'trial');

      render(<UsageNotificationBanner />);

      // Banner should appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Should contain trial-specific message
      expect(screen.getByText(/8 of 10 trial messages/)).toBeInTheDocument();
      expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument();
    });

    it('should show banner when Pro user reaches 80% usage', async () => {
      const { setUsage } = useUsageStore.getState();
      setUsage(80, 100, 'pro');

      render(<UsageNotificationBanner />);

      // Banner should appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Should contain Pro-specific message
      expect(screen.getByText(/80 of 100 messages this month/)).toBeInTheDocument();
    });

    it('should NOT show banner at limit (upgrade modal takes over)', () => {
      const { setUsage } = useUsageStore.getState();
      setUsage(10, 10, 'trial');

      render(<UsageNotificationBanner />);

      // Banner should not be visible at limit
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Notification Dismissal Logic (AC#7)', () => {
    it('should dismiss banner and NOT reappear in same session', async () => {
      const user = userEvent.setup();
      const { setUsage } = useUsageStore.getState();
      setUsage(8, 10, 'trial');

      const { rerender } = render(<UsageNotificationBanner />);

      // Banner visible initially
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Click dismiss button
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      // Banner should disappear
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // Re-render (simulate navigation within session)
      rerender(<UsageNotificationBanner />);

      // Banner should stay dismissed
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should remember dismissal on page reload (localStorage)', async () => {
      const user = userEvent.setup();
      const { setUsage } = useUsageStore.getState();
      setUsage(8, 10, 'trial');

      // First render: dismiss banner
      const { unmount } = render(<UsageNotificationBanner />);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // Unmount (simulate page unload)
      unmount();

      // Second render: simulate page reload
      render(<UsageNotificationBanner />);

      // Banner should still be dismissed (localStorage persisted)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should reappear when usage increases to new threshold (AC#7)', async () => {
      const user = userEvent.setup();
      const { setUsage } = useUsageStore.getState();

      // Start at 8/10
      setUsage(8, 10, 'trial');
      const { rerender } = render(<UsageNotificationBanner />);

      // Banner visible
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Dismiss
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // Increment to 9/10 (new threshold)
      setUsage(9, 10, 'trial');
      rerender(<UsageNotificationBanner />);

      // Banner should reappear with new message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText(/9 of 10 trial messages/)).toBeInTheDocument();
    });
  });

  describe('Usage Sync on Page Load (AC#10)', () => {
    it('should fetch usage from database on page load', async () => {
      let apiCalled = false;

      server.use(
        http.get('/api/user/usage', () => {
          apiCalled = true;
          return HttpResponse.json({
            success: true,
            data: {
              tier: 'trial',
              messages_used: 7,
              messages_limit: 10,
              trial_end_date: '2025-11-05T00:00:00Z',
              reset_date: null,
            },
          });
        })
      );

      // Initial state: 0/null
      const { setUsage } = useUsageStore.getState();
      setUsage(0, null, 'trial');

      // Simulate useSyncUsageFromServer hook being called
      const response = await fetch('/api/user/usage');
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        setUsage(
          data.data.messages_used,
          data.data.messages_limit,
          data.data.tier
        );
      }

      // API should have been called
      expect(apiCalled).toBe(true);

      // Store should be updated with database values
      const state = useUsageStore.getState();
      expect(state.messagesUsed).toBe(7);
      expect(state.messagesLimit).toBe(10);
      expect(state.tier).toBe('trial');
    });

    it('should display database values in usage indicator', async () => {
      server.use(
        http.get('/api/user/usage', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tier: 'trial',
              messages_used: 7,
              messages_limit: 10,
              trial_end_date: '2025-11-05T00:00:00Z',
              reset_date: null,
            },
          });
        })
      );

      // Simulate sync
      const response = await fetch('/api/user/usage');
      const data = await response.json();

      const { setUsage } = useUsageStore.getState();
      if (response.ok && data.success && data.data) {
        setUsage(
          data.data.messages_used,
          data.data.messages_limit,
          data.data.tier
        );
      }

      // Render usage indicator
      render(<UsageIndicator />);

      // Should display synced values from database
      expect(screen.getByText(/7\/10/)).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.use(
        http.get('/api/user/usage', () => {
          return HttpResponse.json(
            {
              success: false,
              error: { code: 'INTERNAL_ERROR', message: 'Database error' },
            },
            { status: 500 }
          );
        })
      );

      // Simulate sync with error
      const response = await fetch('/api/user/usage');
      const data = await response.json();

      const { setUsage } = useUsageStore.getState();
      if (response.ok && data.success && data.data) {
        setUsage(
          data.data.messages_used,
          data.data.messages_limit,
          data.data.tier
        );
      }

      // Store should maintain initial state (not crash)
      const state = useUsageStore.getState();
      expect(state.messagesUsed).toBe(0);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('End-to-End Flow', () => {
    it('should handle complete interpretation flow with notification', async () => {
      const user = userEvent.setup();

      // Setup: API responses
      server.use(
        http.get('/api/user/usage', () => {
          return HttpResponse.json({
            success: true,
            data: {
              tier: 'trial',
              messages_used: 7,
              messages_limit: 10,
              trial_end_date: '2025-11-05T00:00:00Z',
              reset_date: null,
            },
          });
        })
      );

      // 1. Page load: Sync usage from server (7/10)
      const response = await fetch('/api/user/usage');
      const data = await response.json();

      const { setUsage, incrementUsage } = useUsageStore.getState();
      if (response.ok && data.success && data.data) {
        setUsage(
          data.data.messages_used,
          data.data.messages_limit,
          data.data.tier
        );
      }

      // 2. Render components
      const { rerender } = render(
        <>
          <UsageIndicator />
          <UsageNotificationBanner />
        </>
      );

      // 3. Verify initial state: 7/10, no notification
      expect(screen.getByText(/7\/10/)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // 4. User submits interpretation → increment to 8/10
      incrementUsage();
      rerender(
        <>
          <UsageIndicator />
          <UsageNotificationBanner />
        </>
      );

      // 5. Verify indicator updated to 8/10
      await waitFor(() => {
        expect(screen.getByText(/8\/10/)).toBeInTheDocument();
      });

      // 6. Verify notification banner appears
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText(/8 of 10 trial messages/)).toBeInTheDocument();

      // 7. User dismisses notification
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      // 8. Verify banner disappears
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // 9. User submits another interpretation → increment to 9/10
      incrementUsage();
      rerender(
        <>
          <UsageIndicator />
          <UsageNotificationBanner />
        </>
      );

      // 10. Verify indicator updated to 9/10
      await waitFor(() => {
        expect(screen.getByText(/9\/10/)).toBeInTheDocument();
      });

      // 11. Verify notification reappears (new threshold)
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText(/9 of 10 trial messages/)).toBeInTheDocument();
    });
  });
});
