/**
 * Checkout Success Page
 *
 * Displayed after successful Pro tier subscription through Lemon Squeezy.
 * Shows confirmation and next steps.
 *
 * @module app/checkout/success
 */

'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Checkout Success Page Content Component
 * Inner component that uses useSearchParams
 * @returns {JSX.Element} The checkout success page content
 */
function CheckoutSuccessContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Show success toast if coming from upgrade
    if (searchParams.get('upgrade') === 'success') {
      toast({
        title: 'Welcome to Pro!',
        description: 'Your subscription has been activated successfully.',
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Payment Successful!</CardTitle>
          <CardDescription className="mt-2">
            Welcome to Tower of Babel Pro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Your Pro subscription is now active.</p>
            <p className="mt-2">You have access to:</p>
            <ul className="mt-2 space-y-1">
              <li>• {process.env.NEXT_PUBLIC_PRO_MESSAGE_LIMIT || '[X]'} interpretations per month</li>
              <li>• Monthly usage that resets automatically</li>
              <li>• Priority support</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Return to Home
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground pt-4">
            <p>
              A confirmation email has been sent to your registered email address.
            </p>
            <p className="mt-2">
              Need help? Contact us at support@towerofbabel.com
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Checkout Success Page Component
 * Renders the checkout success confirmation page
 * @returns {JSX.Element} The checkout success page
 */
export default function CheckoutSuccessPage(): JSX.Element {
  return (
    <Suspense fallback={
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}