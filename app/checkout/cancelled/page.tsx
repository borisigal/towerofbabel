/**
 * Checkout Cancelled Page
 *
 * Displayed when user cancels or exits the Lemon Squeezy checkout process.
 * Provides options to retry or choose a different plan.
 *
 * @module app/checkout/cancelled
 */

'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { useUpgradeModalStore } from '@/lib/stores/upgradeModalStore';
import { log } from '@/lib/observability/logger';

/**
 * Checkout Cancelled Page Content Component
 * Inner component that uses useSearchParams
 * @returns {JSX.Element} The checkout cancelled page content
 */
function CheckoutCancelledContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setOpen } = useUpgradeModalStore();

  // Log checkout cancellation for analytics
  useEffect(() => {
    log.info('User viewed checkout cancelled page', {
      searchParams: Object.fromEntries(searchParams.entries()),
      referrer: document.referrer
    });
  }, [searchParams]);

  const handleRetryUpgrade = (): void => {
    log.info('User clicked retry upgrade from cancelled page');
    // Open the upgrade modal again with 'proactive' trigger
    setOpen(true, 'proactive');
    router.push('/dashboard');
  };

  const handleContinueTrial = (): void => {
    log.info('User clicked continue with trial from cancelled page');
    router.push('/dashboard');
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-8 px-4">
      <div className="w-full max-w-2xl animate-in fade-in duration-500">
        <Card className="border-2 shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-100 rounded-full blur-xl opacity-50 animate-pulse" />
                <XCircle className="relative h-16 w-16 text-yellow-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold mb-2">
              Checkout Cancelled
            </CardTitle>
            <CardDescription className="text-base">
              No problem! Your payment was not processed, and no charges were made.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-6">
            {/* Reassurance message */}
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Your free trial is still active
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Continue using Tower of Babel with your remaining trial interpretations
              </p>
            </div>

            {/* Benefits reminder */}
            <div className="bg-gradient-to-br from-muted/50 to-muted rounded-lg p-6 border">
              <div className="flex items-start gap-3 mb-4">
                <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold mb-1">Why choose a paid plan?</p>
                  <p className="text-xs text-muted-foreground">
                    Unlock more value from Tower of Babel
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>More interpretations per month (Pro) or pay only for what you use (PAYG)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>10x faster and more accurate than ChatGPT</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Priority support and early access to new features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Support the development of Tower of Babel</span>
                </li>
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleRetryUpgrade}
                className="w-full h-12 text-base"
                size="lg"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                View Upgrade Options
              </Button>
              <Button
                onClick={handleContinueTrial}
                variant="outline"
                className="w-full h-12 text-base"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Continue with Trial
              </Button>
            </div>

            {/* Help text */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Questions about upgrading or need help?
              </p>
              <a
                href="mailto:support@towerofbabel.com"
                className="text-sm text-primary hover:underline font-medium"
              >
                Contact Support
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Additional info below card */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>🔒 Secure checkout powered by Lemon Squeezy</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Checkout Cancelled Page Component
 * Renders the checkout cancellation page with retry options
 * @returns {JSX.Element} The checkout cancelled page
 */
export default function CheckoutCancelledPage(): JSX.Element {
  return (
    <Suspense fallback={
      <div className="container flex items-center justify-center min-h-screen py-8 px-4">
        <div className="w-full max-w-2xl">
          <Card className="border-2 shadow-lg">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-6">
                <XCircle className="h-16 w-16 text-yellow-600 animate-pulse" />
              </div>
              <CardTitle className="text-3xl font-bold mb-2">
                Loading...
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <CheckoutCancelledContent />
    </Suspense>
  );
}