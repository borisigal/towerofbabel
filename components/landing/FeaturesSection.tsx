'use client';

import { cn } from '@/lib/utils';
import { CulturalComparisonBar } from './CulturalComparisonBar';

interface FeaturesSectionProps {
  className?: string;
}

/**
 * Features section showcasing the signature feature - Cultural Comparison Bar.
 * This section displays only the multi-bar visualization component as requested.
 */
export function FeaturesSection({ className }: FeaturesSectionProps): JSX.Element {
  return (
    <section id="features" className={cn('py-20 px-4', className)}>
      <div className="max-w-[1170px] mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-6 mb-10">
          <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <span className="text-base text-white">Signature Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-[56px] font-bold text-center text-white leading-tight lg:leading-[64px] max-w-[722px]">
            Signature Feature Showcase
          </h2>
        </div>

        {/* Feature Card - Multi-bar Visualization Only */}
        <div className="flex justify-center">
          <CulturalComparisonBar />
        </div>
      </div>
    </section>
  );
}
