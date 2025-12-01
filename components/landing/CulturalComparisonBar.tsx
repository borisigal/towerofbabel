'use client';

import { cn } from '@/lib/utils';

interface CulturalComparisonBarProps {
  className?: string;
}

interface ComparisonBarProps {
  label: string;
  country1: {
    name: string;
    flag: 'germany' | 'usa';
    value: number;
    color: 'blue' | 'violet';
  };
  country2: {
    name: string;
    flag: 'germany' | 'usa';
    value: number;
    color: 'blue' | 'violet';
  };
}

/**
 * Flag component for Germany.
 */
function GermanyFlag(): JSX.Element {
  return (
    <div className="w-8 h-6 rounded-sm overflow-hidden">
      <div className="h-1/3 bg-[#272727]" />
      <div className="h-1/3 bg-[#dc251c]" />
      <div className="h-1/3 bg-[#ffd018]" />
    </div>
  );
}

/**
 * Flag component for USA.
 */
function USAFlag(): JSX.Element {
  return (
    <div className="w-8 h-6 rounded-sm overflow-hidden relative bg-[#eef3f8]">
      {/* Blue canton */}
      <div className="absolute top-0 left-0 w-[45%] h-[58%] bg-[#41479b]" />
      {/* Red stripes */}
      <div className="absolute top-0 left-[56%] right-0 h-[8%] bg-[#dc251c]" />
      <div className="absolute top-[16.67%] left-[56%] right-0 h-[8%] bg-[#dc251c]" />
      <div className="absolute top-[33.33%] left-[56%] right-0 h-[8%] bg-[#dc251c]" />
      <div className="absolute top-[50%] left-[56%] right-0 h-[8%] bg-[#dc251c]" />
      <div className="absolute top-[66.67%] left-0 right-0 h-[8%] bg-[#dc251c]" />
      <div className="absolute top-[83.33%] left-0 right-0 h-[8%] bg-[#dc251c]" />
    </div>
  );
}

/**
 * Single comparison row with flag and progress bar.
 */
function ComparisonRow({
  flag,
  value,
  color,
}: {
  flag: 'germany' | 'usa';
  value: number;
  color: 'blue' | 'violet';
}): JSX.Element {
  const maxValue = 10;
  const percentage = (value / maxValue) * 100;
  const bgColor = color === 'blue' ? 'bg-blue-500' : 'bg-violet-600';

  return (
    <div className="flex items-center gap-3 w-full">
      {flag === 'germany' ? <GermanyFlag /> : <USAFlag />}
      <div className="flex-1 h-2 relative">
        <div className="absolute inset-0 bg-white/20 rounded-full" style={{ width: '100%' }} />
        <div
          className={cn('absolute h-2 rounded-full', bgColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-lg text-white">
        {value}<span className="text-[#a0a4ad]">/10</span>
      </span>
    </div>
  );
}

/**
 * Comparison section with label and two country bars.
 */
function ComparisonSection({ label, country1, country2 }: ComparisonBarProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-lg font-medium text-white leading-[30px]">{label}</p>
      <ComparisonRow flag={country1.flag} value={country1.value} color={country1.color} />
      <ComparisonRow flag={country2.flag} value={country2.value} color={country2.color} />
    </div>
  );
}

/**
 * Multi-bar visualization component showing cultural dimension comparisons.
 */
export function CulturalComparisonBar({ className }: CulturalComparisonBarProps): JSX.Element {
  const comparisons: ComparisonBarProps[] = [
    {
      label: 'Directness',
      country1: { name: 'Germany', flag: 'germany', value: 3, color: 'blue' },
      country2: { name: 'USA', flag: 'usa', value: 6, color: 'violet' },
    },
    {
      label: 'Formality',
      country1: { name: 'Germany', flag: 'germany', value: 3, color: 'blue' },
      country2: { name: 'USA', flag: 'usa', value: 6, color: 'violet' },
    },
  ];

  return (
    <div
      className={cn(
        'bg-[#111419] border border-white/12 rounded-[14px] p-[30px] w-full max-w-[370px]',
        className
      )}
    >
      <h4 className="text-2xl font-bold text-white leading-[32px] mb-[30px]">
        Multi-bar or radial visualization
      </h4>
      <div className="flex flex-col gap-[10px]">
        {comparisons.map((comparison, index) => (
          <ComparisonSection key={index} {...comparison} />
        ))}
      </div>
    </div>
  );
}
