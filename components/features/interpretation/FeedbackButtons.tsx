'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
 * - Loading state during API call
 * - Visual confirmation on success
 * - Disabled state after submission (can't change vote)
 * - Error handling with retry option
 * - Keyboard accessible (Tab, Enter, Space)
 * - Screen reader friendly (ARIA labels)
 * - Tooltip on hover: "Was this interpretation helpful?"
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

  /**
   * Submits feedback to the API.
   * @param feedback - 'up' or 'down'
   */
  const handleFeedback = async (feedback: 'up' | 'down'): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interpretationId,
          feedback,
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

  // Initial state - show both buttons
  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-2 pt-4">
        <p className="text-sm text-muted-foreground">Was this helpful?</p>
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
