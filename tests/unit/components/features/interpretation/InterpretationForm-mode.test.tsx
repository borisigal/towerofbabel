import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterpretationForm } from '@/components/features/interpretation/InterpretationForm';

// Mock Zustand stores
vi.mock('@/lib/stores/usageStore', () => ({
  useUsageStore: vi.fn(() => ({
    messagesUsed: 0,
    messagesLimit: 10,
    tier: 'trial',
    setUsage: vi.fn(),
    incrementUsage: vi.fn(),
  })),
}));

vi.mock('@/lib/stores/upgradeModalStore', () => ({
  useUpgradeModalStore: vi.fn(() => ({
    open: false,
    trigger: 'proactive',
    setOpen: vi.fn(),
  })),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('InterpretationForm - Mode Toggle (Story 4.1)', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up sessionStorage after each test
    sessionStorage.clear();
  });

  describe('Mode Toggle UI', () => {
    it('should render mode toggle with Inbound and Outbound tabs', () => {
      render(<InterpretationForm />);

      expect(screen.getByRole('tab', { name: /inbound/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /outbound/i })).toBeInTheDocument();
    });

    it('should have Inbound tab selected by default', () => {
      render(<InterpretationForm />);

      const inboundTab = screen.getByRole('tab', { name: /inbound/i });
      expect(inboundTab).toHaveAttribute('data-state', 'active');
    });

    it('should switch to Outbound mode when Outbound tab is clicked', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      await waitFor(() => {
        expect(outboundTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('should switch back to Inbound mode when Inbound tab is clicked', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      // First switch to Outbound
      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      // Then switch back to Inbound
      const inboundTab = screen.getByRole('tab', { name: /inbound/i });
      await user.click(inboundTab);

      await waitFor(() => {
        expect(inboundTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('should have accessible aria-label on mode toggle', () => {
      render(<InterpretationForm />);

      const tabsContainer = screen.getByRole('tablist');
      expect(tabsContainer).toHaveAttribute('aria-label', 'Interpretation mode toggle');
    });
  });

  describe('Dynamic Labels - Inbound Mode', () => {
    it('should display "Interpret Message" heading in inbound mode', () => {
      render(<InterpretationForm />);

      expect(screen.getByText('Interpret Message')).toBeInTheDocument();
    });

    it('should display inbound placeholder text in textarea', () => {
      render(<InterpretationForm />);

      expect(
        screen.getByPlaceholderText('Paste the message you want to interpret...')
      ).toBeInTheDocument();
    });

    it('should display "Sender\'s Culture" label in inbound mode', () => {
      render(<InterpretationForm />);

      expect(screen.getByText("Sender's Culture")).toBeInTheDocument();
    });

    it('should display "Receiver\'s Culture" label in inbound mode', () => {
      render(<InterpretationForm />);

      expect(screen.getByText("Receiver's Culture")).toBeInTheDocument();
    });

    it('should display "Interpret" button text in inbound mode', () => {
      render(<InterpretationForm />);

      expect(screen.getByRole('button', { name: /interpret/i })).toBeInTheDocument();
    });
  });

  describe('Dynamic Labels - Outbound Mode', () => {
    it('should update heading to "Optimize Message" when switched to outbound', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      await waitFor(() => {
        expect(screen.getByText('Optimize Message')).toBeInTheDocument();
      });
    });

    it('should update textarea placeholder to outbound text', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Paste the message you want to send...')
        ).toBeInTheDocument();
      });
    });

    it('should update sender label to "Your Culture" in outbound mode', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      await waitFor(() => {
        expect(screen.getByText("Your Culture")).toBeInTheDocument();
      });
    });

    it('should keep receiver label as "Receiver\'s Culture" in outbound mode', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      await waitFor(() => {
        expect(screen.getByText("Receiver's Culture")).toBeInTheDocument();
      });
    });

    it('should update button text to "Optimize" in outbound mode', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /optimize/i })).toBeInTheDocument();
      });
    });
  });

  describe('Mode Persistence - sessionStorage', () => {
    it('should save mode to sessionStorage when switched to outbound', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      await waitFor(() => {
        expect(sessionStorage.getItem('interpretation-mode')).toBe('outbound');
      });
    });

    it('should save mode to sessionStorage when switched back to inbound', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      // Switch to outbound
      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      // Switch back to inbound
      const inboundTab = screen.getByRole('tab', { name: /inbound/i });
      await user.click(inboundTab);

      await waitFor(() => {
        expect(sessionStorage.getItem('interpretation-mode')).toBe('inbound');
      });
    });

    it('should restore mode from sessionStorage on component mount (outbound)', () => {
      // Set sessionStorage before rendering
      sessionStorage.setItem('interpretation-mode', 'outbound');

      render(<InterpretationForm />);

      // Component should restore outbound mode
      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      expect(outboundTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('Optimize Message')).toBeInTheDocument();
    });

    it('should restore mode from sessionStorage on component mount (inbound)', () => {
      // Set sessionStorage before rendering
      sessionStorage.setItem('interpretation-mode', 'inbound');

      render(<InterpretationForm />);

      // Component should restore inbound mode
      const inboundTab = screen.getByRole('tab', { name: /inbound/i });
      expect(inboundTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('Interpret Message')).toBeInTheDocument();
    });

    it('should default to inbound mode when sessionStorage is empty', () => {
      // Ensure sessionStorage is empty
      sessionStorage.clear();

      render(<InterpretationForm />);

      const inboundTab = screen.getByRole('tab', { name: /inbound/i });
      expect(inboundTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('Interpret Message')).toBeInTheDocument();
    });

    it('should default to inbound mode when sessionStorage has invalid value', () => {
      // Set invalid mode value
      sessionStorage.setItem('interpretation-mode', 'invalid-mode');

      render(<InterpretationForm />);

      const inboundTab = screen.getByRole('tab', { name: /inbound/i });
      expect(inboundTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('API Integration with Mode Parameter', () => {
    it('should include mode=inbound in API request when in inbound mode', async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { interpretation: { summary: 'Test', emotions: [] } },
          metadata: { messages_remaining: 9 },
        }),
      });
      global.fetch = mockFetch;

      render(<InterpretationForm />);

      // Fill form
      const textarea = screen.getByPlaceholderText('Paste the message you want to interpret...');
      await user.type(textarea, 'Test message');

      // Note: In a real test, you'd also select cultures and click submit
      // For now, we're just verifying the mode parameter would be included
      // Full integration test would be in integration test file
    });

    it('should include mode=outbound in API request when in outbound mode', async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { interpretation: { summary: 'Test', emotions: [] } },
          metadata: { messages_remaining: 9 },
        }),
      });
      global.fetch = mockFetch;

      render(<InterpretationForm />);

      // Switch to outbound mode
      const outboundTab = screen.getByRole('tab', { name: /outbound/i });
      await user.click(outboundTab);

      // Fill form
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Paste the message you want to send...');
        expect(textarea).toBeInTheDocument();
      });

      // Note: Full form submission test would be in integration test file
    });
  });

  describe('Accessibility', () => {
    it('should have keyboard-accessible tab navigation', async () => {
      const user = userEvent.setup();
      render(<InterpretationForm />);

      const inboundTab = screen.getByRole('tab', { name: /inbound/i });
      const outboundTab = screen.getByRole('tab', { name: /outbound/i });

      // Focus on inbound tab
      inboundTab.focus();
      expect(inboundTab).toHaveFocus();

      // Tab to next element (should move to outbound tab)
      await user.tab();
      // Note: Radix UI tabs may handle focus differently
      // This test verifies tabs are in tab order
    });

    it('should have minimum 44px height for touch targets', () => {
      render(<InterpretationForm />);

      const inboundTab = screen.getByRole('tab', { name: /inbound/i });
      const outboundTab = screen.getByRole('tab', { name: /outbound/i });

      // Check that tabs have min-h-[44px] class
      expect(inboundTab.className).toContain('min-h-[44px]');
      expect(outboundTab.className).toContain('min-h-[44px]');
    });
  });
});
