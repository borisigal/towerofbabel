'use client';

import React from 'react';
import { Emotion } from '@/lib/types/models';
import { type CultureCode } from '@/lib/types/models';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Import flag SVGs
import AmericanFlag from '@/assets/flags/american.svg';
import BritishFlag from '@/assets/flags/british.svg';
import GermanFlag from '@/assets/flags/german.svg';
import FrenchFlag from '@/assets/flags/french.svg';
import JapaneseFlag from '@/assets/flags/japanese.svg';
import ChineseFlag from '@/assets/flags/chinese.svg';
import IndianFlag from '@/assets/flags/indian.svg';
import SpanishFlag from '@/assets/flags/spanish.svg';
import ItalianFlag from '@/assets/flags/italian.svg';
import DutchFlag from '@/assets/flags/dutch.svg';
import KoreanFlag from '@/assets/flags/korean.svg';
import BrazilianFlag from '@/assets/flags/brazilian.svg';
import MexicanFlag from '@/assets/flags/mexican.svg';
import AustralianFlag from '@/assets/flags/australian.svg';
import CanadianFlag from '@/assets/flags/canadian.svg';
import RussianFlag from '@/assets/flags/russian.svg';
import UkrainianFlag from '@/assets/flags/ukrainian.svg';

/**
 * Map culture codes to their corresponding flag SVG components.
 */
const CULTURE_FLAGS: Record<CultureCode, React.FC<React.SVGProps<SVGSVGElement>>> = {
  american: AmericanFlag,
  british: BritishFlag,
  german: GermanFlag,
  french: FrenchFlag,
  japanese: JapaneseFlag,
  chinese: ChineseFlag,
  indian: IndianFlag,
  spanish: SpanishFlag,
  italian: ItalianFlag,
  dutch: DutchFlag,
  korean: KoreanFlag,
  brazilian: BrazilianFlag,
  mexican: MexicanFlag,
  australian: AustralianFlag,
  canadian: CanadianFlag,
  russian: RussianFlag,
  ukrainian: UkrainianFlag,
};

/**
 * Flag icon component that renders the appropriate culture flag.
 */
function FlagIcon({ cultureCode }: { cultureCode?: CultureCode }): JSX.Element {
  if (!cultureCode || !CULTURE_FLAGS[cultureCode]) {
    // Fallback: colored square indicator
    return (
      <span className="inline-flex items-center justify-center w-6 h-4 rounded-sm bg-white/20" />
    );
  }

  const FlagComponent = CULTURE_FLAGS[cultureCode];
  return (
    <span className="inline-flex items-center justify-center w-6 h-4 overflow-hidden rounded-sm">
      <FlagComponent className="w-full h-full" aria-hidden="true" />
    </span>
  );
}

/**
 * Custom progress bar component with configurable color.
 */
function ProgressBar({
  value,
  color = 'blue',
  ariaLabel
}: {
  value: number;
  color?: 'blue' | 'purple';
  ariaLabel: string;
}): JSX.Element {
  const percentage = Math.min(Math.max(value * 10, 0), 100);
  const colorClass = color === 'blue'
    ? 'bg-blue-500'
    : 'bg-purple-500';

  return (
    <div
      className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-label={ariaLabel}
    >
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface EmotionGaugeProps {
  emotion: Emotion;
  sameCulture: boolean;
  index: number;
  senderCulture?: CultureCode;
  receiverCulture?: CultureCode;
}

/**
 * EmotionGauge component displays emotion intensity with visual progress bars.
 *
 * Features:
 * - Dual progress bars for cross-culture comparison (blue for sender, purple for receiver)
 * - Flag icons for each culture (when culture codes provided)
 * - Tooltip with explanation on hover
 * - Clean, minimal design matching the dashboard aesthetic
 */
export function EmotionGauge({
  emotion,
  sameCulture,
  senderCulture,
  receiverCulture,
}: EmotionGaugeProps): JSX.Element {
  const content = (
    <div className="space-y-3">
      {/* Emotion Name */}
      <h4 className="font-semibold text-white text-base">
        {emotion.name}
      </h4>

      {/* Score Rows */}
      <div className="space-y-2">
        {/* Sender Culture Row */}
        <div className="flex items-center gap-3">
          <FlagIcon cultureCode={senderCulture} />
          <ProgressBar
            value={emotion.senderScore}
            color="blue"
            ariaLabel={`${emotion.name} sender score: ${emotion.senderScore} out of 10`}
          />
          <span className="text-white/70 text-sm min-w-[40px] text-right">
            {emotion.senderScore}/10
          </span>
        </div>

        {/* Receiver Culture Row (only for cross-culture) */}
        {!sameCulture && emotion.receiverScore !== undefined && (
          <div className="flex items-center gap-3">
            <FlagIcon cultureCode={receiverCulture} />
            <ProgressBar
              value={emotion.receiverScore}
              color="purple"
              ariaLabel={`${emotion.name} receiver score: ${emotion.receiverScore} out of 10`}
            />
            <span className="text-white/70 text-sm min-w-[40px] text-right">
              {emotion.receiverScore}/10
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // If there's an explanation, wrap in tooltip
  if (emotion.explanation) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {content}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs bg-slate-800 text-white text-sm p-3 rounded-lg shadow-lg border border-white/10"
          >
            <p>{emotion.explanation}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
