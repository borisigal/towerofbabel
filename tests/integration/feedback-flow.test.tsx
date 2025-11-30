/**
 * Integration tests for feedback submission flow.
 * Tests the complete user journey from interpretation results to feedback submission.
 *
 * @see docs/stories/4.4.story.md
 * @see docs/qa/gates/4.4-feedback-mechanism.yml
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterpretationForm } from '@/components/features/interpretation/InterpretationForm';
import { mockSameCultureResult } from '@/tests/fixtures/emotions';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    pathname: '/',
  }),
}));

/**
 * Helper to create a mock fetch that handles streaming fallback and subsequent API calls.
 * @param interpretationResponse - Response for /api/interpret
 * @param subsequentResponses - Array of responses for subsequent calls (e.g., feedback)
 */
function createMockFetchWithStreamingFallback(
  interpretationResponse: object,
  subsequentResponses: Array<{
    ok: boolean;
    json: () => Promise<object>;
  }> = []
) {
  let callIndex = 0;
  return vi.fn().mockImplementation((url: string) => {
    // Streaming endpoint always returns 503 with invalid JSON to trigger fallback
    if (url === '/api/interpret/stream') {
      return Promise.resolve({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
    }

    // Buffered interpretation endpoint
    if (url === '/api/interpret') {
      return Promise.resolve({
        ok: true,
        json: async () => interpretationResponse,
      });
    }

    // Subsequent calls (e.g., feedback)
    if (subsequentResponses.length > 0 && callIndex < subsequentResponses.length) {
      const response = subsequentResponses[callIndex];
      callIndex++;
      return Promise.resolve(response);
    }

    // Default fallback for any other calls
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    });
  });
}

