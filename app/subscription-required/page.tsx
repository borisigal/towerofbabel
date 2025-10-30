import { createClient } from '@/lib/auth/supabaseServer';
import { findUserWithBilling } from '@/lib/db/repositories/userRepository';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Subscription Required Page
 *
 * Shown to cancelled users who attempt to access dashboard.
 * Provides option to reactivate subscription via pricing page or upgrade modal.
 *
 * **CRITICAL Security Note:**
 * This page is accessible to cancelled users (no auth redirect).
 * All other dashboard pages block cancelled users via middleware.
 *
 * @see Story 3.5 - AC 9: Subscription Required Page
 * @see lib/middleware/checkCancelledStatus.ts - Middleware that redirects here
 */
export default async function SubscriptionRequiredPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRecord = null;
  let cancellationDate = null;

  if (user) {
    userRecord = await findUserWithBilling(user.id);

    // If user is NOT cancelled, redirect to dashboard (they shouldn't be here)
    if (userRecord && userRecord.tier !== 'cancelled') {
      redirect('/dashboard');
    }

    // Get cancellation date from subscription
    if (userRecord?.subscription && userRecord.subscription.status === 'cancelled') {
      cancellationDate = userRecord.subscription.ends_at;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-16">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <div>
            <CardTitle className="text-3xl font-bold mb-2">
              Subscription Required
            </CardTitle>
            <CardDescription className="text-lg">
              Your subscription has been cancelled.
              {cancellationDate && (
                <span className="block mt-2 text-sm">
                  Cancelled on{' '}
                  {new Date(cancellationDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Explanation */}
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground text-center">
              To continue using TowerOfBabel and access your dashboard, please
              reactivate your subscription or start a new plan.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => (window.location.href = '/pricing')}
            >
              View Pricing Plans
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => (window.location.href = '/contact')}
            >
              Contact Support
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Have questions about your billing?{' '}
              <a
                href="/contact"
                className="text-primary underline hover:text-primary/80"
              >
                Contact our support team
              </a>
            </p>
          </div>

          {/* Sign Out Option */}
          {user && (
            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Signed in as {user.email}
              </p>
              <a
                href="/api/auth/sign-out"
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Sign out
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
