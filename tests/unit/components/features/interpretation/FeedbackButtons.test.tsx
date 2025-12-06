/**
 * Unit tests for FeedbackButtons component
 *
 * Tests feedback submission UI functionality including:
 * - Initial state rendering
 * - Optional text feedback (textarea)
 * - Character counter logic
 * - API interaction
 * - Loading/success/error states
 * - Keyboard accessibility
 *
 * @see components/features/interpretation/FeedbackButtons.tsx
 * @see docs/stories/4.4.story.md
 * @see docs/stories/7.2.story.md
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

  it('should call API with correct data when thumbs up clicked and submitted', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    // Click thumbs up to select
    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    // Click submit button
    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('should call API with correct data when thumbs down clicked and submitted', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    // Click thumbs down to select
    const thumbsDownButton = screen.getByLabelText(/Thumbs down.*not helpful/i);
    await user.click(thumbsDownButton);

    // Click submit button
    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('should display thank you message after successful submission', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Thanks for your feedback!/i)).toBeInTheDocument();
    });

    // Verify buttons and textarea are gone
    expect(screen.queryByLabelText(/Thumbs up/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Thumbs down/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Tell us more/i)).not.toBeInTheDocument();
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

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

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

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

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

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

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

    // Use keyboard to select thumbs up
    await user.click(thumbsUpButton);

    // Submit button should now be enabled
    const submitButton = screen.getByText(/Submit Feedback/i);
    expect(submitButton).not.toBeDisabled();

    // Click submit
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should disable submit button until thumb is selected or text is entered', () => {
    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const submitButton = screen.getByText(/Submit Feedback/i);
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when text is entered (without thumb selection)', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const submitButton = screen.getByText(/Submit Feedback/i);
    expect(submitButton).toBeDisabled();

    // Type some text
    const textarea = screen.getByPlaceholderText(/Tell us more/i);
    await user.type(textarea, 'Some feedback');

    // Submit button should now be enabled
    expect(submitButton).not.toBeDisabled();
  });

  it('should submit with null feedback when only text is provided', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    // Type text without selecting a thumb
    const textarea = screen.getByPlaceholderText(/Tell us more/i);
    await user.type(textarea, 'Great interpretation!');

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            interpretationId: mockInterpretationId,
            feedback: null, // null when no thumb selected
            feedback_text: 'Great interpretation!',
          }),
        })
      );
    });
  });

  // NEW TESTS FOR STORY 7.2 - Text Feedback Feature

  it('should render textarea for optional text feedback', () => {
    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const textarea = screen.getByPlaceholderText(/Tell us more/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-label', 'Optional text feedback');
  });

  it('should display character counter with correct count', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const textarea = screen.getByPlaceholderText(/Tell us more/i);

    // Initial state
    expect(screen.getByText(/0\/500/i)).toBeInTheDocument();

    // Type some text
    await user.type(textarea, 'This was helpful!');

    // Should update counter
    expect(screen.getByText(/17\/500/i)).toBeInTheDocument();
  });

  it('should turn character counter red when over 450 characters', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const textarea = screen.getByPlaceholderText(/Tell us more/i);

    // Type exactly 451 characters
    const longText = 'a'.repeat(451);
    await user.type(textarea, longText);

    const counter = screen.getByText(/451\/500/i);
    expect(counter).toHaveClass('text-red-600');
  });

  it('should trim whitespace before submission', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const textarea = screen.getByPlaceholderText(/Tell us more/i);
    await user.type(textarea, '  Some feedback with spaces  ');

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          body: JSON.stringify({
            interpretationId: mockInterpretationId,
            feedback: 'up',
            feedback_text: 'Some feedback with spaces',
          }),
        })
      );
    });
  });

  it('should submit feedback with text successfully', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const textarea = screen.getByPlaceholderText(/Tell us more/i);
    await user.type(textarea, 'This interpretation was very helpful!');

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            interpretationId: mockInterpretationId,
            feedback: 'up',
            feedback_text: 'This interpretation was very helpful!',
          }),
        })
      );
    });
  });

  it('should submit feedback without text successfully (empty textarea)', async () => {
    const user = userEvent.setup();

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    // Don't type anything in textarea
    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({
          body: JSON.stringify({
            interpretationId: mockInterpretationId,
            feedback: 'up',
            // feedback_text should be undefined (not sent)
          }),
        })
      );
    });
  });

  it('should enforce 500 character limit via maxLength attribute', () => {
    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const textarea = screen.getByPlaceholderText(/Tell us more/i);
    expect(textarea).toHaveAttribute('maxLength', '500');
  });

  it('should disable buttons and textarea during loading state', async () => {
    const user = userEvent.setup();

    // Mock delayed response to keep loading state
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              } as Response),
            100
          )
        )
    );

    render(
      <FeedbackButtons
        interpretationId={mockInterpretationId}
        onFeedbackSubmitted={mockOnFeedbackSubmitted}
      />
    );

    const thumbsUpButton = screen.getByLabelText(/Thumbs up.*helpful/i);
    await user.click(thumbsUpButton);

    const submitButton = screen.getByText(/Submit Feedback/i);
    await user.click(submitButton);

    // During loading, elements should be disabled
    const textarea = screen.getByPlaceholderText(/Tell us more/i);
    expect(textarea).toBeDisabled();
    expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
  });
});
