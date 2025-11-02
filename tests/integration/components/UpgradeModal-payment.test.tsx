/**
 * Integration Tests for UpgradeModal Payment Flow
 *
 * Tests the complete payment flow through UpgradeModal including:
 * - Button interactions
 * - API calls to checkout endpoints
 * - Loading states
 * - Error handling
 * - Success flows
 *
 * Task 30 - Story 3.4
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpgradeModal } from '@/components/features/upgrade/UpgradeModal';

// Mock next/navigation
const mockRouterRefresh = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
    push: mockRouterPush,
    pathname: '/dashboard',
  }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('UpgradeModal Payment Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Pro Subscription Flow', () => {
    it('should call /api/checkout/pro when Subscribe to Pro clicked', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          checkoutUrl: 'https://checkout.lemonsqueezy.com/pro-123',
        }),
      });

      // Mock window.location.href setter
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: '' }
      });

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_exceeded"
          currentTier="trial"
        />
      );

      // ACT: Click "Subscribe to Pro" button
      const proButton = screen.getByRole('button', { name: /subscribe to pro/i });
      await user.click(proButton);

      // ASSERT: Should call checkout API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/checkout/pro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });

    it('should redirect to Lemon Squeezy checkout on successful Pro checkout', async () => {
      // ARRANGE
      const user = userEvent.setup();
      const checkoutUrl = 'https://checkout.lemonsqueezy.com/pro-456';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          checkoutUrl,
        }),
      });

      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: '' }
      });

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
        />
      );

      // ACT
      const proButton = screen.getByRole('button', { name: /subscribe to pro/i });
      await user.click(proButton);

      // ASSERT: Should redirect to checkout
      await waitFor(() => {
        expect(window.location.href).toBe(checkoutUrl);
      });
    });

    it('should display error toast when Pro checkout fails', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: { code: 'CHECKOUT_CREATION_FAILED', message: 'Internal error' },
        }),
      });

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_exceeded"
          currentTier="trial"
        />
      );

      // ACT
      const proButton = screen.getByRole('button', { name: /subscribe to pro/i });
      await user.click(proButton);

      // ASSERT: Should show error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Subscription Error',
            variant: 'destructive',
          })
        );
      });
    });

    it('should show loading state during Pro checkout', async () => {
      // ARRANGE
      const user = userEvent.setup();

      // Mock slow API response
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    checkoutUrl: 'https://checkout.lemonsqueezy.com/pro-789',
                  }),
                }),
              1000
            )
          )
      );

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
        />
      );

      // ACT
      const proButton = screen.getByRole('button', { name: /subscribe to pro/i });
      await user.click(proButton);

      // ASSERT: Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Button should be disabled during loading
      expect(proButton).toBeDisabled();
    }, 10000); // Increase timeout for this test
  });

  describe('PAYG Subscription Flow', () => {
    it('should call /api/subscription/payg/create when Start PAYG clicked', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          subscription: {
            id: 'sub-123',
            status: 'pending',
            tier: 'payg',
          },
        }),
      });

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_exceeded"
          currentTier="trial"
        />
      );

      // ACT
      const paygButton = screen.getByRole('button', { name: /start pay.as.you.go/i });
      await user.click(paygButton);

      // ASSERT
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/subscription/payg/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      });
    });

    it('should show success toast and refresh on PAYG activation', async () => {
      // ARRANGE
      const user = userEvent.setup();
      const mockOnOpenChange = vi.fn();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          subscription: {
            id: 'sub-456',
            status: 'pending',
            tier: 'payg',
          },
        }),
      });

      render(
        <UpgradeModal
          open={true}
          onOpenChange={mockOnOpenChange}
          trigger="proactive"
          currentTier="trial"
        />
      );

      // ACT
      const paygButton = screen.getByRole('button', { name: /start pay.as.you.go/i });
      await user.click(paygButton);

      // ASSERT: Success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Pay-As-You-Go Activated!',
          })
        );
      });

      // Should close modal
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);

      // Should refresh page (after setTimeout delay)
      await waitFor(() => {
        expect(mockRouterRefresh).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should display error toast when PAYG activation fails', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: { code: 'DUPLICATE_SUBSCRIPTION', message: 'Already has PAYG' },
        }),
      });

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_exceeded"
          currentTier="trial"
        />
      );

      // ACT
      const paygButton = screen.getByRole('button', { name: /start pay.as.you.go/i });
      await user.click(paygButton);

      // ASSERT
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Subscription Error',
            variant: 'destructive',
          })
        );
      });
    });

    it('should show loading state during PAYG activation', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    subscription: { id: 'sub-789', status: 'pending', tier: 'payg' },
                  }),
                }),
              1000
            )
          )
      );

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
        />
      );

      // ACT
      const paygButton = screen.getByRole('button', { name: /start pay.as.you.go/i });
      await user.click(paygButton);

      // ASSERT: Loading state
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      expect(paygButton).toBeDisabled();
    }, 10000);
  });

  describe('Loading State Management', () => {
    it('should prevent double-clicks on Pro button', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    checkoutUrl: 'https://checkout.lemonsqueezy.com/pro-999',
                  }),
                }),
              500
            )
          )
      );

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
        />
      );

      // ACT: Click Pro button twice rapidly
      const proButton = screen.getByRole('button', { name: /subscribe to pro/i });
      await user.click(proButton);
      await user.click(proButton);

      // ASSERT: Should only call API once
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledTimes(1);
        },
        { timeout: 2000 }
      );
    }, 10000);

    it('should disable both buttons when one is loading', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    checkoutUrl: 'https://checkout.lemonsqueezy.com/pro-111',
                  }),
                }),
              1000
            )
          )
      );

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
        />
      );

      // ACT: Click Pro button
      const proButton = screen.getByRole('button', { name: /subscribe to pro/i });
      const paygButton = screen.getByRole('button', { name: /start pay.as.you.go/i });

      await user.click(proButton);

      // ASSERT: Both buttons should be disabled during loading
      await waitFor(() => {
        expect(proButton).toBeDisabled();
        expect(paygButton).toBeDisabled();
      });
    }, 10000);
  });

  describe('Network Error Handling', () => {
    it('should handle network timeout gracefully', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network timeout')
      );

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="limit_exceeded"
          currentTier="trial"
        />
      );

      // ACT
      const proButton = screen.getByRole('button', { name: /subscribe to pro/i });
      await user.click(proButton);

      // ASSERT: Should show error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });
    });

    it('should handle unauthorized error (401)', async () => {
      // ARRANGE
      const user = userEvent.setup();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        }),
      });

      render(
        <UpgradeModal
          open={true}
          onOpenChange={vi.fn()}
          trigger="proactive"
          currentTier="trial"
        />
      );

      // ACT
      const proButton = screen.getByRole('button', { name: /subscribe to pro/i });
      await user.click(proButton);

      // ASSERT
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });
    });
  });
});
