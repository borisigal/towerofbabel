'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FREE_TRIAL_CONFIG, PRO_CONFIG, type PricingFeature } from '@/lib/config/pricing';

interface PricingSectionProps {
  className?: string;
  /** Optional content to render between header and pricing cards (e.g., user stats) */
  headerContent?: React.ReactNode;
}

export interface PricingCardProps {
  title: string;
  subtitle: string;
  price: string;
  priceSubtext?: string;
  yearlyPrice?: string;
  yearlySavings?: string;
  features: PricingFeature[];
  ctaText: string;
  ctaHref: string;
  isHighlighted?: boolean;
  isRecommended?: boolean;
}

/**
 * Individual pricing card component.
 * Shared between landing page and pricing page.
 */
export function PricingCard({
  title,
  subtitle,
  price,
  priceSubtext,
  yearlyPrice,
  yearlySavings,
  features,
  ctaText,
  ctaHref,
  isHighlighted = false,
  isRecommended = false,
}: PricingCardProps): JSX.Element {
  return (
    <div className="relative w-full">
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-3 right-8 z-10">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Recommended
          </span>
        </div>
      )}

      <div
        className={cn(
          'h-full rounded-3xl p-6 md:p-8 flex flex-col',
          isHighlighted
            ? 'bg-gradient-to-br from-purple-800/30 via-purple-700/20 to-transparent backdrop-blur-sm border border-purple-500/30'
            : 'bg-white/5 backdrop-blur-sm border border-white/10'
        )}
      >
        {/* Header */}
        <h3 className="text-2xl md:text-3xl font-bold mb-3">{title}</h3>
        <p className="text-white/70 mb-6 md:mb-8 text-sm md:text-base">{subtitle}</p>

        {/* Price */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-4xl md:text-5xl font-bold">{price}</p>
            {priceSubtext && <p className="text-white/70 text-sm md:text-base">{priceSubtext}</p>}
          </div>
          {yearlyPrice && (
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl md:text-3xl font-bold text-white/90">{yearlyPrice}</p>
              <p className="text-white/70 text-sm md:text-base">per Year</p>
              {yearlySavings && (
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold ml-2">
                  {yearlySavings}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 flex-grow">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-white" />
              <p className="text-sm md:text-base">{feature.text}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Link
          href={ctaHref}
          className="w-full bg-primary hover:bg-primary/90 rounded-full py-3 md:py-4 text-base md:text-lg font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {ctaText}
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Pricing section with Free plan.
 */
export function PricingSection({ className, headerContent }: PricingSectionProps): JSX.Element {
  return (
    <section id="pricing" className={cn('py-20 px-4', className)}>
      <div className="max-w-[1170px] mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-6 mb-[60px]">
          <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <span className="text-base text-white">Pricing Plan</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-[56px] font-bold text-center text-white leading-tight lg:leading-[64px] max-w-[818px]">
            Simple, transparent pricing for global communication.
          </h2>
        </div>

        {/* Optional content between header and cards (e.g., user stats) */}
        {headerContent}

        {/* Pricing Cards */}
        <div className="flex flex-col md:flex-row justify-center gap-8 items-stretch">
          <div className="w-full md:max-w-[570px]">
            <PricingCard
              title={FREE_TRIAL_CONFIG.title}
              subtitle={FREE_TRIAL_CONFIG.subtitle}
              price={FREE_TRIAL_CONFIG.price}
              features={FREE_TRIAL_CONFIG.features}
              ctaText={FREE_TRIAL_CONFIG.ctaText}
              ctaHref={FREE_TRIAL_CONFIG.ctaHref}
              isHighlighted={true}
            />
          </div>
          <div className="w-full md:max-w-[570px]">
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
          </div>
        </div>
      </div>
    </section>
  );
}
