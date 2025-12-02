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
    ? 'Interpret Message'
    : 'Optimize Message';

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
    <div className="w-full mx-auto py-4">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8">
        {/* Header with Title and Mode Toggle - Story 4.1 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h2 className="text-2xl font-semibold text-white">
            Interpret Message
          </h2>
          <div className="flex gap-2">
            {(['inbound', 'outbound'] as const).map((tabMode) => {
              const isActive = mode === tabMode;
              const label = tabMode === 'inbound' ? 'Interpret Message' : 'Optimize Message';
              const baseStyles = 'px-6 py-2.5 rounded-lg font-medium transition-all min-h-[44px]';
              const activeStyles = 'bg-blue-500 text-white';
              const inactiveStyles = 'bg-transparent border border-white/30 text-white/70 hover:border-white/50 hover:text-white';

              return (
                <button
                  key={tabMode}
                  type="button"
                  onClick={() => setMode(tabMode)}
                  className={`${baseStyles} ${isActive ? activeStyles : inactiveStyles}`}
                  aria-pressed={isActive}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Message Textarea with Character Counter */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-base font-semibold text-white">
              Input Message
            </Label>
            <div className="relative">
              <Textarea
                id="message"
                placeholder={textareaPlaceholder}
                className="min-h-[300px] sm:min-h-[360px] resize-none bg-transparent border border-blue-500/50 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 text-white placeholder:text-white/40 pr-16"
                style={{ textIndent: !message ? '28px' : '0' }}
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
              {/* Sparkle/Edit icon - positioned at start of placeholder, vertically centered with first line */}
              {!message && (
                <div className="absolute top-[11px] left-3 pointer-events-none flex items-center">
                  <svg width="19" height="20" viewBox="0 0 19 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2.83125 11.39L2.89125 11.27C3.14125 10.785 3.53625 10.39 4.02125 10.14L4.14125 10.08C4.61625 9.84 4.61625 9.16 4.14125 8.915L4.02125 8.855C3.53625 8.605 3.14125 8.21 2.89125 7.725L2.83125 7.605C2.59125 7.13 1.91125 7.13 1.66625 7.605L1.60625 7.725C1.35625 8.21 0.96125 8.605 0.47625 8.855L0.35625 8.915C-0.11875 9.155 -0.11875 9.835 0.35625 10.08L0.47625 10.14C0.96125 10.39 1.35625 10.785 1.60625 11.27L1.66625 11.39C1.90625 11.865 2.58625 11.865 2.83125 11.39Z" fill="#BB9DF6"/>
                    <path d="M17.1462 15.415L17.0262 15.355C16.5412 15.105 16.1462 14.71 15.8962 14.225L15.8362 14.105C15.5962 13.63 14.9162 13.63 14.6712 14.105L14.6112 14.225C14.3612 14.71 13.9662 15.105 13.4812 15.355L13.3612 15.415C12.8862 15.655 12.8862 16.335 13.3612 16.58L13.4812 16.64C13.9662 16.89 14.3612 17.285 14.6112 17.77L14.6712 17.89C14.9112 18.365 15.5912 18.365 15.8362 17.89L15.8962 17.77C16.1462 17.285 16.5412 16.89 17.0262 16.64L17.1462 16.58C17.6212 16.34 17.6212 15.66 17.1462 15.415Z" fill="#BB9DF6"/>
                    <path d="M3.21125 5.135L3.37125 5.215C3.87125 5.47 4.27125 5.87 4.52625 6.37L4.60625 6.53C4.88125 7.07 5.43125 7.405 6.03625 7.405C6.64125 7.405 7.19125 7.07 7.47125 6.53L7.55125 6.37C7.80625 5.87 8.20625 5.47 8.70625 5.215L8.86625 5.135C9.40625 4.86 9.74125 4.31 9.74125 3.705C9.74125 3.1 9.40625 2.55 8.86625 2.27L8.70625 2.19C8.20625 1.935 7.80625 1.535 7.55125 1.035L7.47125 0.875C7.19625 0.335 6.64625 0 6.03625 0C5.42625 0 4.88125 0.335 4.60125 0.875L4.52125 1.035C4.26625 1.535 3.86625 1.935 3.36625 2.19L3.20625 2.27C2.66625 2.545 2.33125 3.095 2.33125 3.705C2.33125 4.315 2.66625 4.86 3.20625 5.14L3.21125 5.135ZM3.89125 3.605L4.05125 3.525C4.83625 3.125 5.46125 2.5 5.86125 1.715L5.94125 1.555C5.94125 1.555 5.97125 1.495 6.03625 1.495C6.10125 1.495 6.12625 1.535 6.13125 1.555L6.21125 1.715C6.61125 2.5 7.23625 3.125 8.02125 3.525L8.18125 3.605C8.18125 3.605 8.24125 3.635 8.24125 3.7C8.24125 3.765 8.19625 3.79 8.18125 3.795L8.02125 3.875C7.23625 4.275 6.61125 4.9 6.21125 5.685L6.13125 5.845C6.13125 5.845 6.10125 5.905 6.03625 5.905C5.97125 5.905 5.94625 5.86 5.94125 5.845L5.86125 5.685C5.46125 4.9 4.83625 4.275 4.05125 3.875L3.89125 3.795C3.89125 3.795 3.83125 3.765 3.83125 3.7C3.83125 3.635 3.87625 3.61 3.89125 3.605Z" fill="#BB9DF6"/>
                    <path d="M18.1462 4.07L17.1762 3.1C16.7862 2.71 16.2663 2.495 15.7163 2.495C15.1663 2.495 14.6462 2.71 14.2562 3.1L3.87125 13.485C3.87125 13.485 3.86125 13.5 3.85625 13.51C3.79625 13.575 3.74625 13.645 3.71125 13.725V13.735L2.26625 17.18C2.04125 17.715 2.16625 18.325 2.58125 18.735C2.85125 19 3.20625 19.14 3.57125 19.14C3.76125 19.14 3.95625 19.1 4.14125 19.02L7.51625 17.54L7.53625 17.53C7.61625 17.495 7.68125 17.445 7.74125 17.39C7.74625 17.385 7.75625 17.38 7.76625 17.375L18.1512 6.99C18.5412 6.6 18.7562 6.08 18.7562 5.53C18.7562 4.98 18.5412 4.46 18.1512 4.07H18.1462ZM7.23125 15.785L5.46125 14.015L13.2413 6.235L15.0113 8.005L7.23125 15.785ZM17.0862 5.93L16.0712 6.945L14.3012 5.175L15.3163 4.16C15.5263 3.945 15.9012 3.945 16.1162 4.16L17.0862 5.13C17.1912 5.235 17.2512 5.38 17.2512 5.53C17.2512 5.68 17.1912 5.82 17.0862 5.93Z" fill="#BB9DF6"/>
                  </svg>
                </div>
              )}
              {/* Character Counter - positioned bottom right inside textarea */}
              <div
                id="character-counter"
                aria-live="polite"
                className={`absolute bottom-3 right-3 text-sm ${
                  isOverLimit
                    ? 'text-red-400 font-semibold'
                    : 'text-white/40'
                }`}
              >
                {characterCount}/2000
              </div>
            </div>

            {errors.message && (
              <p className="text-sm text-red-400" role="alert">
                {errors.message.message}
              </p>
            )}
          </div>

          {/* Culture Selectors - Stack on mobile, side-by-side on desktop */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <Label htmlFor="sender-culture" className="text-base font-semibold text-white">
                {senderLabel}
              </Label>
              <CultureSelector
                id="sender-culture"
                value={senderCulture as CultureCode}
                onChange={(value) => setValue('sender_culture', value)}
                disabled={isLoading}
                aria-label={senderLabel}
                placeholder="Country /Culture"
              />
              {errors.sender_culture && (
                <p className="text-sm text-red-400" role="alert">
                  {errors.sender_culture.message}
                </p>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <Label
                htmlFor="receiver-culture"
                className="text-base font-semibold text-white"
              >
                Receiver's Culture
              </Label>
              <CultureSelector
                id="receiver-culture"
                value={receiverCulture as CultureCode}
                onChange={(value) => setValue('receiver_culture', value)}
                disabled={isLoading}
                aria-label={receiverLabel}
                placeholder="Country /Culture"
              />
              {errors.receiver_culture && (
                <p className="text-sm text-red-400" role="alert">
                  {errors.receiver_culture.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button - Full width purple gradient */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="w-full min-h-[48px] bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Hidden Cancel Button - only visible during loading */}
          {isLoading && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full min-h-[44px] border-white/20 text-white/70 hover:bg-white/5 hover:text-white"
              aria-label="Cancel interpretation"
            >
              Cancel
            </Button>
          )}
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
