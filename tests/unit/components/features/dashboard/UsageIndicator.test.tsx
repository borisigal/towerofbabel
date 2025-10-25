/**
 * Unit tests for UsageIndicator component (Story 3.2 - Task 13)
 *
 * Tests compact usage indicator with color-coding and responsive design.
 * Verifies AC#1, AC#2, AC#8, AC#9 from Story 3.2.
 *
 * @see components/features/dashboard/UsageIndicator.tsx
 * @see docs/stories/3.2.story.md#task-13
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import { UsageIndicator } from '@/components/features/dashboard/UsageIndicator';
import { useUsageStore } from '@/lib/stores/usageStore';

// Mock the Zustand store
vi.mock('@/lib/stores/usageStore');

// Mock Tooltip components to simplify testing (they render in portals)
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}));

describe('UsageIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display Text', () => {
    it('should display trial user usage as fraction (AC#1)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 7,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      // Should show "7/10"
      expect(screen.getByText(/7\/10/)).toBeInTheDocument();
      // "messages used" appears twice (desktop + mobile screen reader)
      expect(screen.getAllByText(/messages used/)).toHaveLength(2);
    });

    it('should display pro user usage as fraction (AC#1)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 45,
        messagesLimit: 100,
        tier: 'pro',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      // Should show "45/100"
      expect(screen.getByText(/45\/100/)).toBeInTheDocument();
    });

    it('should display PAYG price instead of usage (AC#2)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 25,
        messagesLimit: null,
        tier: 'payg',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      // Should show "$0.50 per interpretation" instead of usage count
      // Text appears in both indicator and tooltip
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent(/\$0\.50 per interpretation/);
      expect(screen.queryByText(/25/)).not.toBeInTheDocument();
    });
  });

  describe('Color Coding (AC#8)', () => {
    it('should display green color for low usage (< 50%)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 3,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { container } = render(<UsageIndicator />);

      // Should have green background classes
      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-green-/);
    });

    it('should display yellow color for moderate usage (50-80%)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 65,
        messagesLimit: 100,
        tier: 'pro',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { container } = render(<UsageIndicator />);

      // Should have yellow background classes
      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-yellow-/);
    });

    it('should display red color for high usage (> 80%)', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 9,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { container } = render(<UsageIndicator />);

      // Should have red background classes
      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-red-/);
    });

    it('should display blue color for PAYG users', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 50,
        messagesLimit: null,
        tier: 'payg',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { container } = render(<UsageIndicator />);

      // Should have blue background classes
      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-blue-/);
    });

    it('should transition between colors as usage increases', () => {
      const { rerender, container } = render(<UsageIndicator />);

      // Start with green (40% usage)
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 4,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      rerender(<UsageIndicator />);
      let indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-green-/);

      // Change to yellow (60% usage)
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 6,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      rerender(<UsageIndicator />);
      indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-yellow-/);

      // Change to red (90% usage)
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 9,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      rerender(<UsageIndicator />);
      indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toMatch(/bg-red-/);
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" for screen readers', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 5,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      const { container } = render(<UsageIndicator />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator).toBeInTheDocument();
    });

    it('should have descriptive aria-label for trial users', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 7,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-label', '7 of 10 messages used');
    });

    it('should have descriptive aria-label for PAYG users', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 25,
        messagesLimit: null,
        tier: 'payg',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute(
        'aria-label',
        'Pay-as-you-go: $0.50 per interpretation'
      );
    });

    it('should have tooltip with tier-specific information', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 5,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      // Tooltip content should be rendered (we mocked it to render directly)
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveTextContent(/Trial: 10 messages, expires after 14 days/);
    });
  });

  describe('Responsive Design (AC#9)', () => {
    it('should render abbreviated text for mobile screens', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 7,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      // Desktop text "messages used" should be hidden on mobile
      // "messages used" appears twice (desktop + mobile screen reader)
      const allTexts = screen.getAllByText(/messages used/);
      const desktopText = allTexts.find((el) => el.className.includes('sm:inline'));
      expect(desktopText?.className).toMatch(/sm:inline/);

      // Screen reader only text should exist for mobile
      const mobileScreenReaderText = allTexts.find((el) =>
        el.className.includes('sr-only')
      );
      expect(mobileScreenReaderText).toBeDefined();
    });

    it('should display full text on desktop for trial users', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 7,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      // Both the fraction and "messages used" text should be present
      expect(screen.getByText(/7\/10/)).toBeInTheDocument();
      // "messages used" appears twice (desktop + mobile screen reader)
      expect(screen.getAllByText(/messages used/)).toHaveLength(2);
    });

    it('should display consistent text for PAYG on all screen sizes', () => {
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 25,
        messagesLimit: null,
        tier: 'payg',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });

      render(<UsageIndicator />);

      // PAYG text should not be abbreviated on mobile
      // Text appears in both indicator and tooltip, so find specifically the span element
      const indicator = screen.getByRole('status');
      const paygText = indicator.querySelector('span.text-xs.sm\\:text-sm');
      expect(paygText?.textContent).toMatch(/\$0\.50 per interpretation/);
    });
  });

  describe('Real-time Updates', () => {
    it('should update when store changes', () => {
      const { rerender } = render(<UsageIndicator />);

      // Initial state
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 5,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      rerender(<UsageIndicator />);
      expect(screen.getByText(/5\/10/)).toBeInTheDocument();

      // After increment
      vi.mocked(useUsageStore).mockReturnValue({
        messagesUsed: 6,
        messagesLimit: 10,
        tier: 'trial',
        setUsage: vi.fn(),
        incrementUsage: vi.fn(),
      });
      rerender(<UsageIndicator />);
      expect(screen.getByText(/6\/10/)).toBeInTheDocument();
    });
  });
});
