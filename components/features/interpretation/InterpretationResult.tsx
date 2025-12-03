'use client';

import React from 'react';
import { type InterpretationResult as InterpretationResultType, type CultureCode } from '@/lib/types/models';
import { EmotionGauge } from './EmotionGauge';
import { FeedbackButtons } from './FeedbackButtons';

interface InterpretationResultProps {
  result: InterpretationResultType;
  messagesRemaining?: number;
  interpretationId?: string;
  senderCulture?: CultureCode;
  receiverCulture?: CultureCode;
}

/**
 * Interpretation Result Display Component
 *
 * Displays interpretation results following front-end-spec.md design:
 * - 🎯 The Bottom Line (clear explanation in simple language)
 * - 🔍 Cultural Context (insights about communication style and subtext)
 * - 😊 Top 3 Emotions Detected (with adaptive emotion gauges)
 *
 * Features:
 * - Clean, structured layout with emoji section icons
 * - EmotionGauge components with WCAG 2.1 AA compliance
 * - Adaptive display (same-culture vs cross-culture)
 * - Responsive design (mobile/tablet/desktop)
 * - Light tint background for visual separation
 * - Semantic HTML for accessibility
 */
export function InterpretationResult({
  result,
  messagesRemaining,
  interpretationId,
  senderCulture,
  receiverCulture,
}: InterpretationResultProps): JSX.Element {
  const { bottomLine, culturalContext, emotions } = result;

  // Determine if this is same-culture interpretation
  // If any emotion has receiverScore, it's cross-culture
  const sameCulture = emotions.length > 0 && emotions[0]?.receiverScore === undefined;

  return (
    <div className="w-full mx-auto py-4">
      <article className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 sm:p-6 space-y-6">
        {/* The Bottom Line Section */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold mb-3 text-white flex items-center gap-2">
            The Bottom Line
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-white/90">
            {bottomLine}
          </p>
        </section>

        {/* Cultural Context Section */}
        <section>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-white flex items-center gap-2">
            Cultural Context
          </h3>
          <div className="prose prose-sm sm:prose max-w-none prose-invert">
            <p className="text-white/80 leading-relaxed whitespace-pre-line">
              {culturalContext}
            </p>
          </div>
        </section>

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

        {/* Feedback Buttons Section */}
        {interpretationId && (
          <section className="border-t border-white/10 pt-4">
            <FeedbackButtons interpretationId={interpretationId} />
          </section>
        )}

        {/* Messages Remaining Display */}
        {messagesRemaining !== undefined && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-sm text-white/60 text-center">
              {messagesRemaining} messages remaining
            </p>
          </div>
        )}
      </article>
    </div>
  );
}
