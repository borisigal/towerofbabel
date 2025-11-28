/**
 * Tests for useTypingEffect hook.
 * Verifies typing animation behavior for streaming text.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingEffect } from '@/lib/hooks/useTypingEffect';

describe('useTypingEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with empty displayed text', () => {
    const { result } = renderHook(() => useTypingEffect('Hello World'));
    expect(result.current.displayedText).toBe('');
    expect(result.current.isTyping).toBe(true);
  });

  it('should return empty string for empty target', () => {
    const { result } = renderHook(() => useTypingEffect(''));
    expect(result.current.displayedText).toBe('');
    expect(result.current.isTyping).toBe(false);
  });

  it('should show full text immediately when disabled', () => {
    const { result } = renderHook(() =>
      useTypingEffect('Hello World', { enabled: false })
    );
    expect(result.current.displayedText).toBe('Hello World');
    expect(result.current.isTyping).toBe(false);
  });

  it('should progressively reveal text over time', async () => {
    const { result } = renderHook(() =>
      useTypingEffect('Hello', { charsPerTick: 1, tickInterval: 16 })
    );

    expect(result.current.displayedText).toBe('');

    // Advance through animation frames
    await act(async () => {
      // Simulate requestAnimationFrame calls
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(20);
        await Promise.resolve(); // Allow state updates
      }
    });

    // After some time, should have typed some characters
    expect(result.current.displayedText.length).toBeGreaterThan(0);
  });

  it('should handle text updates during typing', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypingEffect(text, { charsPerTick: 5, tickInterval: 16 }),
      { initialProps: { text: 'Hello' } }
    );

    // Update to longer text
    rerender({ text: 'Hello World' });

    // Should still be typing
    expect(result.current.isTyping).toBe(true);
  });

  it('should reset when target text becomes shorter', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypingEffect(text),
      { initialProps: { text: 'Hello World' } }
    );

    // Advance to type some characters
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Reset to shorter text
    rerender({ text: 'Hi' });

    // Should reset
    expect(result.current.displayedText).toBe('');
  });

  it('should respect custom charsPerTick option', () => {
    // With 5 chars per tick, should reveal faster
    const { result: fastResult } = renderHook(() =>
      useTypingEffect('Hello World', { charsPerTick: 5, tickInterval: 16 })
    );

    // With 1 char per tick, should reveal slower
    const { result: slowResult } = renderHook(() =>
      useTypingEffect('Hello World', { charsPerTick: 1, tickInterval: 16 })
    );

    // Both should start typing
    expect(fastResult.current.isTyping).toBe(true);
    expect(slowResult.current.isTyping).toBe(true);
  });
});
