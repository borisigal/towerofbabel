/**
 * CulturePairTable Component
 *
 * Displays culture pairs with lowest positive feedback rates.
 * Helps identify problematic culture pair combinations that need prompt improvements.
 *
 * Table columns:
 * - Sender Culture
 * - Receiver Culture
 * - Total Feedback
 * - Thumbs Up
 * - Thumbs Down
 * - Positive Rate (color-coded)
 *
 * @see docs/stories/4.5.story.md
 */

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

/**
 * Culture pair statistics interface
 */
export interface CulturePairStats {
  sender: string;
  receiver: string;
  total: number;
  thumbs_up: number;
  thumbs_down: number;
  positive_rate: number;
}

/**
 * Props interface for CulturePairTable component
 */
export interface CulturePairTableProps {
  culturePairs: CulturePairStats[];
}

/**
 * Gets badge variant for positive rate
 * @param rate - Positive rate percentage (0-100)
 * @returns Badge variant
 */
function getRateBadgeVariant(
  rate: number
): 'default' | 'secondary' | 'destructive' {
  if (rate >= 80) return 'default'; // Green
  if (rate >= 60) return 'secondary'; // Yellow
  return 'destructive'; // Red
}

/**
 * Formats culture code to display name
 * @param cultureCode - Culture code (e.g., "en-US", "ja-JP")
 * @returns Display name (e.g., "English (US)", "Japanese (Japan)")
 */
function formatCultureName(cultureCode: string): string {
  // Split culture code into language and region
  const parts = cultureCode.split('-');
  const lang = parts[0] || '';
  const region = parts[1] || '';

  // Map language codes to names
  const languageNames: Record<string, string> = {
    en: 'English',
    ja: 'Japanese',
    zh: 'Chinese',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ar: 'Arabic',
    ko: 'Korean',
    hi: 'Hindi',
  };

  // Map region codes to names
  const regionNames: Record<string, string> = {
    US: 'US',
    GB: 'UK',
    JP: 'Japan',
    CN: 'China',
    ES: 'Spain',
    FR: 'France',
    DE: 'Germany',
    IT: 'Italy',
    PT: 'Portugal',
    BR: 'Brazil',
    RU: 'Russia',
    SA: 'Saudi Arabia',
    KR: 'Korea',
    IN: 'India',
  };

  const languageName = languageNames[lang] || lang.toUpperCase();
  const regionName = regionNames[region] || region;

  return region ? `${languageName} (${regionName})` : languageName;
}

/**
 * CulturePairTable Component
 *
 * Displays culture pairs sorted by positive rate (ascending).
 * Shows top 5 pairs with lowest positive feedback rates.
 *
 * Responsive: Stacks columns on mobile, full table on desktop.
 *
 * @param props - Culture pair statistics data
 */
export function CulturePairTable({
  culturePairs,
}: CulturePairTableProps): JSX.Element {
  // Handle empty state
  if (culturePairs.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No feedback data available for the selected period.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sender Culture</TableHead>
            <TableHead>Receiver Culture</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">
              <span className="text-green-600 dark:text-green-400">
                Thumbs Up
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="text-red-600 dark:text-red-400">
                Thumbs Down
              </span>
            </TableHead>
            <TableHead className="text-right">Positive Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {culturePairs.map((pair, index) => (
            <TableRow key={`${pair.sender}-${pair.receiver}-${index}`}>
              <TableCell className="font-medium">
                {formatCultureName(pair.sender)}
              </TableCell>
              <TableCell className="font-medium">
                {formatCultureName(pair.receiver)}
              </TableCell>
              <TableCell className="text-right">
                {pair.total.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-green-600 dark:text-green-400">
                {pair.thumbs_up.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-red-600 dark:text-red-400">
                {pair.thumbs_down.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={getRateBadgeVariant(pair.positive_rate)}>
                  {pair.positive_rate.toFixed(1)}%
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
