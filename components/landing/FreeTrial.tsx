'use client';

import { PricingCard } from './PricingSection';
import { FREE_TRIAL_CONFIG } from '@/lib/config/pricing';

/**
 * Free Trial Card - wrapper component for use in server components.
 * Uses the shared PricingCard component with FREE_TRIAL_CONFIG.
 */
export function FreeTrial(): JSX.Element {
  return (
    <PricingCard
      title={FREE_TRIAL_CONFIG.title}
      subtitle={FREE_TRIAL_CONFIG.subtitle}
      price={FREE_TRIAL_CONFIG.price}
      features={FREE_TRIAL_CONFIG.features}
      ctaText={FREE_TRIAL_CONFIG.ctaText}
      ctaHref={FREE_TRIAL_CONFIG.ctaHref}
      isHighlighted={true}
    />
  );
}
