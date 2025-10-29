/**
 * Upgrade Modal Component
 *
 * Displays pricing options modal when users hit their usage limit or want to proactively upgrade.
 * Shows three tiers: Trial (current), Pay-As-You-Go, and Pro (recommended).
 *
 * Integration Points for Story 3.4:
 * - handleSubscribeToPro: Will redirect to Lemon Squeezy checkout
 * - handleStartPayAsYouGo: Will create PAYG subscription via API
 *
 * @module components/features/upgrade/UpgradeModal
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PricingCard } from './PricingCard';
import type { UpgradeModalTrigger } from '@/lib/stores/upgradeModalStore';
import { log } from '@/lib/observability/logger';

/**
 * Props for UpgradeModal component
 */
export interface UpgradeModalProps {
  /** Whether modal is currently open */
  open: boolean;
  /** Handler called when modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** How the modal was triggered (for analytics) */
  trigger: UpgradeModalTrigger;
  /** Current user tier */
  currentTier: 'trial' | 'payg' | 'pro';
  /** Number of messages used (optional, for display) */
  messagesUsed?: number;
  /** Message limit for current tier (optional, for display) */
  messagesLimit?: number;
}

/**
 * Gets Pro tier message limit from environment variable.
 * Returns placeholder "[X]" if not set (TBD until Week 1 benchmarking).
 *
 * @returns Pro message limit as string or "[X]" placeholder
 */
function getProMessageLimit(): string {
  const limit = process.env.NEXT_PUBLIC_PRO_MESSAGE_LIMIT;
  return limit || '[X]';
}

/**
 * Upgrade Modal Component
 *
 * Displays three pricing tiers with call-to-action buttons.
 * Handles placeholder implementations for Story 3.4 integration.
 *
 * @example
 * ```tsx
 * const { open, trigger, setOpen } = useUpgradeModalStore();
 * const { tier, messagesUsed, messagesLimit } = useUsageStore();
 *
 * <UpgradeModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   trigger={trigger}
 *   currentTier={tier}
 *   messagesUsed={messagesUsed}
 *   messagesLimit={messagesLimit}
 * />
 * ```
 */
