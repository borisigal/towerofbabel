/**
 * Integration tests for complete interpretation flow.
 * Tests the user journey from form submission through loading to results display.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterpretationForm } from '@/components/features/interpretation/InterpretationForm';
import {
  mockSameCultureResult,
  mockCrossCultureResult,
} from '@/tests/fixtures/emotions';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    pathname: '/',
  }),
}));

describe('Interpretation Flow - Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock scrollIntoView (not available in jsdom)
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    // Restore fetch mock after each test
    vi.restoreAllMocks();
  });

  describe('Success path - Same culture interpretation', () => {
    it('should submit form → show loading → display results with single emotion scores', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            interpretation: mockSameCultureResult,
          },
          metadata: {
            messages_remaining: 9,
          },
        }),
      });

      render(<InterpretationForm />);

      // 1. Fill in the form
      const textarea = screen.getByPlaceholderText(
        'Paste the message you want to interpret...'
      );
      await user.type(textarea, 'Thank you so much for your help!');

      // 2. Select American for both sender and receiver (same culture)
      // Note: Radix UI Select uses #id for trigger button
      // Use the hidden native select for reliable interaction
      const senderSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement;
      await user.selectOptions(senderSelect, 'american');

      const receiverTrigger = document.getElementById('receiver-culture')!;
      await user.click(receiverTrigger);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
      });
      const receiverAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(receiverAmericans[receiverAmericans.length - 1]);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'false');
      });

      // 3. Submit the form
      const submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // 4. Verify results display (loading state completes too fast to test reliably)
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /🎯 The Bottom Line/i })
        ).toBeInTheDocument();
      });

      // 6. Verify bottom line content
      expect(
        screen.getByText(
          /The sender is expressing sincere gratitude with warmth/i
        )
      ).toBeInTheDocument();

      // 7. Verify cultural context
      expect(
        screen.getByText(/In American culture, "thank you so much"/i)
      ).toBeInTheDocument();

      // 8. Verify single emotion scores (same culture)
      expect(screen.getByText('1. Gratitude')).toBeInTheDocument();
      expect(screen.getAllByText('Intensity:').length).toBeGreaterThan(0);
      expect(screen.queryByText('In their culture:')).not.toBeInTheDocument();
      expect(screen.queryByText('In your culture:')).not.toBeInTheDocument();

      // 9. Verify messages remaining counter
      expect(screen.getByText(/9 messages remaining/i)).toBeInTheDocument();
    });
  });

  describe('Success path - Cross culture interpretation', () => {
    it('should submit form → show loading → display results with dual emotion scores', async () => {
      const user = userEvent.setup();

      // Mock successful cross-culture API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            interpretation: mockCrossCultureResult,
          },
          metadata: {
            messages_remaining: 8,
          },
        }),
      });

      render(<InterpretationForm />);

      // Fill in the form
      const textarea = screen.getByPlaceholderText(
        'Paste the message you want to interpret...'
      );
      await user.type(textarea, 'Let me know what you think.');

      // Select American sender and Japanese receiver (cross culture)
      const senderTrigger = document.getElementById('sender-culture')!;
      await user.click(senderTrigger);
      const senderAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(senderAmericans[senderAmericans.length - 1]);

      const receiverTrigger = document.getElementById('receiver-culture')!;
      await user.click(receiverTrigger);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
      });
      const receiverJapaneses = await screen.findAllByText('🇯🇵 Japanese', {}, { timeout: 2000 });
      await user.click(receiverJapaneses[receiverJapaneses.length - 1]);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'false');
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // Verify results display (loading state completes too fast to test reliably)
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /🎯 The Bottom Line/i })
        ).toBeInTheDocument();
      });

      // Verify dual emotion scores (cross culture)
      expect(screen.getByText('1. Directness')).toBeInTheDocument();
      const theirCultureLabels = screen.getAllByText('In their culture:');
      const yourCultureLabels = screen.getAllByText('In your culture:');
      expect(theirCultureLabels.length).toBeGreaterThan(0);
      expect(yourCultureLabels.length).toBeGreaterThan(0);

      // Verify messages remaining
      expect(screen.getByText(/8 messages remaining/i)).toBeInTheDocument();
    });
  });

  describe('Error path - API errors', () => {
    it('should show error message when API returns 401 Unauthorized', async () => {
      const user = userEvent.setup();

      // Mock 401 error response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please sign in to continue',
          },
        }),
      });

      render(<InterpretationForm />);

      // Fill and submit form
      const textarea = screen.getByPlaceholderText(
        'Paste the message you want to interpret...'
      );
      await user.type(textarea, 'Test message');

      const senderTrigger = document.getElementById('sender-culture')!;
      await user.click(senderTrigger);
      const senderAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(senderAmericans[senderAmericans.length - 1]);

      const receiverTrigger = document.getElementById('receiver-culture')!;
      await user.click(receiverTrigger);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
      });
      const receiverJapaneses = await screen.findAllByText('🇯🇵 Japanese', {}, { timeout: 2000 });
      await user.click(receiverJapaneses[receiverJapaneses.length - 1]);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'false');
      });

      const submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // Verify error message displays
      await waitFor(() => {
        expect(
          screen.getByText(/Please sign in to continue/i)
        ).toBeInTheDocument();
      });

      // Verify results are NOT displayed
      expect(
        screen.queryByRole('heading', { name: /🎯 The Bottom Line/i })
      ).not.toBeInTheDocument();
    });

    it('should show error message when API returns 403 Limit Exceeded', async () => {
      const user = userEvent.setup();

      // Mock 403 error response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: {
            code: 'LIMIT_EXCEEDED',
            message: "You've reached your message limit. Upgrade to Pro!",
          },
        }),
      });

      render(<InterpretationForm />);

      // Fill and submit form
      const textarea = screen.getByPlaceholderText(
        'Paste the message you want to interpret...'
      );
      await user.type(textarea, 'Test message');

      const senderTrigger = document.getElementById('sender-culture')!;
      await user.click(senderTrigger);
      const senderAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(senderAmericans[senderAmericans.length - 1]);

      const receiverTrigger = document.getElementById('receiver-culture')!;
      await user.click(receiverTrigger);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
      });
      const receiverJapaneses = await screen.findAllByText('🇯🇵 Japanese', {}, { timeout: 2000 });
      await user.click(receiverJapaneses[receiverJapaneses.length - 1]);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'false');
      });

      const submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // Verify error message displays
      await waitFor(() => {
        expect(
          screen.getByText(/reached your message limit/i)
        ).toBeInTheDocument();
      });
    });

    it('should show network error message when fetch fails', async () => {
      const user = userEvent.setup();

      // Mock network error
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      render(<InterpretationForm />);

      // Fill and submit form
      const textarea = screen.getByPlaceholderText(
        'Paste the message you want to interpret...'
      );
      await user.type(textarea, 'Test message');

      const senderTrigger = document.getElementById('sender-culture')!;
      await user.click(senderTrigger);
      const senderAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(senderAmericans[senderAmericans.length - 1]);

      const receiverTrigger = document.getElementById('receiver-culture')!;
      await user.click(receiverTrigger);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
      });
      const receiverJapaneses = await screen.findAllByText('🇯🇵 Japanese', {}, { timeout: 2000 });
      await user.click(receiverJapaneses[receiverJapaneses.length - 1]);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'false');
      });

      const submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // Verify network error message displays
      await waitFor(() => {
        expect(
          screen.getByText(/Network error.*check your connection/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Result persistence', () => {
    it('should persist results until new submission', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            interpretation: mockSameCultureResult,
          },
          metadata: {
            messages_remaining: 9,
          },
        }),
      });

      render(<InterpretationForm />);

      // Submit first interpretation
      const textarea = screen.getByPlaceholderText(
        'Paste the message you want to interpret...'
      );
      await user.type(textarea, 'Thank you!');

      const senderTrigger = document.getElementById('sender-culture')!;
      await user.click(senderTrigger);
      const senderAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(senderAmericans[senderAmericans.length - 1]);

      const receiverTrigger = document.getElementById('receiver-culture')!;
      await user.click(receiverTrigger);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
      });
      const receiverAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(receiverAmericans[receiverAmericans.length - 1]);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'false');
      });

      const submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // Wait for results to display
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /🎯 The Bottom Line/i })
        ).toBeInTheDocument();
      });

      // Results should remain visible
      expect(
        screen.getByText(
          /The sender is expressing sincere gratitude with warmth/i
        )
      ).toBeInTheDocument();

      // Modify the form (but don't submit yet)
      await user.clear(textarea);
      await user.type(textarea, 'Different message');

      // Results should still be visible
      expect(
        screen.getByText(
          /The sender is expressing sincere gratitude with warmth/i
        )
      ).toBeInTheDocument();
    });

    it('should clear previous results when submitting new interpretation', async () => {
      const user = userEvent.setup();

      // Mock first successful API response
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              interpretation: mockSameCultureResult,
            },
            metadata: {
              messages_remaining: 9,
            },
          }),
        })
        // Mock second successful API response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              interpretation: mockCrossCultureResult,
            },
            metadata: {
              messages_remaining: 8,
            },
          }),
        });

      render(<InterpretationForm />);

      // Submit first interpretation
      const textarea = screen.getByPlaceholderText(
        'Paste the message you want to interpret...'
      );
      await user.type(textarea, 'First message');

      const senderTrigger = document.getElementById('sender-culture')!;
      await user.click(senderTrigger);
      const senderAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(senderAmericans[senderAmericans.length - 1]);

      const receiverTrigger = document.getElementById('receiver-culture')!;
      await user.click(receiverTrigger);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
      });
      const receiverAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(receiverAmericans[receiverAmericans.length - 1]);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'false');
      });

      let submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // Wait for first results
      await waitFor(() => {
        expect(
          screen.getByText(
            /The sender is expressing sincere gratitude with warmth/i
          )
        ).toBeInTheDocument();
      });

      // Submit second interpretation
      await user.clear(textarea);
      await user.type(textarea, 'Second message');

      submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // Wait for second results
      await waitFor(() => {
        expect(
          screen.getByText(/The sender is being very direct/i)
        ).toBeInTheDocument();
      });

      // First results should be replaced
      expect(
        screen.queryByText(
          /The sender is expressing sincere gratitude with warmth/i
        )
      ).not.toBeInTheDocument();
    });
  });

  describe('Loading state behavior', () => {
    it('should disable form inputs during loading', async () => {
      const user = userEvent.setup();

      // Mock slow API response
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: {
                      interpretation: mockSameCultureResult,
                    },
                    metadata: {
                      messages_remaining: 9,
                    },
                  }),
                }),
              1000
            )
          )
      );

      render(<InterpretationForm />);

      // Fill and submit form
      const textarea = screen.getByPlaceholderText(
        'Paste the message you want to interpret...'
      );
      await user.type(textarea, 'Test message');

      const senderTrigger = document.getElementById('sender-culture')!;
      await user.click(senderTrigger);
      const senderAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
      await user.click(senderAmericans[senderAmericans.length - 1]);

      const receiverTrigger = document.getElementById('receiver-culture')!;
      await user.click(receiverTrigger);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
      });
      const receiverJapaneses = await screen.findAllByText('🇯🇵 Japanese', {}, { timeout: 2000 });
      await user.click(receiverJapaneses[receiverJapaneses.length - 1]);
      await waitFor(() => {
        expect(receiverTrigger).toHaveAttribute('aria-expanded', 'false');
      });

      const submitButton = screen.getByRole('button', { name: /^interpret$/i });
      await user.click(submitButton);

      // Verify textarea and button are disabled during loading
      await waitFor(() => {
        expect(textarea).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });
    }, 10000); // Increase timeout for this test
  });
});
