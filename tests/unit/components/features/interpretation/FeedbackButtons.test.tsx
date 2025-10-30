/**
 * Unit tests for FeedbackButtons component
 *
 * Tests feedback submission UI functionality including:
 * - Initial state rendering
 * - API interaction
 * - Loading/success/error states
 * - Keyboard accessibility
 *
 * @see components/features/interpretation/FeedbackButtons.tsx
 * @see docs/stories/4.4.story.md
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackButtons } from '@/components/features/interpretation/FeedbackButtons';

// Mock fetch globally
global.fetch = vi.fn();

describe('FeedbackButtons', () => {
  const mockInterpretationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockOnFeedbackSubmitted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          interpretationId: mockInterpretationId,
          feedback: 'up',
          timestamp: new Date().toISOString(),
        },
      }),
    } as Response);
  });

  it('should render initial state with both buttons enabled', () => {
    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    expect(screen.getByText('Was this helpful?')).toBeInTheDocument();
    expect(screen.getByLabelText(/Thumbs up.*helpful/i)).toBeEnabled();
    expect(screen.getByLabelText(/Thumbs down.*not helpful/i)).toBeEnabled();
  });

  it('should call API with correct data when thumbs up clicked', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

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
  });

  it('should call API with correct data when thumbs down clicked', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsDownButton = screen.getByLabelText(/Thumbs down.*not helpful/i);
    await user.click(thumbsDownButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interpretationId: mockInterpretationId,
            feedback: 'down',
          }),
        })
      );
    });
  });

  it('should display success state after successful submission', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Thumbs up.*selected/i)).toBeDisabled();
      expect(screen.getByLabelText(/Thumbs down/i)).toBeDisabled();
    });
  });

  it('should call onFeedbackSubmitted callback on success', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    await waitFor(() => {
      expect(mockOnFeedbackSubmitted).toHaveBeenCalledWith('up');
    });
  });

  it('should display error message on API failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to submit feedback';

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: errorMessage,
        },
      }),
    } as Response);

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should allow retry after error', async () => {
    const user = userEvent.setup();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error' },
      }),
    } as Response);

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    await user.click(retryButton);

    // Should show initial state again
    expect(screen.getByLabelText(/Thumbs up.*helpful/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Thumbs down.*not helpful/i)).toBeInTheDocument();
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    const thumbsDownButton = screen.getByLabelText(/Thumbs down.*not helpful/i);

    // Tab to first button
    await user.tab();
    expect(thumbsUpButton).toHaveFocus();

    // Tab to second button
    await user.tab();
    expect(thumbsDownButton).toHaveFocus();

    // Press Enter to submit
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