export function UpgradeModal({
  open,
  onOpenChange,
  trigger,
  currentTier,
  messagesUsed: _messagesUsed,
  messagesLimit: _messagesLimit,
}: UpgradeModalProps): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingPro, setLoadingPro] = useState(false);
  const [loadingPayg, setLoadingPayg] = useState(false);
  const proMessageLimit = getProMessageLimit();

  /**
   * Story 3.4 - Redirect to Lemon Squeezy Checkout for Pro subscription
   *
   * Implementation:
   * 1. Call /api/checkout/pro endpoint to create checkout session
   * 2. Receive Lemon Squeezy checkout URL
   * 3. Redirect user to checkout page
   */
  const handleSubscribeToPro = async (): Promise<void> => {
    setLoadingPro(true);

    log.info('User initiated Pro subscription checkout', {
      trigger,
      currentTier
    });

    try {
      // Call the Pro checkout API endpoint
      const response = await fetch('/api/checkout/pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 'Failed to create checkout session';
        log.error('Pro checkout creation failed', {
          trigger,
          currentTier,
          error: data.error,
          status: response.status
        });
        throw new Error(errorMessage);
      }

      // Redirect to Lemon Squeezy checkout
      if (data.checkoutUrl) {
        log.info('Redirecting to Pro checkout', {
          trigger,
          checkoutUrl: data.checkoutUrl
        });
        window.location.href = data.checkoutUrl;
      } else {
        log.error('No checkout URL received from API', {
          trigger,
          response: data
        });
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      log.error('Pro subscription checkout error', {
        trigger,
        currentTier,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      toast({
        title: 'Subscription Error',
        description: error instanceof Error ? error.message : 'Failed to start subscription. Please try again.',
        variant: 'destructive',
      });
      setLoadingPro(false);
    }
    // Don't set loading to false here if redirecting (only on error)
  };

  /**
   * Story 3.4 - Create PAYG subscription via Lemon Squeezy API
   *
   * Implementation:
   * 1. Call /api/subscription/payg/create endpoint
   * 2. Create usage-based subscription in Lemon Squeezy
   * 3. Update user tier to 'payg' in database
   * 4. Close modal, show success message
   */
  const handleStartPayAsYouGo = async (): Promise<void> => {
    setLoadingPayg(true);

    log.info('User initiated PAYG subscription', {
      trigger,
      currentTier
    });

    try {
      // Call the PAYG subscription API endpoint
      const response = await fetch('/api/subscription/payg/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 'Failed to create PAYG subscription';
        log.error('PAYG subscription creation failed', {
          trigger,
          currentTier,
          error: data.error,
          status: response.status
        });
        throw new Error(errorMessage);
      }

      log.info('PAYG subscription created successfully', {
        trigger,
        subscriptionId: data.subscription?.id,
        tier: 'payg'
      });

      // Success - close modal and show confirmation
      toast({
        title: 'Pay-As-You-Go Activated!',
        description: data.subscription?.message || 'You will be billed monthly for your usage.',
      });

      // Close the modal after success
      onOpenChange(false);

      // Refresh to update UI with new tier (using router.refresh for better UX)
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (error) {
      log.error('PAYG subscription error', {
        trigger,
        currentTier,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      toast({
        title: 'Subscription Error',
        description: error instanceof Error ? error.message : 'Failed to start Pay-As-You-Go. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPayg(false);
    }
  };

  // Prevent any interaction while either button is loading
  const anyLoading = loadingPro || loadingPayg;

  // Pricing tier configurations
  const pricingTiers = {
    trial: {
      tier: 'trial' as const,
      title: 'Free Trial',
      price: 'Free',
      description: '14 days, 10 messages',
      features: [
        currentTier === 'trial' ? 'Expired or used up' : 'Already upgraded',
        'Limited to 10 interpretations',
        'Cross-cultural messaging insights',
        '10x faster than ChatGPT',
      ],
      ctaText: 'Current Plan',
      ctaVariant: 'outline' as const,
      disabled: true,
      loading: false,
      onCtaClick: () => {}, // No action for trial tier
    },
    payg: {
      tier: 'payg' as const,
      title: 'Pay-As-You-Go',
      price: '$0.50',
      priceSubtext: 'per interpretation',
      description: 'Use as much as you need, pay only for what you use at month-end',
      features: [
        'No upfront commitment',
        'Billed monthly for usage',
        'Perfect for occasional use',
        '10x faster & more accurate than ChatGPT',
        'No limits - pay only for what you use',
      ],
      ctaText: 'Start Pay-As-You-Go',
      ctaVariant: 'secondary' as const,
      disabled: anyLoading || currentTier === 'payg',
      loading: loadingPayg,
      onCtaClick: handleStartPayAsYouGo,
    },
    pro: {
      tier: 'pro' as const,
      title: 'Pro',
      price: '$10/month',
      description: `${proMessageLimit} messages per month`,
      features: [
        `${proMessageLimit} interpretations/month`,
        'Monthly usage resets automatically',
        'Best value for regular use',
        '10x faster & more accurate than ChatGPT',
        'Priority support',
      ],
      ctaText: 'Subscribe to Pro',
      ctaVariant: 'default' as const,
      recommended: true,
      disabled: anyLoading || currentTier === 'pro',
      loading: loadingPro,
      onCtaClick: handleSubscribeToPro,
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Continue interpreting cross-cultural messages with unlimited confidence
          </DialogDescription>
        </DialogHeader>

        {/* Pricing Tiers - Vertical Stack for optimal readability */}
        <div className="grid grid-cols-1 gap-4 py-4">
          <PricingCard {...pricingTiers.trial} />
          <PricingCard {...pricingTiers.payg} />
          <PricingCard {...pricingTiers.pro} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
