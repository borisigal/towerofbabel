'use client';

import { cn } from '@/lib/utils';

interface SolutionsSectionProps {
  className?: string;
}

interface BeforeAfterCardProps {
  beforeQuestion: string;
  beforeCaption: string;
  afterAnswer: string;
  afterCaption: string;
  isHighlighted?: boolean;
}

/**
 * Before/After comparison card showing cultural interpretation examples.
 */
function BeforeAfterCard({
  beforeQuestion,
  beforeCaption,
  afterAnswer,
  afterCaption,
  isHighlighted = false,
}: BeforeAfterCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex-1 rounded-[14px] border p-5 md:p-[30px]',
        isHighlighted
          ? 'border-violet-500'
          : 'bg-[#111419] border-white/12'
      )}
      style={
        isHighlighted
          ? {
              background:
                'linear-gradient(128deg, rgba(121,61,237,0.3) 4%, rgba(121,61,237,0) 83%), #111419',
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-[30px]">
        {/* Before Section */}
        <div className="flex flex-col gap-5 items-center">
          <h4 className="text-[30px] font-normal text-white leading-[36px]">Before</h4>
          <div className="w-full bg-white/4 border border-white/12 rounded-[14px] px-6 py-5 h-[104px] flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex-shrink-0 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">?</span>
            </div>
            <p className="text-base font-bold text-white leading-[26px]">{beforeQuestion}</p>
          </div>
          <p className="text-base text-[#d2d3d6] text-center">{beforeCaption}</p>
        </div>

        {/* After Section */}
        <div className="flex flex-col gap-5 items-center">
          <h4 className="text-[30px] font-normal text-white leading-[36px]">After</h4>
          <div className="w-full bg-white/4 border border-white/12 rounded-[14px] px-6 py-5 h-[104px] flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex-shrink-0 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-base font-bold text-white leading-[26px]">{afterAnswer}</p>
          </div>
          <p className="text-base text-[#d2d3d6] text-center">{afterCaption}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Solutions section showcasing before/after cultural interpretation examples.
 */
export function SolutionsSection({ className }: SolutionsSectionProps): JSX.Element {
  const examples = [
    {
      beforeQuestion: 'My German colleague seems angry?',
      beforeCaption: 'Misinterpreting directness as frustration',
      afterAnswer: 'Actually, this is normal directness',
      afterCaption: 'Understanding clarity-focused communication',
    },
    {
      beforeQuestion: "Why did my Japanese client avoid saying 'no'?",
      beforeCaption: 'Unclear commitments',
      afterAnswer: 'This is a cultural preference for indirect communication.',
      afterCaption: 'Confident next steps based on cultural norms',
      isHighlighted: true,
    },
    {
      beforeQuestion: 'My American teammate keeps using small talk—do I need to?',
      beforeCaption: 'Awkward or minimal interaction',
      afterAnswer: 'Yes, it builds rapport in U.S. workplace culture',
      afterCaption: 'Smooth, culturally aligned communication',
    },
  ];

  return (
    <section id="solutions" className={cn('py-20 px-4', className)}>
      <div className="max-w-[1170px] mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-6 mb-10">
          <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <span className="text-base text-white">Our Solutions</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-[56px] font-bold text-center text-white leading-tight lg:leading-[64px] max-w-[666px]">
            Understand Cultural Nuance Instantly
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="flex flex-col lg:flex-row gap-5">
          {examples.map((example, index) => (
            <BeforeAfterCard key={index} {...example} />
          ))}
        </div>
      </div>
    </section>
  );
}
