'use client';

import Link from 'next/link';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingSectionProps {
  className?: string;
}

interface PricingFeature {
  text: string;
}

interface PricingCardProps {
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
 */
function PricingCard({
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
    <div className="relative flex-1">
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-[15px] right-8 z-10">
          <div className="bg-blue-500 rounded-full px-4 py-1.5">
            <span className="text-base text-white">Recommended</span>
          </div>
        </div>
      )}

      <div
        className={cn(
          'h-full rounded-[20px] border border-violet-500 p-10 flex flex-col'
        )}
        style={
          isHighlighted
            ? {
                background:
                  'linear-gradient(134deg, rgba(121,61,237,1) 4%, rgba(121,61,237,0) 83%), rgba(255,255,255,0.04)',
              }
            : {
                background: 'rgba(255,255,255,0.04)',
              }
        }
      >
        {/* Texture overlay */}
        <div
          className="absolute inset-0 rounded-[20px] opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          }}
        />

        {/* Header */}
        <div className="mb-11">
          <h3 className="text-[36px] font-bold text-white leading-[44px] mb-4">{title}</h3>
          <p className="text-lg text-[#d2d3d6] leading-[30px]">{subtitle}</p>
        </div>

        {/* Price */}
        <div className="mb-11">
          <div className="flex items-center gap-3.5 mb-[30px]">
            <span className="text-[64px] font-bold text-white leading-[64px]">{price}</span>
            {priceSubtext && (
              <span className="text-lg text-[#d2d3d6] leading-[30px]">{priceSubtext}</span>
            )}
          </div>
          {yearlyPrice && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3.5">
                <span className="text-[36px] font-bold text-white leading-[44px]">{yearlyPrice}</span>
                <span className="text-2xl text-[#d2d3d6] leading-[32px]">per Year</span>
              </div>
              {yearlySavings && (
                <div className="bg-[#12b757] rounded-full px-4 py-1.5">
                  <span className="text-base font-medium text-white">{yearlySavings}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex-1 mb-10">
          <div className="flex flex-col gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-white flex-shrink-0" />
                <span className="text-lg font-medium text-white leading-[30px]">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href={ctaHref}
          className="flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-700 transition-colors rounded-full px-9 py-4 h-14 w-full"
        >
          <span className="text-base font-semibold text-white">{ctaText}</span>
          <ChevronRight className="w-5 h-5 text-white" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Pricing section with Free Trial and Pay-As-You-Go plans.
 */
export function PricingSection({ className }: PricingSectionProps): JSX.Element {
  const freeFeatures = [
    { text: '10 cultural interpretations per month' },
    { text: 'Basic tone & gesture explanations' },
    { text: 'Email + chat scenario support' },
    { text: 'Limited saved histories' },
  ];

  const paidFeatures = [
    { text: 'Unlimited interpretations' },
    { text: 'Basic tone & gesture explanations' },
    { text: 'Email + chat scenario support' },
    { text: 'Unlimited saved histories' },
  ];

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

        {/* Pricing Cards */}
        <div className="flex flex-col lg:flex-row gap-[30px]">
          <PricingCard
            title="Free Trial"
            subtitle="Perfect for individuals exploring cultural insights."
            price="Free"
            features={freeFeatures}
            ctaText="Try Free - No Credit Card"
            ctaHref="/sign-in"
            isHighlighted={true}
          />
          <PricingCard
            title="Pay-As-You-Go"
            subtitle="Perfect for individuals exploring cultural insights."
            price="$10"
            priceSubtext="per month"
            yearlyPrice="$96"
            yearlySavings="Save 20%"
            features={paidFeatures}
            ctaText="Start Premium"
            ctaHref="/sign-in"
            isRecommended={true}
          />
        </div>
      </div>
    </section>
  );
}
