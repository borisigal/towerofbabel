'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { EmotionGauge } from './EmotionGauge';
import { type PartialInboundResult } from '@/lib/hooks/useProgressiveJsonParser';
import { useTypingEffect } from '@/lib/hooks/useTypingEffect';
import { type Emotion } from '@/lib/types/models';

/** Typing speed: chars per tick */
const TYPING_SPEED = 1;
/** Tick interval in ms (~83 chars/sec) */
const TICK_INTERVAL = 12;

interface InboundStreamingSkeletonProps {
  /** Partially parsed result from streaming JSON */
  partialResult: PartialInboundResult;
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
 * Inbound Streaming Skeleton Component
 *
 * Shows the interpretation result template with progressive content fill-in
 * during streaming. Sections display their content as soon as they're
 * parsed from the streaming JSON.
 *
 * Layout matches InterpretationResult:
 * - The Bottom Line (skeleton or content)
 * - Cultural Context (skeleton or content)
 * - Top 3 Emotions (skeleton or content)
 */
export function InboundStreamingSkeleton({
  partialResult,
  isStreaming,
}: InboundStreamingSkeletonProps): JSX.Element {
  const { bottomLine, culturalContext, emotions } = partialResult;

  // Determine which section is currently being streamed
  const bottomLineComplete = bottomLine !== undefined;
  const culturalContextComplete = culturalContext !== undefined;
  const emotionsComplete = emotions !== undefined && emotions.length > 0;

  // Determine if same culture based on emotions (if available)
  const sameCulture = emotions && emotions.length > 0 && emotions[0]?.receiverScore === undefined;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <article
        className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 sm:p-6 space-y-6"
        aria-busy={isStreaming}
        aria-live="polite"
      >
        {/* The Bottom Line Section */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold mb-3 text-foreground flex items-center gap-2">
            The Bottom Line
          </h2>
          {bottomLineComplete ? (
            <p className="text-base sm:text-lg leading-relaxed text-foreground/90">
              <TypedText
                content={bottomLine}
                showCursor={isStreaming && !culturalContextComplete}
              />
            </p>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              {isStreaming && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
                  <Spinner size="sm" />
                  <span>Analyzing message...</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Cultural Context Section */}
        <section>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
            Cultural Context
          </h3>
          {culturalContextComplete ? (
            <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
                <TypedText
                  content={culturalContext}
                  showCursor={isStreaming && !emotionsComplete}
                />
              </p>
            </div>
          ) : bottomLineComplete ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              {isStreaming && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
                  <Spinner size="sm" />
                  <span>Examining cultural nuances...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
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
          ) : culturalContextComplete ? (
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

        {/* Streaming Status Footer */}
        {isStreaming && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm pt-4 border-t border-white/10">
            <Spinner size="sm" />
            <span>Generating interpretation...</span>
          </div>
        )}
      </article>
    </div>
  );
}
