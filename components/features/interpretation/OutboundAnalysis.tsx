'use client';

import React from 'react';
import { EmotionGauge } from './EmotionGauge';
import { type Emotion } from '@/lib/types/models';

interface OutboundAnalysisProps {
  originalAnalysis: string;
  suggestions: string[];
  emotions: Emotion[];
  sameCulture: boolean;
}

/**
 * Outbound Analysis Component
 *
 * Displays analysis section for outbound optimization results:
 * - How message will be perceived
 * - Suggestions for improvement
 * - Top 3 emotions detected
 *
 * Reuses EmotionGauge component from inbound interpretations.
 *
 * @param originalAnalysis - LLM's analysis of how message will be perceived
 * @param suggestions - List of improvement suggestions
 * @param emotions - Top 3 emotions detected in original message
 * @param sameCulture - Whether sender and receiver share the same culture
 *
 * @example
 * ```tsx
 * <OutboundAnalysis
 *   originalAnalysis="The receiver will perceive this message as..."
 *   suggestions={["Add more context", "Use softer tone", "Be more specific"]}
 *   emotions={[...]}
 *   sameCulture={false}
 * />
 * ```
 */
export function OutboundAnalysis({
  originalAnalysis,
  suggestions,
  emotions,
  sameCulture,
}: OutboundAnalysisProps): JSX.Element {
  return (
    <article className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 p-4 sm:p-6 space-y-6">
      {/* How It Will Be Perceived Section */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-3 text-foreground flex items-center gap-2">
          🔍 How It Will Be Perceived
        </h2>
        <p className="text-base sm:text-lg leading-relaxed text-foreground/90">
          {originalAnalysis}
        </p>
      </section>

      {/* Suggestions Section */}
      <section>
        <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
          💡 Suggestions
        </h3>
        <ul className="space-y-2 text-foreground/80 list-disc list-inside">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="text-base leading-relaxed">
              {suggestion}
            </li>
          ))}
        </ul>
      </section>

      {/* Top 3 Emotions Section */}
      <section>
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          😊 Top 3 Emotions Detected
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {emotions.slice(0, 3).map((emotion, index) => (
            <EmotionGauge
              key={index}
              emotion={emotion}
              sameCulture={sameCulture}
              index={index}
            />
          ))}
        </div>
      </section>
    </article>
  );
}