describe('Feedback Flow - Integration Tests', () => {
  const mockInterpretationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    // Clear sessionStorage to reset mode persistence between tests
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  /**
   * INT-4.4-001: Complete inbound interpretation → submit feedback → verify in database
   */
  it('should complete inbound interpretation and submit thumbs up feedback', async () => {
    const user = userEvent.setup();

    // Mock interpretation API response with interpretationId (via streaming fallback)
    global.fetch = createMockFetchWithStreamingFallback(
      {
        success: true,
        data: {
          interpretation: mockSameCultureResult,
          interpretationId: mockInterpretationId,
        },
        metadata: {
          messages_remaining: 9,
        },
      },
      [
        {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              interpretationId: mockInterpretationId,
              feedback: 'up',
              timestamp: new Date().toISOString(),
            },
          }),
        },
      ]
    );

    render(<InterpretationForm />);

    // 1. Fill form and submit interpretation
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    await user.type(textarea, 'Thank you for your help!');

    const senderSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement;
    await user.selectOptions(senderSelect, 'american');

    const receiverTrigger = document.getElementById('receiver-culture')!;
    await user.click(receiverTrigger);
    await waitFor(() => {
      expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
    });
    const receiverAmericans = await screen.findAllByText('🇺🇸 American', {}, { timeout: 2000 });
    await user.click(receiverAmericans[receiverAmericans.length - 1]!);

    const submitButton = screen.getByRole('button', { name: /^interpret$/i });
    await user.click(submitButton);

    // 2. Wait for results to display
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /🎯 The Bottom Line/i })).toBeInTheDocument();
    });

    // 3. Verify feedback buttons are present
    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    expect(thumbsUpButton).toBeInTheDocument();
    expect(thumbsUpButton).toBeEnabled();

    // 4. Click thumbs up button
    await user.click(thumbsUpButton);

    // 5. Verify feedback API was called with correct data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interpretationId: mockInterpretationId,
            feedback: 'up',
          }),
        })
      );
    });

    // 6. Verify success state displayed
    await waitFor(() => {
      const selectedButton = screen.getByLabelText(/Thumbs up.*selected/i);
      expect(selectedButton).toBeDisabled();
    });
  });

  /**
   * INT-4.4-002: Complete outbound optimization → submit feedback → verify in database
   */
  it('should complete outbound optimization and submit thumbs down feedback', async () => {
    const user = userEvent.setup();

    const mockOutboundResult = {
      originalAnalysis: 'Your message might sound too direct.',
      suggestions: ['Add softening language', 'Include context'],
      optimizedMessage: 'I would appreciate if you could help when you have a moment.',
      emotions: [],
    };

    // Mock API responses (via streaming fallback)
    global.fetch = createMockFetchWithStreamingFallback(
      {
        success: true,
        data: {
          interpretation: mockOutboundResult,
          interpretationId: mockInterpretationId,
        },
        metadata: {
          messages_remaining: 8,
        },
      },
      [
        {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              interpretationId: mockInterpretationId,
              feedback: 'down',
              timestamp: new Date().toISOString(),
            },
          }),
        },
      ]
    );

    render(<InterpretationForm />);

    // 1. Switch to outbound mode
    const outboundTab = screen.getByRole('tab', { name: /outbound/i });
    await user.click(outboundTab);

    // 2. Fill form and submit
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to send...'
    );
    await user.type(textarea, 'Can you finish this by tomorrow?');

    const senderSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement;
    await user.selectOptions(senderSelect, 'american');

    const receiverTrigger = document.getElementById('receiver-culture')!;
    await user.click(receiverTrigger);
    await waitFor(() => {
      expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true');
    });
    const receiverJapanese = await screen.findAllByText('🇯🇵 Japanese', {}, { timeout: 2000 });
    await user.click(receiverJapanese[receiverJapanese.length - 1]!);

    const optimizeButton = screen.getByRole('button', { name: /^optimize$/i });
    await user.click(optimizeButton);

    // 3. Wait for results
    await waitFor(() => {
      expect(screen.getByText(/I would appreciate if you could help/i)).toBeInTheDocument();
    });

    // 4. Click thumbs down button
    const thumbsDownButton = screen.getByLabelText(/Thumbs down.*not helpful/i);
    await user.click(thumbsDownButton);

    // 5. Verify API called correctly
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            interpretationId: mockInterpretationId,
            feedback: 'down',
          }),
        })
      );
    });

    // 6. Verify disabled state
    await waitFor(() => {
      const selectedButton = screen.getByLabelText(/Thumbs down.*selected/i);
      expect(selectedButton).toBeDisabled();
    });
  });

  /**
   * INT-4.4-003: Submit feedback → verify buttons stay disabled (idempotency)
   *
   * Note: This test extends the successful feedback submission flow from test 1
   * to additionally verify that disabled buttons prevent re-submission.
   */
  it('should keep feedback buttons disabled after submission (idempotency)', async () => {
    const user = userEvent.setup();

    // Mock API responses: interpretation + feedback (via streaming fallback)
    const mockFetch = createMockFetchWithStreamingFallback(
      {
        success: true,
        data: {
          interpretation: mockSameCultureResult,
          interpretationId: mockInterpretationId,
        },
        metadata: {
          messages_remaining: 7,
        },
      },
      [
        {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              interpretationId: mockInterpretationId,
              feedback: 'down',
              timestamp: new Date().toISOString(),
            },
          }),
        },
      ]
    );

    global.fetch = mockFetch;

    render(<InterpretationForm />);

    // Submit interpretation (same pattern as test 1)
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    await user.type(textarea, 'Test for idempotency');

    const senderSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement;
    await user.selectOptions(senderSelect, 'american');

    const receiverTrigger = document.getElementById('receiver-culture')!;
    await user.click(receiverTrigger);
    await waitFor(() => expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true'));
    const receiverOptions = await screen.findAllByText('🇺🇸 American');
    await user.click(receiverOptions[receiverOptions.length - 1]!);

    await user.click(screen.getByRole('button', { name: /^interpret$/i }));

    // Wait for results and submit feedback
    await waitFor(() => screen.getByRole('heading', { name: /🎯 The Bottom Line/i }));

    const thumbsDownButton = screen.getByLabelText(/Thumbs down.*not helpful/i);
    await user.click(thumbsDownButton);

    // Verify disabled state
    await waitFor(() => {
      const selectedButton = screen.getByLabelText(/Thumbs down.*selected/i);
      expect(selectedButton).toBeDisabled();
    });

    // Verify no additional API calls when clicking disabled button
    const callCountBefore = mockFetch.mock.calls.length;
    await user.click(screen.getByLabelText(/Thumbs down.*selected/i));
    expect(mockFetch.mock.calls.length).toBe(callCountBefore);
  });

  /**
   * INT-4.4-004: Verify each interpretation gets fresh enabled feedback buttons
   *
   * Note: This test verifies that a new interpretation ID results in fresh,
   * enabled feedback buttons (not pre-disabled from previous submissions).
   */
  it('should show fresh enabled feedback buttons for new interpretation', async () => {
    const user = userEvent.setup();

    // Mock interpretation API response (via streaming fallback)
    global.fetch = createMockFetchWithStreamingFallback({
      success: true,
      data: {
        interpretation: mockSameCultureResult,
        interpretationId: '999e9999-e99b-99c9-b999-999999999999',
      },
      metadata: {
        messages_remaining: 5,
      },
    });

    render(<InterpretationForm />);

    // Submit interpretation (same pattern as tests 1 & 2)
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    await user.type(textarea, 'Fresh test message');

    const senderSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement;
    await user.selectOptions(senderSelect, 'american');

    const receiverTrigger = document.getElementById('receiver-culture')!;
    await user.click(receiverTrigger);
    await waitFor(() => expect(receiverTrigger).toHaveAttribute('aria-expanded', 'true'));
    const receiverOptions = await screen.findAllByText('🇺🇸 American');
    await user.click(receiverOptions[receiverOptions.length - 1]!);

    await user.click(screen.getByRole('button', { name: /^interpret$/i }));

    // Wait for results
    await waitFor(() => screen.getByRole('heading', { name: /🎯 The Bottom Line/i }));

    // Verify fresh buttons are enabled
    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    const thumbsDownButton = screen.getByLabelText(/Thumbs down.*not helpful/i);

    expect(thumbsUpButton).toBeEnabled();
    expect(thumbsDownButton).toBeEnabled();
  });
});
