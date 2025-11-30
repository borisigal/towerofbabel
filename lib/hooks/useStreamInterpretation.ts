/**
 * Custom hook for streaming interpretation requests.
 * Handles SSE parsing, state management, and graceful fallback to buffered requests.
 *
 * @see docs/stories/6.1.story.md
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { CultureCode } from '@/lib/types/models';
import {
  InboundInterpretationResponse,
  OutboundInterpretationResponse,
} from '@/lib/llm/types';
import { SSEEventData } from '@/lib/llm/streamTypes';
import { log } from '@/lib/observability/logger';

/**
 * Request data for interpretation submission.
 */
interface InterpretationRequest {
  message: string;
  sender_culture: CultureCode;
  receiver_culture: CultureCode;
  mode: 'inbound' | 'outbound';
}

/**
 * Error object returned from interpretation.
 */
interface InterpretationError {
  code: string;
  message: string;
}

/**
 * Result type that can be either inbound or outbound interpretation.
 */
type InterpretationResult =
  | InboundInterpretationResponse
  | OutboundInterpretationResponse;

/**
 * Return type for useStreamInterpretation hook.
 */
interface UseStreamInterpretationReturn {
  /** Accumulated streaming text (raw LLM output) */
  streamingText: string;
  /** Whether currently receiving stream chunks */
  isStreaming: boolean;
  /** Whether the entire request is loading (includes streaming) */
  isLoading: boolean;
  /** Whether interpretation is complete */
  isComplete: boolean;
  /** Final parsed interpretation result */
  result: InterpretationResult | null;
  /** Error from interpretation (if any) */
  error: InterpretationError | null;
  /** Database ID of saved interpretation */
  interpretationId: string | null;
  /** Remaining messages for user */
  messagesRemaining: number | undefined;
  /** Submit function to start interpretation */
  submit: (data: InterpretationRequest) => Promise<void>;
  /** Reset function to clear state */
  reset: () => void;
}

/**
 * Custom hook for streaming interpretation with SSE.
 *
 * Features:
 * - Progressive streaming text accumulation
 * - AbortController for request cancellation
 * - Automatic fallback to buffered /api/interpret on failure
 * - Proper cleanup on unmount
 * - SSE event parsing with buffer handling
 *
 * State Transitions:
 * idle -> submitting -> streaming -> complete -> idle
 *      \-> error -> idle (retry)
 *      \-> fallback -> buffered_loading -> complete/error
 *
 * @returns Hook state and functions
 *
 * @example
 * ```tsx
 * const {
 *   streamingText,
 *   isStreaming,
 *   isLoading,
 *   result,
 *   error,
 *   submit,
 * } = useStreamInterpretation();
 *
 * // Submit interpretation
 * await submit({
 *   message: 'Hello',
 *   sender_culture: 'american',
 *   receiver_culture: 'japanese',
 *   mode: 'inbound',
 * });
 * ```
 */
