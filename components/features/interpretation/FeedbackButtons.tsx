'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react';
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
export function FeedbackButtons({
  interpretationId,
  onFeedbackSubmitted,
}: FeedbackButtonsProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<'up' | 'down' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  /**
   * Submits feedback to the API with optional text feedback.
   * Text is trimmed before submission (empty string converted to null).
   *
   * @param feedback - 'up' or 'down'
   */
  const handleFeedback = async (feedback: 'up' | 'down'): Promise<void> => {
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

      setSubmittedFeedback(feedback);
      onFeedbackSubmitted?.(feedback);
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

  // If feedback already submitted, show success state
  if (submittedFeedback) {
    return (
      <div className="flex items-center justify-center gap-2 pt-4">
        <p className="text-sm text-muted-foreground">Was this helpful?</p>
        <div className="flex gap-2">
          <Button
            variant={submittedFeedback === 'up' ? 'default' : 'outline'}
            size="sm"
            disabled
            className={`min-h-[44px] min-w-[44px] ${
              submittedFeedback === 'up'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'opacity-50'
            }`}
            aria-label="Thumbs up - This interpretation was helpful (selected)"
          >
            {submittedFeedback === 'up' ? (
              <Check className="h-5 w-5" />
            ) : (
              <ThumbsUp className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant={submittedFeedback === 'down' ? 'default' : 'outline'}
            size="sm"
            disabled
            className={`min-h-[44px] min-w-[44px] ${
              submittedFeedback === 'down'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'opacity-50'
            }`}
            aria-label="Thumbs down - This interpretation was not helpful (selected)"
          >
            {submittedFeedback === 'down' ? (
              <Check className="h-5 w-5" />
            ) : (
              <ThumbsDown className="h-5 w-5" />
            )}
          </Button>
        </div>
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

  // Initial state - show textarea and buttons
  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-3 pt-4">
        <p className="text-sm text-muted-foreground">Was this helpful?</p>

        {/* Optional text feedback textarea */}
        <div className="w-full max-w-md space-y-2">
          <Textarea
            placeholder="Tell us more (optional)"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            maxLength={500}
            aria-label="Optional text feedback"
            aria-describedby="char-counter"
            className="min-h-[100px] w-full resize-none"
            disabled={isLoading}
          />
          <p
            id="char-counter"
            className={`text-xs text-right ${
              isNearLimit ? 'text-red-600 dark:text-red-500' : 'text-muted-foreground'
            }`}
          >
            {charCount}/500 characters
          </p>
        </div>

        {/* Thumbs up/down buttons */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback('up')}
                disabled={isLoading}
                className="min-h-[44px] min-w-[44px] hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20"
                aria-label="Thumbs up - This interpretation was helpful"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ThumbsUp className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This interpretation was helpful</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback('down')}
                disabled={isLoading}
                className="min-h-[44px] min-w-[44px] hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20"
                aria-label="Thumbs down - This interpretation was not helpful"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ThumbsDown className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This interpretation was not helpful</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
