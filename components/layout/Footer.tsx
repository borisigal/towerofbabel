'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';

/**
 * Footer content - the actual footer UI without conditional rendering.
 * Used by both Footer and DashboardFooter.
 */
function FooterContent(): React.JSX.Element {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Processed by Anthropic - No message storage by TowerOfBabel</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Copyright {new Date().getFullYear()} TowerOfBabel</span>
            <span>|</span>
            <span>All Rights Reserved</span>
            <span>|</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms and Conditions
            </Link>
            <span>|</span>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Dashboard Footer - always renders, used inside dashboard layout.
 */
export function DashboardFooter(): React.JSX.Element {
  return <FooterContent />;
}

/**
 * Footer component displayed on pages except landing, sign-in, dashboard.
 * Client Component (uses usePathname for route detection).
 *
 * Hidden on landing page (/) and sign-in which have their own footers.
 * Hidden on dashboard/settings which use DashboardFooter in layout.
 */
export function Footer(): React.JSX.Element | null {
  const pathname = usePathname();

  // Don't render on pages with custom styling
  if (pathname === '/' || pathname === '/sign-in' || pathname?.startsWith('/dashboard') || pathname?.startsWith('/settings')) {
    return null;
  }

  return <FooterContent />;
}
