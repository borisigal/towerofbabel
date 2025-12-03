'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PricingSection } from '@/components/landing/PricingSection';
import { UserStatsCard } from '@/components/pricing/UserStatsCard';

/**
 * Pricing Page
 *
 * Displays user statistics and pricing plans for authenticated users.
 * Shows engagement metrics between the header and pricing cards.
 */
export default function PricingPage(): JSX.Element {
  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="max-w-[1170px] mx-auto px-4 py-2">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
              Dashboard
            </Link>
          </li>
          <li>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </li>
          <li className="text-white">Pricing</li>
        </ol>
      </nav>

      <PricingSection headerContent={<UserStatsCard />} />
    </div>
  );
}
