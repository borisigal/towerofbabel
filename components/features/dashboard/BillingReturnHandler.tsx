'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

/**
 * Billing Return Handler Component
 *
 * Detects when user returns from Lemon Squeezy Customer Portal
 * via the `?billing=returned` query parameter.
 *
 * Actions:
 * 1. Shows success toast confirming billing update
 * 2. Clears the query parameter from URL (clean UI)
 *
 * Usage: Add to dashboard page to handle portal return flow.
 *
 * @example
 * ```tsx
 * // In app/(dashboard)/dashboard/page.tsx
 * <BillingReturnHandler />
 * ```
 */
export function BillingReturnHandler(): null {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user just returned from billing portal
    const billingParam = searchParams.get('billing');

    if (billingParam === 'returned') {
      // Show success toast
      toast({
        title: 'Billing Updated',
        description: 'Your billing settings have been updated successfully.',
      });

      // Clear the query parameter from URL (without page reload)
      // Create new URL without the billing parameter
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('billing');

      const newUrl = newSearchParams.toString()
        ? `/dashboard?${newSearchParams.toString()}`
        : '/dashboard';

      router.replace(newUrl);
    }
  }, [searchParams, toast, router]);

  // This component doesn't render anything
  return null;
}
