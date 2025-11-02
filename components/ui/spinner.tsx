import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Loading spinner component with smooth animation.
 * Uses shadcn/ui styling conventions and accessible ARIA attributes.
 *
 * @param size - Size variant (sm: 16px, md: 32px, lg: 48px)
 * @param className - Additional CSS classes to apply
 *
 * @example
 * ```tsx
 * <Spinner size="md" />
 * <button disabled={isLoading}>
 *   {isLoading ? <Spinner size="sm" /> : 'Submit'}
 * </button>
 * ```
 */
export function Spinner({ size = 'md', className }: SpinnerProps): JSX.Element {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
