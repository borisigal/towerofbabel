'use client';

import { cn } from '@/lib/utils';

interface SupportedCulturesSectionProps {
  className?: string;
}

interface FlagProps {
  name: string;
  code: string;
}

/**
 * Individual country flag component with CSS-based flag rendering.
 */
function CountryFlag({ name, code }: FlagProps): JSX.Element {
  const flagStyles: Record<string, JSX.Element> = {
    germany: (
      <div className="w-full h-full rounded-[10px] overflow-hidden">
        <div className="h-1/3 bg-[#272727]" />
        <div className="h-1/3 bg-[#dc251c]" />
        <div className="h-1/3 bg-[#ffd018]" />
      </div>
    ),
    england: (
      <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#f5f8fb] relative">
        <div className="absolute top-0 left-[44%] w-[12%] h-full bg-[#dc251c]" />
        <div className="absolute top-[42%] left-0 w-full h-[16%] bg-[#dc251c]" />
      </div>
    ),
    usa: (
      <div className="w-full h-full rounded-[10px] overflow-hidden relative bg-[#f5f8fb]">
        <div className="absolute top-0 left-0 w-[43%] h-[53%] bg-[#41479b]" />
        {[0, 15.38, 30.76, 46.14, 61.52, 76.9, 92.28].map((top, i) => (
          <div
            key={i}
            className="absolute h-[7.69%] bg-[#dc251c]"
            style={{
              top: `${top}%`,
              left: i < 4 ? '56%' : '0',
              right: '0',
            }}
          />
        ))}
      </div>
    ),
    hungary: (
      <div className="w-full h-full rounded-[10px] overflow-hidden">
        <div className="h-1/3 bg-[#dc251c]" />
        <div className="h-1/3 bg-[#f5f8fb]" />
        <div className="h-1/3 bg-[#2b9f5a]" />
      </div>
    ),
    'ivory-coast': (
      <div className="w-full h-full rounded-[10px] overflow-hidden flex">
        <div className="w-1/3 h-full bg-[#ff8718]" />
        <div className="w-1/3 h-full bg-[#f5f8fb]" />
        <div className="w-1/3 h-full bg-[#2b9f5a]" />
      </div>
    ),
    norway: (
      <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#dc251c] relative">
        <div className="absolute top-0 left-[25%] w-1/4 h-full bg-[#f5f8fb]" />
        <div className="absolute top-[33%] left-0 w-full h-1/3 bg-[#f5f8fb]" />
        <div className="absolute top-0 left-[31%] w-[12.5%] h-full bg-[#2e4e9d]" />
        <div className="absolute top-[42%] left-0 w-full h-[16%] bg-[#2e4e9d]" />
      </div>
    ),
    japan: (
      <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#f5f8fb] flex items-center justify-center">
        <div className="w-[40%] aspect-square rounded-full bg-[#dc251c]" />
      </div>
    ),
    india: (
      <div className="w-full h-full rounded-[10px] overflow-hidden">
        <div className="h-1/3 bg-[#ff9933]" />
        <div className="h-1/3 bg-[#f5f8fb] flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border-2 border-[#000080]" />
        </div>
        <div className="h-1/3 bg-[#138808]" />
      </div>
    ),
    latvia: (
      <div className="w-full h-full rounded-[10px] overflow-hidden">
        <div className="h-[42%] bg-[#a71b14]" />
        <div className="h-[16%] bg-[#f5f8fb]" />
        <div className="h-[42%] bg-[#a71b14]" />
      </div>
    ),
    yemen: (
      <div className="w-full h-full rounded-[10px] overflow-hidden">
        <div className="h-1/3 bg-[#dc251c]" />
        <div className="h-1/3 bg-[#f5f8fb]" />
        <div className="h-1/3 bg-[#272727]" />
      </div>
    ),
    'puerto-rico': (
      <div className="w-full h-full rounded-[10px] overflow-hidden relative">
        {[0, 20, 40, 60, 80].map((top, i) => (
          <div
            key={i}
            className="absolute h-[20%] w-full"
            style={{ top: `${top}%`, backgroundColor: i % 2 === 0 ? '#dc251c' : '#f5f8fb' }}
          />
        ))}
        <div
          className="absolute top-0 left-0 w-[40%] h-[60%]"
          style={{
            background: 'linear-gradient(135deg, #0039a6 50%, transparent 50%)',
            clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
          }}
        />
      </div>
    ),
    'south-africa': (
      <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#007a4d] relative">
        <div className="absolute top-0 left-0 right-0 h-[33%] bg-[#dc251c]" />
        <div className="absolute bottom-0 left-0 right-0 h-[33%] bg-[#002395]" />
        <div
          className="absolute top-[12%] bottom-[12%] left-0 w-[40%] bg-[#ffb612]"
          style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
        />
      </div>
    ),
    'czech-republic': (
      <div className="w-full h-full rounded-[10px] overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-[#f5f8fb]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#dc251c]" />
        <div
          className="absolute top-0 left-0 h-full w-[40%] bg-[#11457e]"
          style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
        />
      </div>
    ),
    ghana: (
      <div className="w-full h-full rounded-[10px] overflow-hidden relative">
        <div className="h-1/3 bg-[#dc251c]" />
        <div className="h-1/3 bg-[#fcd116] flex items-center justify-center">
          <div className="text-black text-xs">*</div>
        </div>
        <div className="h-1/3 bg-[#006b3f]" />
      </div>
    ),
    paraguay: (
      <div className="w-full h-full rounded-[10px] overflow-hidden">
        <div className="h-1/3 bg-[#dc251c]" />
        <div className="h-1/3 bg-[#f5f8fb]" />
        <div className="h-1/3 bg-[#0038a8]" />
      </div>
    ),
    venezuela: (
      <div className="w-full h-full rounded-[10px] overflow-hidden">
        <div className="h-1/3 bg-[#fcdd09]" />
        <div className="h-1/3 bg-[#0033a0]" />
        <div className="h-1/3 bg-[#dc251c]" />
      </div>
    ),
    bangladesh: (
      <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#006a4e] flex items-center justify-center">
        <div className="w-[40%] aspect-square rounded-full bg-[#f42a41] -ml-2" />
      </div>
    ),
  };

  return (
    <div className="w-[100px] h-[75px] flex-shrink-0">
      {flagStyles[code] || (
        <div className="w-full h-full rounded-[10px] bg-gray-700 flex items-center justify-center">
          <span className="text-xs text-white">{name}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Supported Cultures section showing a grid of country flags.
 */
export function SupportedCulturesSection({
  className,
}: SupportedCulturesSectionProps): JSX.Element {
  const row1Countries = [
    { name: 'Germany', code: 'germany' },
    { name: 'England', code: 'england' },
    { name: 'USA', code: 'usa' },
    { name: 'Hungary', code: 'hungary' },
    { name: 'Ivory Coast', code: 'ivory-coast' },
    { name: 'Norway', code: 'norway' },
    { name: 'Puerto Rico', code: 'puerto-rico' },
    { name: 'South Africa', code: 'south-africa' },
    { name: 'Czech Republic', code: 'czech-republic' },
    { name: 'Ghana', code: 'ghana' },
  ];

  const row2Countries = [
    { name: 'Japan', code: 'japan' },
    { name: 'India', code: 'india' },
    { name: 'Paraguay', code: 'paraguay' },
    { name: 'Venezuela', code: 'venezuela' },
    { name: 'Bangladesh', code: 'bangladesh' },
    { name: 'Latvia', code: 'latvia' },
    { name: 'Yemen', code: 'yemen' },
  ];

  return (
    <section id="cultures" className={cn('py-10 px-4', className)}>
      <div className="max-w-[1170px] mx-auto">
        <div className="bg-[#111419] border border-white/12 rounded-[14px] px-10 py-[30px]">
          {/* Badge */}
          <div className="mb-[30px]">
            <div className="inline-flex bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <span className="text-base text-white">Supported cultures</span>
            </div>
          </div>

          {/* Flag Grid */}
          <div className="flex flex-col gap-[30px]">
            {/* Row 1 */}
            <div className="flex flex-wrap gap-[10px]">
              {row1Countries.map((country) => (
                <CountryFlag key={country.code} {...country} />
              ))}
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap gap-[10px]">
              {row2Countries.map((country) => (
                <CountryFlag key={country.code} {...country} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
