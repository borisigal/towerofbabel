'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CultureSelector } from './CultureSelector';
import { ErrorMessage } from './ErrorMessage';
import { InterpretationResultsSkeleton } from './InterpretationResultsSkeleton';
import { StreamingResult } from './StreamingResult';
import { type CultureCode } from '@/lib/types/models';
import { type InboundInterpretationResponse, type OutboundInterpretationResponse } from '@/lib/llm/types';
import { type SSEEventData } from '@/lib/llm/streamTypes';
import { useUsageStore } from '@/lib/stores/usageStore';
import { useUpgradeModalStore } from '@/lib/stores/upgradeModalStore';
import { log } from '@/lib/observability/logger';

/**
 * Interpretation mode type.
 * - inbound: Analyze received messages (default)
 * - outbound: Optimize messages to send
 */
type InterpretationMode = 'inbound' | 'outbound';

/**
 * Form data structure for interpretation request.
 * Matches InterpretationRequest type from models.ts.
 */
interface InterpretationFormData {
  message: string;
  sender_culture: CultureCode | '';
  receiver_culture: CultureCode | '';
}

/**
 * Main interpretation form component for dashboard.
 *
 * Features:
 * - Mode toggle for inbound/outbound interpretation (Story 4.1)
 * - Large textarea for message input (max 2000 characters)
 * - Real-time character counter with warning state
 * - Two culture selector dropdowns (sender/receiver)
 * - Dynamic labels based on mode (inbound/outbound)
 * - Form validation (message length, culture selection)
 * - Loading state during submission
 * - Fully responsive design (mobile, tablet, desktop)
 * - WCAG 2.1 AA accessible (keyboard navigation, screen reader support)
 * - Integrated with /api/interpret endpoint (Story 2.3)
 * - Mode persistence via sessionStorage (Story 4.1)
 *
 * Story 2.1: UI created
 * Story 2.3: Integrated with API endpoint
 * Story 2.4: Added proper result display UI
 * Story 4.1: Added mode toggle (inbound/outbound)
 */
/**
 * State for a single tab (inbound or outbound)
 */
interface TabState {
  result: InboundInterpretationResponse | OutboundInterpretationResponse | null;
  error: { code: string; message: string } | null;
  isComplete: boolean;
  streamingText: string;
  isStreaming: boolean;
  interpretationId: string | null;
  originalMessage: string;
}

const initialTabState: TabState = {
  result: null,
  error: null,
  isComplete: false,
  streamingText: '',
  isStreaming: false,
  interpretationId: null,
  originalMessage: '',
};

