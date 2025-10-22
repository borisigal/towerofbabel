/**
 * Maps emotion intensity score (0-10) to human-readable label for accessibility.
 * Provides non-color-dependent indicator to meet WCAG 2.1 AA compliance.
 *
 * @param score - Emotion intensity score from LLM (0-10)
 * @returns Intensity label string
 *
 * @example
 * ```typescript
 * getIntensityLabel(8) // "High"
 * getIntensityLabel(3) // "Low"
 * getIntensityLabel(10) // "Very High"
 * ```
 */
export function getIntensityLabel(score: number): string {
  if (score <= 2) return 'Very Low';
  if (score <= 4) return 'Low';
  if (score <= 6) return 'Moderate';
  if (score <= 8) return 'High';
  return 'Very High';
}
