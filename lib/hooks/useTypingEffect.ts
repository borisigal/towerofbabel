'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Configuration options for the typing effect.
 */
interface UseTypingEffectOptions {
  /** Characters to reveal per tick (default: 3) */
  charsPerTick?: number;
  /** Milliseconds between ticks (default: 16 ~60fps) */
  tickInterval?: number;
  /** Whether to enable the effect (default: true) */
  enabled?: boolean;
}

/**
 * Hook that creates a typing effect for streaming text.
 * Reveals text character-by-character at a configurable speed.
 *
 * The effect catches up quickly to the target text, creating a smooth
 * typing animation similar to ChatGPT/Claude web interfaces.
 *
 * @param targetText - The full text to type out
 * @param options - Configuration options
 * @returns Object with displayedText and isTyping status
 *
 * @example
 * ```tsx
 * const { displayedText, isTyping } = useTypingEffect(streamingText, {
 *   charsPerTick: 3,
 *   tickInterval: 16,
 * });
 * return <p>{displayedText}{isTyping && <Cursor />}</p>;
 * ```
 */
export function useTypingEffect(
  targetText: string,
  options: UseTypingEffectOptions = {}
): { displayedText: string; isTyping: boolean } {
  const { charsPerTick = 3, tickInterval = 16, enabled = true } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const currentIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(targetText);
      setIsTyping(false);
      return;
    }

    // If target text is shorter than current (reset case), snap to it
    if (targetText.length < currentIndexRef.current) {
      currentIndexRef.current = 0;
      setDisplayedText('');
    }

    // Nothing to type
    if (!targetText || targetText.length === 0) {
      currentIndexRef.current = 0;
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    // Already fully displayed
    if (currentIndexRef.current >= targetText.length) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);

    const animate = (timestamp: number): void => {
      // Throttle based on tickInterval
      if (timestamp - lastTickRef.current < tickInterval) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTickRef.current = timestamp;

      // Calculate how many chars to add this tick
      // Add extra chars if we're falling behind (catch-up mechanism)
      const behindBy = targetText.length - currentIndexRef.current;
      const catchUpMultiplier = Math.min(Math.ceil(behindBy / 50), 5);
      const charsToAdd = charsPerTick * catchUpMultiplier;

      const newIndex = Math.min(currentIndexRef.current + charsToAdd, targetText.length);
      currentIndexRef.current = newIndex;

      setDisplayedText(targetText.slice(0, newIndex));

      if (newIndex < targetText.length) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsTyping(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetText, charsPerTick, tickInterval, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return { displayedText, isTyping };
}

/**
 * Hook for typing effect on a field that may still be streaming.
 * Handles the case where content is being progressively added.
 *
 * @param content - The content to display (may still be growing)
 * @param isFieldComplete - Whether the field is done receiving content
 * @param isStreaming - Whether the overall stream is still active
 * @param options - Typing effect options
 */
export function useStreamingTypingEffect(
  content: string | undefined,
  isFieldComplete: boolean,
  isStreaming: boolean,
  options: UseTypingEffectOptions = {}
): { displayedText: string; isTyping: boolean; showCursor: boolean } {
  const { displayedText, isTyping } = useTypingEffect(content || '', {
    ...options,
    enabled: !!content,
  });

  // Show cursor when:
  // 1. Still typing out the current content, OR
  // 2. Field is complete but streaming is still happening (next field being generated)
  const showCursor = isTyping || (isFieldComplete && isStreaming);

  return { displayedText, isTyping, showCursor };
}