export function useStreamInterpretation(): UseStreamInterpretationReturn {
  // State
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<InterpretationResult | null>(null);
  const [error, setError] = useState<InterpretationError | null>(null);
  const [interpretationId, setInterpretationId] = useState<string | null>(null);
  const [messagesRemaining, setMessagesRemaining] = useState<number | undefined>(
    undefined
  );

  // AbortController ref for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Reset all state to initial values.
   */
  const reset = useCallback(() => {
    setStreamingText('');
    setIsStreaming(false);
    setIsLoading(false);
    setIsComplete(false);
    setResult(null);
    setError(null);
    setInterpretationId(null);
    setMessagesRemaining(undefined);
  }, []);

  /**
   * Fallback to buffered /api/interpret endpoint.
   * Called when streaming fails.
   *
   * @param data - Request data
   */
  const submitBuffered = useCallback(
    async (data: InterpretationRequest): Promise<void> => {
      log.info('Falling back to buffered interpretation', {
        mode: data.mode,
      });

      try {
        const response = await fetch('/api/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: data.message,
            sender_culture: data.sender_culture,
            receiver_culture: data.receiver_culture,
            mode: data.mode,
          }),
        });

        const responseData = await response.json();

        if (responseData.success) {
          setResult(responseData.data.interpretation);
          setInterpretationId(responseData.data.interpretationId);
          setMessagesRemaining(responseData.metadata?.messages_remaining);
          setIsComplete(true);
        } else {
          setError({
            code: responseData.error?.code || 'INTERNAL_ERROR',
            message:
              responseData.error?.message ||
              'Interpretation failed. Please try again.',
          });
        }
      } catch (err) {
        log.error('Buffered fallback failed', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError({
          code: 'INTERNAL_ERROR',
          message: 'Network error. Please check your connection and try again.',
        });
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    []
  );

  /**
   * Parse SSE data from a line.
   * Handles the 'data: ' prefix and JSON parsing.
   *
   * @param line - SSE line to parse
   * @returns Parsed event data or null
   */
  const parseSSELine = useCallback((line: string): SSEEventData | null => {
    if (!line.startsWith('data: ')) {
      return null;
    }

    try {
      return JSON.parse(line.slice(6)) as SSEEventData;
    } catch (err) {
      log.error('Failed to parse SSE event', {
        error: err instanceof Error ? err.message : 'Unknown error',
        line,
      });
      return null;
    }
  }, []);

  /**
   * Submit streaming interpretation request.
   *
   * @param data - Request data
   */
  const submit = useCallback(
    async (data: InterpretationRequest): Promise<void> => {
      // Cancel any previous in-flight request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Reset state for new request
      setStreamingText('');
      setIsStreaming(true);
      setIsLoading(true);
      setIsComplete(false);
      setResult(null);
      setError(null);
      setInterpretationId(null);
      setMessagesRemaining(undefined);

      try {
        const response = await fetch('/api/interpret/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: data.message,
            sender_culture: data.sender_culture,
            receiver_culture: data.receiver_culture,
            mode: data.mode,
          }),
          signal: abortControllerRef.current.signal,
        });

        // Check for non-OK response (fall back to buffered)
        if (!response.ok) {
          log.warn('Streaming endpoint returned non-OK response', {
            status: response.status,
          });
          setStreamingText(''); // Clear partial state before fallback
          setIsStreaming(false);
          return await submitBuffered(data);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        // Read stream chunks
        while (true) {
          // Wrap reader.read() in try-catch for stream interruption handling
          let readResult: ReadableStreamReadResult<Uint8Array>;
          try {
            readResult = await reader.read();
          } catch (streamError) {
            // Stream interrupted (network error, connection closed)
            log.error('Stream interrupted', {
              error:
                streamError instanceof Error
                  ? streamError.message
                  : 'Unknown error',
            });
            setStreamingText(''); // Clear incomplete streaming text
            setIsStreaming(false);
            return await submitBuffered(data); // Fall back to buffered
          }

          const { done, value } = readResult;
          if (done) break;

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Split buffer on SSE delimiter (double newline)
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep incomplete data for next iteration

          // Process complete events
          for (const line of lines) {
            const eventData = parseSSELine(line);
            if (!eventData) continue;

            if (eventData.type === 'text') {
              setStreamingText((prev) => prev + eventData.text);
            }

            if (eventData.type === 'complete') {
              setIsStreaming(false);
              setStreamingText(''); // Clear streaming text when complete
              setResult(eventData.interpretation);
              setInterpretationId(eventData.interpretationId || null);
              setMessagesRemaining(eventData.metadata?.messages_remaining);
              setIsComplete(true);
            }

            if (eventData.type === 'error') {
              setIsStreaming(false);
              setStreamingText('');
              setError(eventData.error);
            }
          }
        }
      } catch (err) {
        // Handle AbortError gracefully (user cancelled or component unmounted)
        if (err instanceof Error && err.name === 'AbortError') {
          log.info('Streaming request was cancelled');
          return; // Don't show error or fall back
        }

        // Other errors: fall back to buffered response
        log.error('Streaming failed', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setStreamingText(''); // Clear partial state
        setIsStreaming(false);
        await submitBuffered(data);
      } finally {
        setIsLoading(false);
      }
    },
    [parseSSELine, submitBuffered]
  );

  return {
    streamingText,
    isStreaming,
    isLoading,
    isComplete,
    result,
    error,
    interpretationId,
    messagesRemaining,
    submit,
    reset,
  };
}
