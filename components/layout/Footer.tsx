'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PrivacyBadge } from '@/components/features/privacy/PrivacyBadge';

/**
 * Footer component displayed on all pages except landing page.
 * Client Component (uses Link for navigation and usePathname for route detection).
 *
 * Includes:
 * - Footer navigation links (About, Privacy, Terms, Contact)
 * - Privacy badge with provider disclosure
 * - Copyright text
 *
 * Responsive layout: horizontal on desktop, vertical stack on mobile.
 * Hidden on landing page (/) which has its own integrated footer.
 *
 * @see components/features/privacy/PrivacyBadge.tsx
 * @see docs/stories/5.1.story.md#task-6
 */
export function Footer(): React.JSX.Element | null {
  const pathname = usePathname();
  const providerName = process.env.NEXT_PUBLIC_LLM_PROVIDER_NAME || 'OpenAI';

  // Don't render on pages with custom styling (landing page, sign-in)
  if (pathname === '/' || pathname === '/sign-in') {
    return null;
  }

  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Footer Navigation */}
        <nav className="flex flex-wrap justify-center gap-6 mb-4">
          <Link
            href="/about"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/contact"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Privacy Badge */}
        <div className="flex justify-center mb-4">
          <PrivacyBadge variant="footer" providerName={providerName} />
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TowerOfBabel. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
