'use client';

import React, { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { InterpretationResult } from './InterpretationResult';
import { OutboundResult } from './OutboundResult';
import {
  InboundInterpretationResponse,
  OutboundInterpretationResponse,
} from '@/lib/llm/types';

/**
 * Props for StreamingResult component.
 */
interface StreamingResultProps {
  /** Raw text being streamed from LLM */
  streamingText: string;
  /** Whether actively receiving stream chunks */
  isStreaming: boolean;
  /** Whether interpretation is complete */
  isComplete: boolean;
  /** Final parsed interpretation result */
  result: InboundInterpretationResponse | OutboundInterpretationResponse | null;
  /** Interpretation mode: 'inbound' or 'outbound' */
  mode: 'inbound' | 'outbound';
  /** Original message (for outbound mode display) */
  originalMessage?: string;
  /** Remaining messages for user */
  messagesRemaining?: number;
  /** Database ID of saved interpretation */
  interpretationId?: string;
}

/**
 * Progressively renders streaming interpretation results.
 * Shows raw text while streaming, then formatted result when complete.
 *
 * Accessibility notes:
 * - Uses aria-live="off" during streaming to prevent overwhelming screen readers
 * - Uses aria-busy="true" during streaming to indicate loading state
 * - Switches to aria-live="assertive" when complete for single announcement
 * - Respects prefers-reduced-motion for cursor animation
 *
 * @param props - Component props
 * @returns JSX element or null
 */
export function StreamingResult({
  streamingText,
  isStreaming,
  isComplete,
  result,
  mode,
  originalMessage,
  messagesRemaining,
  interpretationId,
}: StreamingResultProps): JSX.Element | null {
  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Guard against SSR and test environments without matchMedia
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      // Listen for changes
      const handler = (e: MediaQueryListEvent): void => {
        setPrefersReducedMotion(e.matches);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } catch {
      // matchMedia not available in test environment
      return;
    }
  }, []);

  // While streaming: show raw text with typing cursor
  if (isStreaming && !isComplete) {
    return (
      <div
        id="interpretation-results"
        className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4 mt-6"
      >
        {/* Accessibility: aria-live="off" during streaming to prevent overwhelming screen readers */}
        <div
          aria-live="off"
          aria-busy="true"
          aria-label="Interpretation results loading"
          className="prose prose-sm max-w-none dark:prose-invert"
        >
          <p className="whitespace-pre-wrap text-foreground leading-relaxed">
            {streamingText}
            {/* Animated cursor - respects prefers-reduced-motion */}
            {!prefersReducedMotion && (
              <span className="animate-pulse inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle" />
            )}
            {prefersReducedMotion && (
              <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm pt-2 border-t border-border">
          <Spinner size="sm" />
          <span>
            {mode === 'inbound'
              ? 'Generating interpretation...'
              : 'Optimizing message...'}
          </span>
        </div>
      </div>
    );
  }

  // When complete: render formatted result with single announcement
  if (isComplete && result) {
    return (
      <div aria-live="assertive" aria-busy="false">
        {mode === 'inbound' ? (
          <InterpretationResult
            result={result as InboundInterpretationResponse}
            messagesRemaining={messagesRemaining}
            interpretationId={interpretationId}
          />
        ) : (
          <OutboundResult
            result={result as OutboundInterpretationResponse}
            originalMessage={originalMessage || ''}
            messagesRemaining={messagesRemaining}
            interpretationId={interpretationId}
          />
        )}
      </div>
    );
  }

  return null;
}
