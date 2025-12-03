'use client';

import React from 'react';
import { EmotionGauge } from './EmotionGauge';
import { type Emotion, type CultureCode } from '@/lib/types/models';

interface OutboundAnalysisProps {
  originalAnalysis: string;
  suggestions: string[];
  emotions: Emotion[];
  sameCulture: boolean;
  senderCulture?: CultureCode;
  receiverCulture?: CultureCode;
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
  senderCulture,
  receiverCulture,
}: OutboundAnalysisProps): JSX.Element {
  return (
    <article className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 sm:p-6 space-y-6">
      {/* How It Will Be Perceived Section */}
      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-3 text-white flex items-center gap-2">
          How It Will Be Perceived
        </h2>
        <p className="text-base sm:text-lg leading-relaxed text-white/90">
          {originalAnalysis}
        </p>
      </section>

      {/* Suggestions Section */}
      {suggestions && suggestions.length > 0 && (
        <section>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-white flex items-center gap-2">
            Suggestion
          </h3>
          <ul className="space-y-2 text-white/80 list-disc list-inside">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-base leading-relaxed">
                {suggestion}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Emotion Gauge Section */}
      <section>
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-white flex items-center gap-2">
          Emotion Gauge
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {emotions.slice(0, 4).map((emotion, index) => (
            <EmotionGauge
              key={index}
              emotion={emotion}
              sameCulture={sameCulture}
              index={index}
              senderCulture={senderCulture}
              receiverCulture={receiverCulture}
            />
          ))}
        </div>
      </section>
    </article>
  );
}
