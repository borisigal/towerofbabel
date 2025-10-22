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
 * Reusable culture dropdown selector component.
 *
 * Features:
 * - Populated with all 15 supported cultures
 * - Displays human-readable culture names
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
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {CULTURES.map((cultureCode) => (
          <SelectItem key={cultureCode} value={cultureCode}>
            {CULTURE_NAMES[cultureCode]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
