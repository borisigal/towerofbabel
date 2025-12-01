'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

/**
 * Landing page header with navigation and CTA buttons.
 * Features glassmorphism design with transparent background.
 */
export function Header({ className }: HeaderProps): JSX.Element {
  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Solution', href: '#solutions' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
  ];

  return (
    <header
      className={cn(
        'sticky top-4 z-50 mx-auto max-w-[1169px] rounded-full',
        'bg-white/5 border border-white/10 backdrop-blur-md',
        'flex items-center justify-between px-5 py-2.5',
        className
      )}
    >
      {/* Logo */}
      <Link href="/" className="text-2xl md:text-[32px] font-bold text-white leading-[44px]">
        TowerOfBabel
      </Link>

      {/* Navigation - Hidden on mobile */}
      <nav className="hidden lg:flex items-center gap-7">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-base text-white hover:text-white/80 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Auth Buttons */}
      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className="hidden sm:block text-base text-white hover:text-white/80 transition-colors"
        >
          Login / Sign Up
        </Link>
        <Link
          href="/sign-in"
          className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 transition-colors rounded-full px-4 py-2.5 h-12"
        >
          <span className="text-base font-semibold text-white">Try for Free</span>
          <ChevronRight className="w-5 h-5 text-white" />
        </Link>
      </div>
    </header>
  );
}