export function InterpretationForm(): JSX.Element {
  const router = useRouter();
  const { incrementUsage } = useUsageStore();
  const { setOpen: setUpgradeModalOpen } = useUpgradeModalStore();
  const [isLoading, setIsLoading] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | undefined>(undefined);

  // Separate state for each tab
  const [inboundState, setInboundState] = useState<TabState>(initialTabState);
  const [outboundState, setOutboundState] = useState<TabState>(initialTabState);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount - cancel any in-flight streaming request
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Mode state with sessionStorage persistence (Story 4.1)
  const [mode, setMode] = useState<InterpretationMode>('inbound');

  // Get current tab state based on mode
  const currentState = mode === 'inbound' ? inboundState : outboundState;
  const setCurrentState = mode === 'inbound' ? setInboundState : setOutboundState;

  // Destructure current state for easier access
  const { result, error, isComplete, streamingText, isStreaming, interpretationId, originalMessage } = currentState;

  // Helper to update specific fields in current tab state
  const updateCurrentState = (updates: Partial<TabState>) => {
    setCurrentState(prev => ({ ...prev, ...updates }));
  };

  // Restore mode from sessionStorage on mount
  useEffect(() => {
    const storedMode = sessionStorage.getItem('interpretation-mode') as InterpretationMode | null;
    if (storedMode === 'inbound' || storedMode === 'outbound') {
      setMode(storedMode);
    }
  }, []);

  // Persist mode to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem('interpretation-mode', mode);
  }, [mode]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InterpretationFormData>({
    defaultValues: {
      message: '',
      sender_culture: '',
      receiver_culture: '',
    },
  });

  // Watch message for real-time character counter
  const message = watch('message') || '';
  const characterCount = message.length;
  const isOverLimit = characterCount > 2000;

  // Watch cultures for form validation
  const senderCulture = watch('sender_culture');
  const receiverCulture = watch('receiver_culture');

  // Form is valid when: message not empty, ≤2000 chars, both cultures selected
  const isFormValid =
    message.length > 0 &&
    message.length <= 2000 &&
    senderCulture !== '' &&
    receiverCulture !== '';

  // Dynamic labels based on mode (Story 4.1)
  const textareaPlaceholder = mode === 'inbound'
    ? 'Paste the message you want to interpret...'
    : 'Paste the message you want to send...';

  // Use consistent terminology for both modes
  const senderLabel = "Sender's Culture";
  const receiverLabel = "Receiver's Culture";

  const submitButtonLabel = mode === 'inbound'
    ? 'Interpret'
    : 'Optimize';

  const loadingButtonLabel = mode === 'inbound'
    ? 'Interpreting...'
    : 'Optimizing...';

  /**
   * Fallback to buffered /api/interpret endpoint.
   * Called when streaming fails or returns error.
   */
  const submitBuffered = async (data: InterpretationFormData): Promise<void> => {
    log.info('Falling back to buffered interpretation', { mode });

    try {
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.message,
          sender_culture: data.sender_culture,
          receiver_culture: data.receiver_culture,
          mode: mode,
        }),
      });

      const responseData = await response.json();

      // Check for 403 errors (limit exceeded or trial expired) - Story 3.3
      if (response.status === 403) {
        const errorCode = responseData.error?.code;
        if (errorCode === 'LIMIT_EXCEEDED' || errorCode === 'TRIAL_EXPIRED') {
          log.info('Usage limit reached, opening upgrade modal', { errorCode });
          setUpgradeModalOpen(true, 'limit_exceeded');
          updateCurrentState({
            error: {
              code: errorCode,
              message: responseData.error?.message || 'Usage limit reached. Please upgrade to continue.',
            },
          });
          return;
        }
      }

      if (responseData.success) {
        log.info('Buffered interpretation successful', {
          mode: mode,
          messagesRemaining: responseData.metadata?.messages_remaining,
        });

        updateCurrentState({
          result: responseData.data.interpretation,
          interpretationId: responseData.data.interpretationId,
          isComplete: true,
        });
        setMessagesRemaining(responseData.metadata?.messages_remaining);

        incrementUsage();
        router.refresh();

        // Scroll to results
        setTimeout(() => {
          const resultsElement = document.getElementById('interpretation-results');
          if (resultsElement) {
            resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        log.error('Buffered interpretation failed', { error: responseData.error });
        updateCurrentState({
          error: {
            code: responseData.error?.code || 'INTERNAL_ERROR',
            message: responseData.error?.message || 'Interpretation failed. Please try again.',
          },
        });
      }
    } catch (err) {
      log.error('Buffered request failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      updateCurrentState({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Network error. Please check your connection and try again.',
        },
      });
    } finally {
      setIsLoading(false);
      updateCurrentState({ isStreaming: false });
    }
  };

  /**
   * Parse SSE data from a line.
   * Handles the 'data: ' prefix and JSON parsing.
   */
  const parseSSELine = (line: string): SSEEventData | null => {
    if (!line.startsWith('data: ')) {
      return null;
    }

    try {
      return JSON.parse(line.slice(6)) as SSEEventData;
    } catch (err) {
      log.error('Failed to parse SSE event', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return null;
    }
  };

  /**
   * Cancel handler - aborts the current streaming request.
   */
  const handleCancel = (): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    updateCurrentState({
      isStreaming: false,
      streamingText: '',
      isComplete: false,
    });
    log.info('Interpretation cancelled by user', { mode });
  };

  /**
   * Form submission handler with streaming support (Story 6.1).
   * Calls /api/interpret/stream endpoint with SSE response.
   * Falls back to /api/interpret on streaming failure.
   */
  const onSubmit = async (data: InterpretationFormData): Promise<void> => {
    if (!isFormValid) return;

    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Clear previous results/errors and set initial streaming state
    setIsLoading(true);
    updateCurrentState({
      result: null,
      error: null,
      isStreaming: true,
      isComplete: false,
      streamingText: '',
      originalMessage: mode === 'outbound' ? data.message : '',
    });

    log.info('Submitting streaming interpretation request', {
      messageLength: data.message.length,
      sender_culture: data.sender_culture,
      receiver_culture: data.receiver_culture,
      mode: mode,
      streaming: true,
    });

    try {
      const response = await fetch('/api/interpret/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.message,
          sender_culture: data.sender_culture,
          receiver_culture: data.receiver_culture,
          mode: mode,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Check for non-OK response (fall back to buffered)
      if (!response.ok) {
        // Try to parse error response
        try {
          const errorData = await response.json();

          // Check for 403 errors (limit exceeded or trial expired)
          if (response.status === 403) {
            const errorCode = errorData.error?.code;
            if (errorCode === 'LIMIT_EXCEEDED' || errorCode === 'TRIAL_EXPIRED') {
              log.info('Usage limit reached, opening upgrade modal', { errorCode });
              setUpgradeModalOpen(true, 'limit_exceeded');
              updateCurrentState({
                error: {
                  code: errorCode,
                  message: errorData.error?.message || 'Usage limit reached. Please upgrade to continue.',
                },
                isStreaming: false,
              });
              setIsLoading(false);
              return;
            }
          }

          // Other errors - set error state
          updateCurrentState({
            error: {
              code: errorData.error?.code || 'STREAM_ERROR',
              message: errorData.error?.message || 'Streaming failed. Please try again.',
            },
            isStreaming: false,
          });
          setIsLoading(false);
          return;
        } catch {
          // Couldn't parse error, fall back to buffered
          log.warn('Streaming endpoint returned non-OK response', { status: response.status });
          updateCurrentState({ streamingText: '', isStreaming: false });
          return await submitBuffered(data);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Read stream chunks
      while (true) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch (streamError) {
          // Stream interrupted (network error, connection closed)
          log.error('Stream interrupted', {
            error: streamError instanceof Error ? streamError.message : 'Unknown error',
          });
          updateCurrentState({ streamingText: '', isStreaming: false });
          return await submitBuffered(data);
        }

        const { done, value } = readResult;
        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split buffer on SSE delimiter (double newline)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        // Process complete events
        for (const line of lines) {
          const eventData = parseSSELine(line);
          if (!eventData) continue;

          if (eventData.type === 'text') {
            setCurrentState(prev => ({ ...prev, streamingText: prev.streamingText + eventData.text }));
          }

          if (eventData.type === 'complete') {
            log.info('Streaming interpretation successful', {
              mode: mode,
              messagesRemaining: eventData.metadata?.messages_remaining,
              streaming: true,
            });

            updateCurrentState({
              isStreaming: false,
              streamingText: '',
              result: eventData.interpretation,
              interpretationId: eventData.interpretationId || null,
              isComplete: true,
            });
            setMessagesRemaining(eventData.metadata?.messages_remaining);

            incrementUsage();
            router.refresh();

            // Scroll to results
            setTimeout(() => {
              const resultsElement = document.getElementById('interpretation-results');
              if (resultsElement) {
                resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100);
          }

          if (eventData.type === 'error') {
            log.error('Streaming returned error event', { error: eventData.error });
            updateCurrentState({
              isStreaming: false,
              streamingText: '',
              error: eventData.error,
            });
          }
        }
      }
    } catch (err) {
      // Handle AbortError gracefully (user cancelled or component unmounted)
      if (err instanceof Error && err.name === 'AbortError') {
        log.info('Streaming request was cancelled');
        return;
      }

      // Other errors: fall back to buffered response
      log.error('Streaming failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      updateCurrentState({ streamingText: '', isStreaming: false });
      await submitBuffered(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
        {/* Mode Toggle - Story 4.1 */}
        <Tabs
          value={mode}
          onValueChange={(value) => {
            // Just switch mode - each tab maintains its own state
            setMode(value as InterpretationMode);
          }}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2 h-11" aria-label="Interpretation mode toggle">
            <TabsTrigger value="inbound" className="min-h-[44px]">
              Inbound
            </TabsTrigger>
            <TabsTrigger value="outbound" className="min-h-[44px]">
              Outbound
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <h2 className="text-2xl font-semibold mb-6 text-foreground">
          {mode === 'inbound' ? 'Interpret Message' : 'Optimize Message'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Message Textarea with Character Counter */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-base font-medium">
              Message to {mode === 'inbound' ? 'Interpret' : 'Optimize'}
            </Label>
            <Textarea
              id="message"
              placeholder={textareaPlaceholder}
              className="min-h-[150px] sm:min-h-[200px] resize-none"
              aria-label={`Message to ${mode === 'inbound' ? 'interpret' : 'optimize'}`}
              aria-describedby="character-counter"
              disabled={isLoading}
              {...register('message', {
                required: 'Message is required',
                maxLength: {
                  value: 2000,
                  message: 'Message must be 2000 characters or less',
                },
              })}
            />

            {/* Character Counter */}
            <div
              id="character-counter"
              aria-live="polite"
              className={`text-sm ${
                isOverLimit
                  ? 'text-destructive font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              {characterCount} / 2,000 characters
              {isOverLimit && ' - Message too long'}
            </div>

            {errors.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.message.message}
              </p>
            )}
          </div>

          {/* Culture Selectors - Stack on mobile, side-by-side on desktop */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="sender-culture" className="text-base font-medium">
                {senderLabel}
              </Label>
              <CultureSelector
                id="sender-culture"
                value={senderCulture as CultureCode}
                onChange={(value) => setValue('sender_culture', value)}
                disabled={isLoading}
                aria-label={senderLabel}
                placeholder={`Select ${mode === 'inbound' ? "sender's" : 'your'} culture`}
              />
              {errors.sender_culture && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.sender_culture.message}
                </p>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <Label
                htmlFor="receiver-culture"
                className="text-base font-medium"
              >
                {receiverLabel}
              </Label>
              <CultureSelector
                id="receiver-culture"
                value={receiverCulture as CultureCode}
                onChange={(value) => setValue('receiver_culture', value)}
                disabled={isLoading}
                aria-label={receiverLabel}
                placeholder="Select receiver's culture"
              />
              {errors.receiver_culture && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.receiver_culture.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!isLoading}
              className="w-full sm:w-auto min-h-[44px] px-6 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300 disabled:opacity-50 disabled:border-red-300 disabled:text-red-600 dark:disabled:border-red-700 dark:disabled:text-red-400"
              aria-label="Cancel interpretation"
            >
              Cancel
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="submit"
                      disabled={!isFormValid || isLoading}
                      className="w-full sm:w-auto min-h-[44px] px-6"
                      aria-live="polite"
                    >
                      {isLoading && <Spinner size="sm" className="mr-2" />}
                      {isLoading ? loadingButtonLabel : submitButtonLabel}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!isFormValid && !isLoading && (
                  <TooltipContent>
                    <p>
                      {isOverLimit
                        ? 'Message too long. Please shorten to 2,000 characters or less.'
                        : message.length === 0
                          ? 'Please enter a message to interpret.'
                          : !senderCulture || !receiverCulture
                            ? 'Please select both sender and receiver cultures.'
                            : 'Please complete all fields.'}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </form>
      </div>

      {/* Error Display - User-friendly error messages */}
      {error && (
        <ErrorMessage
          error={error}
          onRetry={() => {
            updateCurrentState({ error: null });
            handleSubmit(onSubmit)();
          }}
        />
      )}

      {/* Streaming Result - Shows progressive text while streaming (Story 6.1) */}
      {(isStreaming || isComplete) && (
        <StreamingResult
          streamingText={streamingText}
          isStreaming={isStreaming}
          isComplete={isComplete}
          result={result}
          mode={mode}
          originalMessage={originalMessage}
          messagesRemaining={messagesRemaining}
          interpretationId={interpretationId || undefined}
        />
      )}

      {/* Loading Skeleton - Only show when loading buffered (not streaming) */}
      {isLoading && !isStreaming && !result && (
        <div className="mt-6">
          <InterpretationResultsSkeleton />
        </div>
      )}
    </div>
  );
}
