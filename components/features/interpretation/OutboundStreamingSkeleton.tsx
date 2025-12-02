'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { EmotionGauge } from './EmotionGauge';
import { type PartialOutboundResult } from '@/lib/hooks/useProgressiveJsonParser';
import { useTypingEffect } from '@/lib/hooks/useTypingEffect';
import { type Emotion } from '@/lib/types/models';

/** Typing speed: chars per tick */
const TYPING_SPEED = 1;
/** Tick interval in ms (~83 chars/sec) */
const TICK_INTERVAL = 12;

interface OutboundStreamingSkeletonProps {
  /** Partially parsed result from streaming JSON */
  partialResult: PartialOutboundResult;
  /** Whether actively receiving stream chunks */
  isStreaming: boolean;
}

/**
 * Typing cursor component for streaming text fields.
 */
function TypingCursor({ show }: { show: boolean }): JSX.Element | null {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent): void => {
        setPrefersReducedMotion(e.matches);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } catch {
      return;
    }
  }, []);

  if (!show) return null;

  return prefersReducedMotion ? (
    <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 align-middle" />
  ) : (
    <span className="animate-pulse inline-block w-0.5 h-5 bg-primary ml-0.5 align-middle" />
  );
}

/**
 * Text field with typing animation effect.
 */
function TypedText({
  content,
  showCursor,
  className,
}: {
  content: string;
  showCursor: boolean;
  className?: string;
}): JSX.Element {
  const { displayedText, isTyping } = useTypingEffect(content, {
    charsPerTick: TYPING_SPEED,
    tickInterval: TICK_INTERVAL,
  });

  return (
    <span className={className}>
      {displayedText}
      <TypingCursor show={showCursor || isTyping} />
    </span>
  );
}

/**
 * List item with typing animation effect.
 */
function TypedListItem({
  content,
  showCursor,
}: {
  content: string;
  showCursor: boolean;
}): JSX.Element {
  const { displayedText, isTyping } = useTypingEffect(content, {
    charsPerTick: TYPING_SPEED,
    tickInterval: TICK_INTERVAL,
  });

  return (
    <li className="text-base leading-relaxed">
      {displayedText}
      <TypingCursor show={showCursor || isTyping} />
    </li>
  );
}

/**
 * Skeleton for emotion gauge during streaming.
 */
function EmotionGaugeSkeleton({ index }: { index: number }): JSX.Element {
  return (
    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg text-muted-foreground">{index + 1}.</span>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>
      <Skeleton className="h-12 w-full mt-2" />
    </div>
  );
}

/**
 * Outbound Streaming Skeleton Component
 *
 * Shows the outbound optimization result template with progressive content fill-in
 * during streaming. Sections display their content as soon as they're
 * parsed from the streaming JSON.
 *
 * Layout matches OutboundResult:
 * - Message Comparison (original always shown, optimized when available)
 * - Analysis Section (originalAnalysis, suggestions, emotions)
 */
export function OutboundStreamingSkeleton({
  partialResult,
  isStreaming,
}: OutboundStreamingSkeletonProps): JSX.Element {
  const { originalAnalysis, suggestions, optimizedMessage, emotions } = partialResult;

  // Track which sections are complete
  const originalAnalysisComplete = originalAnalysis !== undefined;
  const suggestionsComplete = suggestions !== undefined && suggestions.length > 0;
  const optimizedMessageComplete = optimizedMessage !== undefined;
  const emotionsComplete = emotions !== undefined && emotions.length > 0;

  // Determine if same culture based on emotions (if available)
  const sameCulture = emotions && emotions.length > 0 && emotions[0]?.receiverScore === undefined;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="space-y-6" aria-busy={isStreaming} aria-live="polite">
        {/* Optimized Message Section */}
        <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
          role="region"
          aria-label="Optimized message"
        >
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            Culturally Optimized Version
          </h3>
          <div className="max-h-[300px] overflow-y-auto">
            {optimizedMessageComplete ? (
              <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                <TypedText
                  content={optimizedMessage}
                  showCursor={isStreaming && !emotionsComplete}
                />
              </p>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                {isStreaming && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mt-3">
                    <Spinner size="sm" />
                    <span>Optimizing message...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Section */}
        <article className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 sm:p-6 space-y-6">
          {/* How It Will Be Perceived Section */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 text-foreground flex items-center gap-2">
              How It Will Be Perceived
            </h2>
            {originalAnalysisComplete ? (
              <p className="text-base sm:text-lg leading-relaxed text-foreground/90">
                <TypedText
                  content={originalAnalysis}
                  showCursor={isStreaming && !suggestionsComplete}
                />
              </p>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                {isStreaming && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
                    <Spinner size="sm" />
                    <span>Analyzing perception...</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Suggestions Section */}
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
              Suggestions
            </h3>
            {suggestionsComplete ? (
              <ul className="space-y-2 text-foreground/80 list-disc list-inside">
                {(suggestions as string[]).map((suggestion, index) => (
                  <TypedListItem
                    key={index}
                    content={suggestion}
                    showCursor={
                      index === suggestions.length - 1 &&
                      isStreaming &&
                      !optimizedMessageComplete
                    }
                  />
                ))}
              </ul>
            ) : originalAnalysisComplete ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">*</span>
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">*</span>
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">*</span>
                  <Skeleton className="h-4 w-4/5" />
                </div>
                {isStreaming && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
                    <Spinner size="sm" />
                    <span>Generating suggestions...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">*</span>
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">*</span>
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">*</span>
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            )}
          </section>

          {/* Top 3 Emotions Section */}
          <section>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              Top 3 Emotions Detected
            </h3>
            {emotionsComplete ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(emotions as Emotion[]).slice(0, 3).map((emotion, index) => (
                  <EmotionGauge
                    key={index}
                    emotion={emotion}
                    sameCulture={sameCulture ?? true}
                    index={index}
                  />
                ))}
              </div>
            ) : optimizedMessageComplete ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                  <EmotionGaugeSkeleton key={index} index={index} />
                ))}
                {isStreaming && (
                  <div className="col-span-full flex items-center gap-2 text-muted-foreground text-sm mt-2">
                    <Spinner size="sm" />
                    <span>Detecting emotions...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                  <EmotionGaugeSkeleton key={index} index={index} />
                ))}
              </div>
            )}
          </section>
        </article>

        {/* Streaming Status Footer */}
        {isStreaming && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Spinner size="sm" />
            <span>Generating optimization...</span>
          </div>
        )}
      </div>
    </div>
  );
}
