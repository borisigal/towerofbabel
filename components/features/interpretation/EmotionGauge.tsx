'use client';

import React from 'react';
import { Emotion } from '@/lib/types/models';
import { Progress } from '@/components/ui/progress';
import { getIntensityLabel } from '@/lib/utils/emotionIntensity';

/**
 * Displays emotion intensity with contextual labels and visual progress bar.
 * Adapts display based on whether interpretation is same-culture or cross-culture.
 *
 * For same-culture interpretations:
 * - Shows single emotion score with intensity label
 * - Displays one progress bar
 *
 * For cross-culture interpretations:
 * - Shows dual scores (sender culture → receiver culture)
 * - Displays two progress bars for comparison
 *
 * WCAG 2.1 AA Compliant:
 * - Text labels always visible (not color-only)
 * - Numerical scores displayed
 * - Intensity labels provide context
 * - Progress bars include aria-labels
 *
 * @param emotion - Emotion data with sender/receiver scores and explanation
 * @param sameCulture - True if sender and receiver cultures are identical
 * @param index - Zero-based index for ranking display (0 = 1st, 1 = 2nd, etc.)
 *
 * @example
 * ```tsx
 * // Same culture
 * <EmotionGauge
 *   emotion={{ name: 'Gratitude', senderScore: 8, explanation: 'Strong gratitude' }}
 *   sameCulture={true}
 *   index={0}
 * />
 *
 * // Cross culture
 * <EmotionGauge
 *   emotion={{
 *     name: 'Directness',
 *     senderScore: 8,
 *     receiverScore: 3,
 *     explanation: 'Americans value direct communication more'
 *   }}
 *   sameCulture={false}
 *   index={0}
 * />
 * ```
 */
interface EmotionGaugeProps {
  emotion: Emotion;
  sameCulture: boolean;
  index: number;
}

/**
 * EmotionGauge component renders emotion intensity with adaptive display.
 */
export function EmotionGauge({
  emotion,
  sameCulture,
  index,
}: EmotionGaugeProps): JSX.Element {
  const senderIntensityLabel = getIntensityLabel(emotion.senderScore);
  const receiverIntensityLabel = emotion.receiverScore
    ? getIntensityLabel(emotion.receiverScore)
    : '';

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
      {/* Emotion Name with Rank */}
      <h3 className="font-semibold text-lg">
        {index + 1}. {emotion.name}
      </h3>

      {sameCulture ? (
        /* Same-culture: Single score + progress bar */
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Intensity:</span>
            <span className="font-semibold">
              {emotion.senderScore}/10{' '}
              <span className="text-muted-foreground">({senderIntensityLabel})</span>
            </span>
          </div>
          <Progress
            value={emotion.senderScore * 10}
            className="h-2"
            aria-label={`${emotion.name} intensity: ${emotion.senderScore} out of 10`}
          />
        </div>
      ) : (
        /* Cross-culture: Dual scores + two progress bars */
        <div className="space-y-3">
          {/* Sender Culture Score */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">In their culture:</span>
              <span className="font-semibold">
                {emotion.senderScore}/10{' '}
                <span className="text-muted-foreground">({senderIntensityLabel})</span>
              </span>
            </div>
            <Progress
              value={emotion.senderScore * 10}
              className="h-2"
              aria-label={`${emotion.name} in sender culture: ${emotion.senderScore} out of 10`}
            />
          </div>

          {/* Receiver Culture Score */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">In your culture:</span>
              <span className="font-semibold">
                {emotion.receiverScore}/10{' '}
                <span className="text-muted-foreground">({receiverIntensityLabel})</span>
              </span>
            </div>
            <Progress
              value={(emotion.receiverScore || 0) * 10}
              className="h-2"
              aria-label={`${emotion.name} in receiver culture: ${emotion.receiverScore} out of 10`}
            />
          </div>
        </div>
      )}

      {/* Explanation Text */}
      {emotion.explanation && (
        <p className="text-sm text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-700">
          {emotion.explanation}
        </p>
      )}
    </div>
  );
}
