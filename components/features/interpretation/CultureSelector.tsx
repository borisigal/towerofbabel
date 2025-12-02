'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CULTURES, CULTURE_NAMES, type CultureCode } from '@/lib/types/models';

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
 * Props for CultureSelector component.
 */
interface CultureSelectorProps {
  id?: string;
  value: CultureCode | '';
  onChange: (value: CultureCode) => void;
  disabled?: boolean;
  'aria-label'?: string;
  placeholder?: string;
}

/**
 * Flag icon component that renders the appropriate culture flag.
 */
function FlagIcon({ cultureCode }: { cultureCode: CultureCode }): JSX.Element {
  const FlagComponent = CULTURE_FLAGS[cultureCode];
  return (
    <span className="inline-flex items-center justify-center w-6 h-4 mr-2 overflow-hidden border border-gray-200">
      <FlagComponent className="w-full h-full" aria-hidden="true" />
    </span>
  );
}

/**
 * Reusable culture dropdown selector component.
 *
 * Features:
 * - Populated with all 17 supported cultures
 * - Displays SVG flag icons with human-readable culture names
 * - Allows same-culture selection (e.g., American → American)
 * - Accessible keyboard navigation (shadcn Select built on Radix UI)
 * - Screen reader support with ARIA labels
 *
 * @param id - HTML id attribute
 * @param value - Currently selected culture code
 * @param onChange - Callback when culture selected
 * @param disabled - Disable selector (e.g., during loading)
 * @param aria-label - Accessibility label for screen readers
 * @param placeholder - Placeholder text when no selection
 */
export function CultureSelector({
  id,
  value,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
  placeholder = 'Select culture',
}: CultureSelectorProps): JSX.Element {
  return (
    <Select
      value={value || undefined}
      onValueChange={(selectedValue) => onChange(selectedValue as CultureCode)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className="w-full min-h-[44px]"
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder}>
          {value && (
            <span className="flex items-center">
              <FlagIcon cultureCode={value as CultureCode} />
              {CULTURE_NAMES[value as CultureCode]}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CULTURES.map((cultureCode) => (
          <SelectItem key={cultureCode} value={cultureCode}>
            <span className="flex items-center">
              <FlagIcon cultureCode={cultureCode} />
              {CULTURE_NAMES[cultureCode]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
