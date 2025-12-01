'use client';

import { cn } from '@/lib/utils';
import { ClipboardPaste, Globe2, Lightbulb } from 'lucide-react';

interface HowItWorksSectionProps {
  className?: string;
}

interface StepCardProps {
  step: number;
  title: string;
  icon: React.ReactNode;
  isHighlighted?: boolean;
}

/**
 * Individual step card with circular design.
 */
function StepCard({ step, title, icon, isHighlighted = false }: StepCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'relative w-full max-w-[358px] aspect-square rounded-full border border-violet-500',
        'flex flex-col items-center justify-center gap-6 p-6'
      )}
      style={
        isHighlighted
          ? {
              background:
                'linear-gradient(138deg, rgba(121,61,237,1) 4%, rgba(121,61,237,0) 83%), rgba(255,255,255,0.04)',
            }
          : {
              background: 'rgba(255,255,255,0.04)',
            }
      }
    >
      {/* Texture overlay */}
      <div
        className="absolute inset-0 rounded-full opacity-10"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        }}
      />

      {/* Icon */}
      <div className="relative z-10">{icon}</div>

      {/* Text */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className="text-2xl text-[#d2d3d6] leading-[32px]">Step {step}</span>
        <h3 className="text-2xl md:text-[36px] font-bold text-white text-center leading-[44px] max-w-[228px]">
          {title}
        </h3>
      </div>
    </div>
  );
}

/**
 * How It Works section showing the 3-step flow.
 */
export function HowItWorksSection({ className }: HowItWorksSectionProps): JSX.Element {
  const steps = [
    {
      step: 1,
      title: 'Paste message',
      icon: <ClipboardPaste className="w-16 h-16 text-white" strokeWidth={1.5} />,
      isHighlighted: true,
    },
    {
      step: 2,
      title: 'Select cultures',
      icon: <Globe2 className="w-16 h-16 text-white" strokeWidth={1.5} />,
    },
    {
      step: 3,
      title: 'Get instant insights',
      icon: <Lightbulb className="w-16 h-16 text-white" strokeWidth={1.5} />,
    },
  ];

  return (
    <section id="how-it-works" className={cn('py-20 px-4', className)}>
      <div className="max-w-[1170px] mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <span className="text-base text-white">How It Works</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-[56px] font-bold text-center text-white leading-tight lg:leading-[64px] max-w-[722px]">
            A simple, three-step flow
          </h2>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
          {steps.map((stepData) => (
            <StepCard key={stepData.step} {...stepData} />
          ))}
        </div>
      </div>
    </section>
  );
}
