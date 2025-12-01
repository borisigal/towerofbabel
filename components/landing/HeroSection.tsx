'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  className?: string;
}

/**
 * Hero section with headline, subheadline, CTA button, floating flags, and chat bubble.
 * Matches the provided design with gradient background and glassmorphism effects.
 */
export function HeroSection({ className }: HeroSectionProps): JSX.Element {
  return (
    <section
      id="hero"
      className={cn('relative min-h-screen overflow-hidden bg-[#080a0f]', className)}
    >
      {/* Purple gradient blur - top left */}
      <div 
        className="absolute left-[-76px] top-[42px] w-[406px] h-[406px] rounded-full opacity-100"
        style={{
          background: '#7C3AED',
          filter: 'blur(232px)',
        }}
      />

      {/* Blue gradient blur - bottom right */}
      <div 
        className="absolute left-[1109px] top-[284px] w-[416px] h-[416px] rounded-full opacity-100"
        style={{
          background: '#3B82F6',
          filter: 'blur(232px)',
        }}
      />

      {/* Header */}
      <header className="relative mx-auto max-w-[1169px] mt-[30px] px-5 lg:px-0">
        <div className="flex items-center justify-between h-[68px] px-5 rounded-[50px] border border-white/10 bg-white/5 backdrop-blur-md">
          {/* Logo */}
          <Link href="/" className="text-[32px] font-bold text-white leading-[44px]">
            TowerOfBabel
          </Link>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-[29px]">
            <Link href="#hero" className="text-base text-white leading-[26px] hover:text-white/80 transition-colors">
              Home
            </Link>
            <Link href="#solutions" className="text-base text-white leading-[26px] hover:text-white/80 transition-colors">
              Solution
            </Link>
            <Link href="#how-it-works" className="text-base text-white leading-[26px] hover:text-white/80 transition-colors">
              How It Works
            </Link>
            <Link href="#features" className="text-base text-white leading-[26px] hover:text-white/80 transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-base text-white leading-[26px] hover:text-white/80 transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden sm:block text-base text-white leading-[26px] hover:text-white/80 transition-colors"
            >
              Login / Sign Up
            </Link>
            <Link
              href="/sign-in"
              className="flex items-center gap-1 bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors rounded-[40px] px-[22px] py-[13px] h-[48px]"
            >
              <span className="text-base font-semibold text-white leading-[22px]">Try for Free</span>
              <ChevronRight className="w-5 h-5 text-white" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative mx-auto max-w-[943px] mt-[164px] px-5 lg:px-0">
        <div className="flex flex-col items-center gap-6">
          {/* Badge */}
          <div className="flex items-center justify-center px-[10px] py-[5px] rounded-[50px] border border-white/10 bg-white/5">
            <span className="text-base text-white leading-[26px]">Cross Cultural Communication</span>
          </div>

          {/* Headline */}
          <h1 className="text-[64px] font-bold text-center text-white leading-[77px] w-full">
            <span className="font-light">Understand What They Really </span>
            <span className="font-bold">Mean Across Cultures</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-center text-white leading-[30px] max-w-[859px]">
            AI-powered cultural interpretation that reveals hidden meanings, emotions, and communication styles before you hit send.
          </p>

          {/* CTA Button */}
          <Link
            href="/sign-in"
            className="flex items-center gap-1 bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors rounded-[40px] px-9 py-4 h-14"
          >
            <span className="text-base font-semibold text-white leading-[22px]">Try Free - No Credit Card</span>
            <ChevronRight className="w-5 h-5 text-white" />
          </Link>
        </div>
      </div>

      {/* Floating Flags */}
      <div className="hidden xl:block">
        {/* Japan Flag */}
        <div className="absolute left-[1215px] top-[534px] w-[55px] h-[41px] rounded-[2.75px] bg-[#F5F8FB] flex items-center justify-center">
          <div className="w-[24px] h-[24px] rounded-full bg-[#DC251C]" />
        </div>

        {/* USA Flag */}
        <div className="absolute left-[959px] top-[605px] w-[44px] h-[30px] rounded-sm overflow-hidden">
          <div className="absolute inset-0 bg-[#EEF3F8]" />
          <div className="absolute top-0 left-0 w-[25px] h-[19px] bg-[#41479B]" />
          <div className="absolute top-0 left-[25px] w-[19px] h-[3px] bg-[#DC251C]" />
          <div className="absolute top-[5px] left-[25px] w-[19px] h-[3px] bg-[#DC251C]" />
          <div className="absolute top-[11px] left-[25px] w-[19px] h-[3px] bg-[#DC251C]" />
          <div className="absolute top-[16px] left-[25px] w-[19px] h-[3px] bg-[#DC251C]" />
          <div className="absolute top-[22px] left-0 w-[44px] h-[3px] bg-[#DC251C]" />
          <div className="absolute top-[27px] left-0 w-[44px] h-[3px] bg-[#DC251C]" />
          
          {/* Stars on blue canton */}
          <div className="absolute top-[3px] left-[3px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[3px] left-[8px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[3px] left-[14px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[3px] left-[19px] w-[3px] h-[3px] bg-[#7C3AED]" />
          
          <div className="absolute top-[6px] left-[0px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[6px] left-[5px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[6px] left-[11px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[6px] left-[16px] w-[3px] h-[3px] bg-[#7C3AED]" />
          
          <div className="absolute top-[9px] left-[3px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[9px] left-[8px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[9px] left-[14px] w-[3px] h-[3px] bg-[#7C3AED]" />
          
          <div className="absolute top-[12px] left-[0px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[12px] left-[5px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[12px] left-[11px] w-[3px] h-[3px] bg-[#7C3AED]" />
          <div className="absolute top-[12px] left-[16px] w-[3px] h-[3px] bg-[#7C3AED]" />
        </div>
      </div>

      {/* Chat Bubble */}
      <div className="hidden xl:block absolute left-[810px] top-[805px] w-[342px] h-[106px]">
        <div 
          className="rounded-tl-[3px] rounded-tr-[14px] rounded-bl-[14px] rounded-br-[14px] border border-[#7C3AED]/50 px-[22px] py-5"
          style={{
            background: 'linear-gradient(95deg, #793DED 1.29%, rgba(121, 61, 237, 0.00) 105.47%), #111419',
          }}
        >
          <div className="flex items-center gap-3 mb-2.5">
            <svg className="w-[30px] h-[30px]" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.000718632 15C0.000642116 13.4029 0.000603858 12.6043 0.0691587 11.9321C0.708384 5.66402 5.66406 0.708112 11.9321 0.0685871C12.6043 0 13.4026 0 14.9993 0C16.5959 0 17.3942 0 18.0665 0.0685871C24.3346 0.708112 29.2907 5.66402 29.9305 11.9321C29.9992 12.6043 29.9992 13.4029 29.9993 15C29.9994 16.5971 29.9994 17.3957 29.9308 18.0679C29.2916 24.336 24.3359 29.2919 18.0679 29.9314C17.3957 30 16.5974 30 15.0007 30C13.4041 30 12.6058 30 11.9335 29.9314C5.66543 29.2919 0.709279 24.336 0.0694528 18.0679C0.000833406 17.3957 0.000795148 16.5971 0.000718632 15Z" fill="#EBEBEB"/>
              <path d="M14.2431 12.9056C14.2431 15.2822 12.3166 17.2089 9.94004 17.2089C7.56351 17.2089 5.63696 15.2822 5.63696 12.9056C5.63696 10.529 7.56351 8.60232 9.94004 8.60232C12.3166 8.60232 14.2431 10.529 14.2431 12.9056Z" fill="white"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M9.94004 16.7171C12.045 16.7171 13.7513 15.0106 13.7513 12.9056C13.7513 10.8006 12.045 9.09413 9.94004 9.09413C7.83512 9.09413 6.12874 10.8006 6.12874 12.9056C6.12874 15.0106 7.83512 16.7171 9.94004 16.7171ZM9.94004 17.2089C12.3166 17.2089 14.2431 15.2822 14.2431 12.9056C14.2431 10.529 12.3166 8.60232 9.94004 8.60232C7.56351 8.60232 5.63696 10.529 5.63696 12.9056C5.63696 15.2822 7.56351 17.2089 9.94004 17.2089Z" fill="black"/>
              <path d="M23.341 12.9056C23.341 15.2822 21.4145 17.2089 19.0379 17.2089C16.6614 17.2089 14.7349 15.2822 14.7349 12.9056C14.7349 10.529 16.6614 8.60232 19.0379 8.60232C21.4145 8.60232 23.341 10.529 23.341 12.9056Z" fill="white"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M19.0379 16.7171C21.1429 16.7171 22.8492 15.0106 22.8492 12.9056C22.8492 10.8006 21.1429 9.09413 19.0379 9.09413C16.933 9.09413 15.2266 10.8006 15.2266 12.9056C15.2266 15.0106 16.933 16.7171 19.0379 16.7171ZM19.0379 17.2089C21.4145 17.2089 23.341 15.2822 23.341 12.9056C23.341 10.529 21.4145 8.60232 19.0379 8.60232C16.6614 8.60232 14.7349 10.529 14.7349 12.9056C14.7349 15.2822 16.6614 17.2089 19.0379 17.2089Z" fill="black"/>
              <path d="M10.8007 10.4466C10.8007 11.3293 10.0851 12.045 9.20241 12.045C8.3197 12.045 7.60413 11.3293 7.60413 10.4466C7.60413 9.56384 8.3197 8.84823 9.20241 8.84823C10.0851 8.84823 10.8007 9.56384 10.8007 10.4466Z" fill="black"/>
              <path d="M19.8985 10.4466C19.8985 11.3293 19.1829 12.045 18.3002 12.045C17.4175 12.045 16.7019 11.3293 16.7019 10.4466C16.7019 9.56384 17.4175 8.84823 18.3002 8.84823C19.1829 8.84823 19.8985 9.56384 19.8985 10.4466Z" fill="black"/>
              <path d="M9.57125 9.95478C9.57125 10.2943 9.29602 10.5695 8.95652 10.5695C8.61702 10.5695 8.3418 10.2943 8.3418 9.95478C8.3418 9.61527 8.61702 9.34003 8.95652 9.34003C9.29602 9.34003 9.57125 9.61527 9.57125 9.95478Z" fill="white"/>
              <path d="M18.669 9.95478C18.669 10.2943 18.3938 10.5695 18.0543 10.5695C17.7148 10.5695 17.4396 10.2943 17.4396 9.95478C17.4396 9.61527 17.7148 9.34003 18.0543 9.34003C18.3938 9.34003 18.669 9.61527 18.669 9.95478Z" fill="white"/>
            </svg>
            <span className="text-sm font-bold text-white leading-[22px]">TowerOfBabel</span>
          </div>
          <p className="text-base font-bold text-white leading-[26px]">
            Actually, this is normal directness
          </p>
        </div>
      </div>
    </section>
  );
}
