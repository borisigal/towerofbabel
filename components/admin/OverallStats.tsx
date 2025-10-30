/**
 * OverallStats Component
 *
 * Displays overall feedback statistics in responsive card layout.
 * Shows total interpretations, inbound positive rate, and outbound positive rate.
 *
 * Color indicators:
 * - Green (≥80%): Good positive feedback rate
 * - Yellow (60-79%): Moderate positive feedback rate
 * - Red (<60%): Low positive feedback rate (needs attention)
 *
 * @see docs/stories/4.5.story.md
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Props interface for OverallStats component
 */
export interface OverallStatsProps {
  totalInterpretations: number;
  inbound: {
    total_with_feedback: number;
    thumbs_up: number;
    thumbs_down: number;
    positive_rate: number;
  };
  outbound: {
    total_with_feedback: number;
    thumbs_up: number;
    thumbs_down: number;
    positive_rate: number;
  };
}

/**
 * Gets color class for positive rate badge
 * @param rate - Positive rate percentage (0-100)
 * @returns Badge variant
 */
function getRateColor(
  rate: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (rate >= 80) return 'default'; // Green
  if (rate >= 60) return 'secondary'; // Yellow
  return 'destructive'; // Red
}

/**
 * Gets color class for rate text
 * @param rate - Positive rate percentage (0-100)
 * @returns Tailwind text color class
 */
function getRateTextColor(rate: number): string {
  if (rate >= 80) return 'text-green-600 dark:text-green-400';
  if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * OverallStats Component
 *
 * Displays overall feedback statistics in three responsive cards:
 * 1. Total Interpretations
 * 2. Inbound Positive Feedback Rate
 * 3. Outbound Positive Feedback Rate
 *
 * Layout: 1 column (mobile), 3 columns (desktop)
 *
 * @param props - Overall statistics data
 */
export function OverallStats({
  totalInterpretations,
  inbound,
  outbound,
}: OverallStatsProps): JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Interpretations Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Interpretations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {totalInterpretations.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            All interpretations in selected period
          </p>
        </CardContent>
      </Card>

      {/* Inbound Positive Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Inbound Positive Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${getRateTextColor(inbound.positive_rate)}`}
            >
              {inbound.positive_rate.toFixed(1)}%
            </span>
            <Badge variant={getRateColor(inbound.positive_rate)}>
              {inbound.positive_rate >= 80
                ? 'Good'
                : inbound.positive_rate >= 60
                  ? 'Fair'
                  : 'Poor'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {inbound.thumbs_up.toLocaleString()} up /{' '}
            {inbound.thumbs_down.toLocaleString()} down
            {inbound.total_with_feedback > 0 && (
              <span className="ml-1">
                ({inbound.total_with_feedback.toLocaleString()} total)
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Outbound Positive Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Outbound Positive Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${getRateTextColor(outbound.positive_rate)}`}
            >
              {outbound.positive_rate.toFixed(1)}%
            </span>
            <Badge variant={getRateColor(outbound.positive_rate)}>
              {outbound.positive_rate >= 80
                ? 'Good'
                : outbound.positive_rate >= 60
                  ? 'Fair'
                  : 'Poor'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {outbound.thumbs_up.toLocaleString()} up /{' '}
            {outbound.thumbs_down.toLocaleString()} down
            {outbound.total_with_feedback > 0 && (
              <span className="ml-1">
                ({outbound.total_with_feedback.toLocaleString()} total)
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
