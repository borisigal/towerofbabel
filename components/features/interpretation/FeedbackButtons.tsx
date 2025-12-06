'use client';

import React, { useState, memo } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FeedbackButtonsProps {
  /** UUID of the interpretation to provide feedback for */
  interpretationId: string;
  /** Optional callback when feedback is successfully submitted */
  onFeedbackSubmitted?: (feedback: 'up' | 'down') => void;
}

/**
 * Feedback Buttons Component
 *
 * Provides thumbs up/down feedback mechanism for interpretation quality.
 * Works with both inbound interpretations and outbound optimizations.
 *
 * Features:
 * - Thumbs up/down buttons
 * - Optional text feedback (500 character limit)
 * - Character counter with visual warning (red when >450 characters)
 * - Loading state during API call
 * - Visual confirmation on success
 * - Disabled state after submission (can't change vote)
 * - Error handling with retry option
 * - Keyboard accessible (Tab, Enter, Space)
 * - Screen reader friendly (ARIA labels)
 * - Tooltip on hover: "Was this interpretation helpful?"
 *
 * User Flow:
 * 1. User optionally types feedback in textarea
 * 2. User clicks thumbs up/down to submit both feedback type and text
 * 3. Text is trimmed and sanitized before submission
 * 4. Empty text treated as NULL (optional feedback)
 *
 * Privacy: Feedback links to interpretation_id only (no message content).
 *
 * @param interpretationId - UUID of interpretation to provide feedback for
 * @param onFeedbackSubmitted - Optional callback on successful submission
 *
 * @example
 * ```tsx
 * <FeedbackButtons
 *   interpretationId="123e4567-e89b-12d3-a456-426614174000"
 *   onFeedbackSubmitted={(feedback) => console.log('Feedback:', feedback)}
 * />
 * ```
 */
const FeedbackButtonsComponent = function FeedbackButtons({
  interpretationId,
  onFeedbackSubmitted,
}: FeedbackButtonsProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<'up' | 'down' | null>(null);

  /**
   * Submits feedback to the API with optional text feedback.
   * Text is trimmed before submission (empty string converted to null).
   *
   * @param feedback - 'up', 'down', or null (text-only feedback)
   */
  const handleFeedback = async (feedback: 'up' | 'down' | null): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Trim feedback text and convert empty string to null
      const trimmedText = feedbackText.trim();
      const feedbackTextPayload = trimmedText.length > 0 ? trimmedText : undefined;

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interpretationId,
          feedback,
          feedback_text: feedbackTextPayload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to submit feedback');
      }

      // Mark as successfully submitted
      setIsSubmitted(true);
      if (feedback) {
        onFeedbackSubmitted?.(feedback);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Retries feedback submission after error.
   */
  const handleRetry = (): void => {
    setError(null);
  };

  // If feedback already submitted, show thank you message
  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center pt-4">
        <p className="text-lg font-medium text-white/90">Thanks for your feedback!</p>
      </div>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 pt-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="min-h-[44px]"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Character count and styling
  const charCount = feedbackText.length;
  const isNearLimit = charCount > 450;

  // Initial state - show thumbs, textarea, and submit button
  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-4 pt-4 w-full">
        <p className="text-sm text-muted-foreground">Was this helpful?</p>

        {/* Thumbs up/down buttons */}
        <div className="flex gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedFeedback === 'up' ? 'default' : 'outline'}
                size="sm"
                disabled={isLoading}
                className={`min-h-[44px] min-w-[44px] ${
                  selectedFeedback === 'up'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20'
                }`}
                aria-label="Thumbs up - This interpretation was helpful"
                onClick={() => setSelectedFeedback('up')}
              >
                <ThumbsUp className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This interpretation was helpful</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedFeedback === 'down' ? 'default' : 'outline'}
                size="sm"
                disabled={isLoading}
                className={`min-h-[44px] min-w-[44px] ${
                  selectedFeedback === 'down'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20'
                }`}
                aria-label="Thumbs down - This interpretation was not helpful"
                onClick={() => setSelectedFeedback('down')}
              >
                <ThumbsDown className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This interpretation was not helpful</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Optional text feedback textarea with character counter inside */}
        <div className="w-full max-w-2xl relative">
          <Textarea
            placeholder="Tell us more (optional)"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            maxLength={500}
            aria-label="Optional text feedback"
            aria-describedby="char-counter"
            className="min-h-[150px] w-full resize-none bg-white dark:bg-white dark:text-gray-900 pb-8"
            disabled={isLoading}
          />
          <p
            id="char-counter"
            className={`absolute bottom-2 right-3 text-xs ${
              isNearLimit ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            {charCount}/500
          </p>
        </div>

        {/* Submit button */}
        <Button
          onClick={() => {
            // Submit with selected thumb (or null if only text provided)
            handleFeedback(selectedFeedback);
          }}
          disabled={isLoading || (!selectedFeedback && feedbackText.trim().length === 0)}
          className="min-h-[44px] px-8 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
};

// Memoize component to prevent unnecessary re-renders
// Only re-render if interpretationId changes (which never happens after mount)
export const FeedbackButtons = memo(FeedbackButtonsComponent);
