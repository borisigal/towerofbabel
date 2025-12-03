'use client';

import { PricingCard } from './PricingSection';
import { PRO_CONFIG } from '@/lib/config/pricing';

/**
 * Pro Card - wrapper component for use in server components.
 * Uses the shared PricingCard component with PRO_CONFIG.
 */
export function Pro(): JSX.Element {
  return (
    <PricingCard
      title={PRO_CONFIG.title}
      subtitle={PRO_CONFIG.subtitle}
      price={PRO_CONFIG.price}
      priceSubtext={PRO_CONFIG.priceSubtext}
      features={PRO_CONFIG.features}
      ctaText={PRO_CONFIG.ctaText}
      ctaHref={PRO_CONFIG.ctaHref}
      isHighlighted={false}
      isRecommended={true}
    />
  );
}
