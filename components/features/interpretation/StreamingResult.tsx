'use client';

import React from 'react';
import { InterpretationResult } from './InterpretationResult';
import { OutboundResult } from './OutboundResult';
import { InboundStreamingSkeleton } from './InboundStreamingSkeleton';
import { OutboundStreamingSkeleton } from './OutboundStreamingSkeleton';
import {
  InboundInterpretationResponse,
  OutboundInterpretationResponse,
} from '@/lib/llm/types';
import {
  useProgressiveJsonParser,
  type PartialInboundResult,
  type PartialOutboundResult,
} from '@/lib/hooks/useProgressiveJsonParser';

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
 *
 * Instead of showing raw JSON text during streaming, this component:
 * 1. Displays a skeleton UI matching the final result layout
 * 2. Progressively parses the streaming JSON to extract completed fields
 * 3. Fills in sections as they become available
 * 4. Transitions to the final formatted result when complete
 *
 * Accessibility notes:
 * - Uses aria-busy="true" during streaming to indicate loading state
 * - Switches to aria-live="assertive" when complete for single announcement
 * - Respects prefers-reduced-motion for cursor animations
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
  // Parse streaming JSON progressively to extract completed fields
  const partialResult = useProgressiveJsonParser(streamingText, mode);

  // While streaming: show skeleton with progressive content fill-in
  if (isStreaming && !isComplete) {
    if (mode === 'inbound') {
      return (
        <div id="interpretation-results">
          <InboundStreamingSkeleton
            partialResult={partialResult as PartialInboundResult}
            isStreaming={isStreaming}
          />
        </div>
      );
    } else {
      return (
        <div id="interpretation-results">
          <OutboundStreamingSkeleton
            partialResult={partialResult as PartialOutboundResult}
            isStreaming={isStreaming}
            originalMessage={originalMessage || ''}
          />
        </div>
      );
    }
  }

  // When complete: render formatted result with single announcement
  if (isComplete && result) {
    return (
      <div id="interpretation-results" aria-live="assertive" aria-busy="false">
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
