/**
 * Pricing configuration - single source of truth for all pricing pages.
 */

export interface PricingFeature {
  text: string;
}

export interface PricingPlanConfig {
  title: string;
  subtitle: string;
  price: string;
  priceSubtext?: string;
  yearlyPrice?: string;
  yearlySavings?: string;
  features: PricingFeature[];
  ctaText: string;
  ctaHref: string;
}

/**
 * Free Trial plan configuration - used by both landing and pricing pages.
 */
export const FREE_TRIAL_CONFIG: PricingPlanConfig = {
  title: 'Free Trial',
  subtitle: 'Experience cultural clarity, risk-free.',
  price: 'Free',
  features: [
    { text: '14 days of free trial' },
    { text: 'Up to 10 interpretations' },
    { text: 'Bottom Line' },
    { text: 'Cultural Context' },
    { text: 'Emotion Gauge' },
  ],
  ctaText: 'Try Free - No Credit Card',
  ctaHref: '/sign-in',
};

/**
 * Pro plan configuration - used by both landing and pricing pages.
 */
export const PRO_CONFIG: PricingPlanConfig = {
  title: 'Pro',
  subtitle: 'Ideal for understanding any conversation, across every border.',
  price: '$9.99',
  priceSubtext: 'per month',
  features: [
    { text: 'Up to 100 interpretations' },
    { text: 'Cultural optimization for outgoing messages' },
    { text: 'Bottom Line' },
    { text: 'Cultural Context' },
    { text: 'Emotion Gauge' },
  ],
  ctaText: 'Get Pro',
  ctaHref: '/sign-in',
};
