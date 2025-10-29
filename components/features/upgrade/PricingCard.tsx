/**
 * Pricing Card Component
 *
 * Displays a pricing tier option with title, price, features, and CTA button.
 * Used in UpgradeModal to show Trial, Pay-As-You-Go, and Pro tiers.
 *
 * @module components/features/upgrade/PricingCard
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

/**
 * Props for PricingCard component
 */
export interface PricingCardProps {
  /** Tier identifier (for styling and logic) */
  tier: 'trial' | 'payg' | 'pro';
  /** Display title of the tier */
  title: string;
  /** Price text (e.g., "Free", "$0.50", "$10/month") */
  price: string;
  /** Optional subtext for price (e.g., "per interpretation") */
  priceSubtext?: string;
  /** Description of the tier */
  description: string;
  /** List of features included in this tier */
  features: string[];
  /** Text for the call-to-action button */
  ctaText: string;
  /** Button variant style */
  ctaVariant: 'default' | 'outline' | 'secondary';
  /** Whether to show "Recommended" badge (typically for Pro tier) */
  recommended?: boolean;
  /** Whether the card/button should be disabled */
  disabled?: boolean;
  /** Whether the button is in loading state (shows spinner) */
  loading?: boolean;
  /** Handler called when CTA button is clicked */
  onCtaClick: () => void;
}

/**
 * Pricing Card Component
 *
 * Displays a pricing tier with visual hierarchy and clear CTA.
 *
 * @example
 * ```tsx
 * <PricingCard
 *   tier="pro"
 *   title="Pro"
 *   price="$10/month"
 *   description="100 messages per month"
 *   features={['100 interpretations/month', 'Priority support']}
 *   ctaText="Subscribe to Pro"
 *   ctaVariant="default"
 *   recommended={true}
 *   onCtaClick={handleSubscribe}
 * />
 * ```
 */
export function PricingCard({
  tier: _tier,
  title,
  price,
  priceSubtext,
  description,
  features,
  ctaText,
  ctaVariant,
  recommended = false,
  disabled = false,
  loading = false,
  onCtaClick,
}: PricingCardProps): JSX.Element {
  return (
    <div
      className={`
        relative rounded-lg border p-6 shadow-sm transition-all
        ${recommended ? 'border-blue-600 shadow-blue-100' : 'border-gray-200'}
        ${disabled || loading ? 'opacity-60' : 'hover:shadow-md'}
      `}
      role="article"
      aria-label={`${title} pricing tier`}
    >
      {/* Recommended Badge */}
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Recommended
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold">{price}</span>
          {priceSubtext && (
            <span className="text-sm text-muted-foreground">{priceSubtext}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6" aria-label={`${title} features`}>
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <Check className="h-5 w-5 text-green-600 shrink-0" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        variant={ctaVariant}
        className="w-full"
        onClick={onCtaClick}
        disabled={disabled || loading}
        aria-label={`${ctaText} for ${title} tier`}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          ctaText
        )}
      </Button>
    </div>
  );
}
