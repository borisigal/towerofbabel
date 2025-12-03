'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { useUpgradeModalStore } from '@/lib/stores/upgradeModalStore';
import { ChevronRight, ChevronDown, Clock, Menu, X } from 'lucide-react';

/**
 * Dashboard Navigation Component
 *
 * Two-part navigation:
 * 1. Trial banner (shown for trial users) - displays days remaining and upgrade CTA
 * 2. Main nav bar with logo and user menu
 *
 * Client Component - Uses state for dropdown menu.
 *
 * @example
 * ```tsx
 * <DashboardNav userName="Jeson Karly" userEmail="jeson@example.com" />
 * ```
 */

interface DashboardNavProps {
  /** User's display name (optional) */
  userName?: string | null;
  /** User's email address */
  userEmail: string;
}

/**
 * Get initials from a name string.
 * Returns first letter of first name + first letter of last name.
 * Falls back to first two letters of email if no name.
 */
function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstPart = parts[0];
      const lastPart = parts[parts.length - 1];
      if (firstPart && lastPart && firstPart[0] && lastPart[0]) {
        return (firstPart[0] + lastPart[0]).toUpperCase();
      }
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Calculate days remaining in trial.
 * Trial period is 14 days from account creation.
 */
function getTrialDaysRemaining(): number {
  // For now, return a static value. In production, this would be calculated
  // from user.trial_ends_at or similar field
  return 6;
}

export function DashboardNav({ userName, userEmail }: DashboardNavProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { setOpen } = useUpgradeModalStore();

  const displayName = userName || userEmail;
  const initials = getInitials(userName, userEmail);
  const trialDaysRemaining = getTrialDaysRemaining();

  // Trial banner temporarily disabled
  const showTrialBanner = false;

  return (
    <>
      {/* Trial Banner - Only shown for trial users, hidden on pricing page */}
      {showTrialBanner && (
        <div className="bg-[hsl(210,60%,25%)] text-white py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>
              You have <strong>{trialDaysRemaining} days</strong> left in your trial
            </span>
            <button
              onClick={() => setOpen(true, 'proactive')}
              className="flex items-center gap-1 text-white font-medium hover:underline ml-2"
            >
              Upgrade Now
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="sticky top-0 z-50 bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo / App Name */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">
                TowerOfBabel
              </h1>
            </div>

            {/* Desktop: User Menu */}
            <div className="hidden sm:flex items-center gap-3">
              {/* User Avatar with Initials + Name + Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  {/* Avatar Circle with Initials */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                    {initials}
                  </div>
                  <span className="text-white text-sm font-medium">{displayName}</span>
                  <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <>
                    {/* Backdrop to close menu on outside click */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-[hsl(220,40%,20%)] border border-white/10 rounded-lg shadow-lg z-20 py-1">
                      <Link
                        href="/pricing"
                        className="block w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Pricing
                      </Link>
                      <SignOutButton className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white" />
                    </div>
                  </>
                )}
              </div>

              {/* Menu Icon */}
              <button
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Mobile: Hamburger Menu */}
            <div className="sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-white" />
                ) : (
                  <Menu className="h-6 w-6 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="sm:hidden border-t border-white/10 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                  {initials}
                </div>
                <div>
                  <div className="text-white font-medium">{displayName}</div>
                  <div className="text-white/60 text-sm">{userEmail}</div>
                </div>
              </div>
              <Link
                href="/pricing"
                className="block w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <SignOutButton className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 rounded-lg" />
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
