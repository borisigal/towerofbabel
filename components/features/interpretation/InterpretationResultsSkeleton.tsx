import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton placeholder for interpretation results while loading.
 * Mimics the structure of the InterpretationResult component.
 *
 * @example
 * ```tsx
 * {isLoading && <InterpretationResultsSkeleton />}
 * {!isLoading && result && <InterpretationResult result={result} />}
 * ```
 */
export function InterpretationResultsSkeleton(): JSX.Element {
  return (
    <div className="space-y-6" role="status" aria-label="Loading interpretation results">
      {/* Bottom line skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" /> {/* "Bottom Line" label */}
        <Skeleton className="h-8 w-3/4" /> {/* Bottom line content */}
      </div>

      {/* Cultural context skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" /> {/* "Cultural Context" label */}
        <Skeleton className="h-24 w-full" /> {/* Context paragraph */}
      </div>

      {/* Emotion gauges skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" /> {/* "Emotions" label */}
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" /> {/* Emotion gauge 1 */}
          <Skeleton className="h-20 w-full" /> {/* Emotion gauge 2 */}
          <Skeleton className="h-20 w-full" /> {/* Emotion gauge 3 */}
        </div>
      </div>

      <span className="sr-only">Loading interpretation results...</span>
    </div>
  );
}
