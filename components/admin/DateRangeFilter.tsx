/**
 * DateRangeFilter Component
 *
 * Dropdown selector for date range filtering.
 * Updates URL params to trigger Server Component re-render.
 *
 * Options:
 * - Last 7 days
 * - Last 30 days (default)
 * - All time
 *
 * @see docs/stories/4.5.story.md
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

/**
 * Date range options
 */
const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
] as const;

/**
 * DateRangeFilter Component
 *
 * Dropdown for selecting date range filter.
 * Updates URL params (?range=7d|30d|all) which triggers page re-render.
 *
 * Default: Last 30 days
 */
export function DateRangeFilter(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current range from URL params (default to '30d')
  const currentRange = searchParams.get('range') || '30d';

  /**
   * Handle date range change
   * Updates URL params which triggers Server Component re-render
   */
  const handleRangeChange = (value: string): void => {
    // Create new URL search params
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', value);

    // Navigate to new URL with updated params
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-4">
      <Label htmlFor="date-range-filter" className="text-sm font-medium">
        Date Range:
      </Label>
      <Select value={currentRange} onValueChange={handleRangeChange}>
        <SelectTrigger id="date-range-filter" className="w-[180px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
