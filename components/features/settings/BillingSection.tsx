'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

/**
 * Billing Section Component
 *
 * Displays user's subscription status and provides access to Lemon Squeezy Customer Portal.
 * Conditionally renders "Manage Billing" button based on user tier and payment history.
 *
 * For trial users: Shows upgrade message (no portal access)
 * For paying users (pro/payg): Shows "Manage Billing" button
 *
 * @param tier - User tier ('trial' | 'payg' | 'pro' | 'cancelled')
 * @param customerId - Lemon Squeezy customer ID (null for trial users)
 * @param subscription - Active subscription data (null for trial users)
 * @param messagesUsed - Current message usage count
 * @param messagesResetDate - Next reset date for Pro users
 */
interface BillingSectionProps {
  tier: string;
  customerId: string | null;
  subscription: {
    id: string;
    status: string;
    tier: string;
    renews_at: Date | null;
    ends_at: Date | null;
    created_at: Date;
  } | null;
  messagesUsed: number;
  messagesResetDate: Date | null;
}

export function BillingSection({
  tier,
  customerId,
  subscription,
  messagesUsed,
  messagesResetDate: _messagesResetDate,
}: BillingSectionProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Determine if user has billing info (paying customer)
  const hasBillingInfo = customerId !== null;

  /**
   * Handle "Manage Billing" button click.
   *
   * Calls /api/billing/portal endpoint to generate Customer Portal URL,
   * then redirects user to Lemon Squeezy portal for billing management.
   *
   * **Analytics:** Tracks portal access for monitoring usage patterns.
   */
  const handleManageBilling = async (): Promise<void> => {
    setIsLoading(true);

    try {
      // Call API to generate portal URL
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to access billing portal');
      }

      // Redirect to portal URL
      window.location.href = data.portalUrl;
    } catch (error) {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to access billing portal. Please try again.',
      });

      setIsLoading(false);
    }
  };

  // Format subscription status for display
  const getStatusDisplay = (): string => {
    if (tier === 'trial') return 'Free Trial';
    if (tier === 'payg') return 'Pay-As-You-Go';
    if (tier === 'pro') return 'Pro Subscription';
    if (tier === 'cancelled') return 'Cancelled';
    return tier;
  };

  // Format renewal date
  const getRenewalDisplay = (): string | null => {
    if (!subscription?.renews_at) return null;
    return new Date(subscription.renews_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get monthly cost based on tier
  const getMonthlyCost = (): string => {
    if (tier === 'trial') return '$0.00';
    if (tier === 'payg') return 'Usage-based ($0.50 per interpretation)';
    if (tier === 'pro') return '$10.00';
    return 'N/A';
  };

  // Get messages remaining
  const getMessagesRemaining = (): string => {
    if (tier === 'trial') {
      const remaining = Math.max(0, 10 - messagesUsed);
      return `${remaining} of 10 free messages remaining`;
    }
    if (tier === 'pro') {
      const remaining = Math.max(0, 100 - messagesUsed);
      return `${remaining} of 100 messages remaining this month`;
    }
    if (tier === 'payg') {
      return 'Unlimited messages (pay per use)';
    }
    return 'N/A';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Subscription</CardTitle>
        <CardDescription>Manage your subscription and billing information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subscription Status */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
          <p className="text-lg font-semibold">{getStatusDisplay()}</p>
        </div>

        {/* Messages Usage */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Usage</p>
          <p className="text-base">{getMessagesRemaining()}</p>
        </div>

        {/* Subscription Details (for paying customers only) */}
        {hasBillingInfo && subscription && (
          <>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Monthly Cost</p>
              <p className="text-base">{getMonthlyCost()}</p>
            </div>

            {getRenewalDisplay() && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Next Renewal</p>
                <p className="text-base">{getRenewalDisplay()}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-1">Subscription Status</p>
              <p className="text-base capitalize">{subscription.status}</p>
            </div>
          </>
        )}

        {/* Trial User Message */}
        {!hasBillingInfo && tier === 'trial' && (
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">
              No billing information yet. Upgrade to Pro to manage billing.
            </p>
          </div>
        )}

        {/* Manage Billing Button (for paying customers only) */}
        {hasBillingInfo && (
          <div className="pt-4">
            <Button disabled={isLoading} size="lg" onClick={handleManageBilling}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Loading...' : 'Manage Billing'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Update payment method, view invoices, or cancel subscription
            </p>
          </div>
        )}

        {/* Upgrade Button (for trial users) */}
        {!hasBillingInfo && tier === 'trial' && (
          <div className="pt-4">
            <Button size="lg">Upgrade to Pro</Button>
            <p className="text-xs text-muted-foreground mt-2">
              Get 100 messages per month and priority support
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
