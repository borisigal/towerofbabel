'use client';

import React from 'react';
import Link from 'next/link';
import { PrivacyIcon } from './PrivacyIcon';

interface PrivacyBadgeProps {
  variant?: 'landing' | 'footer' | 'mobile';
  providerName: string;
}

/**
 * Privacy badge component that displays provider info and links to privacy page.
 * Adapts layout based on variant (landing, footer, mobile).
 *
 * @param variant - Display variant (landing, footer, mobile)
 * @param providerName - Current LLM provider name (e.g., "OpenAI", "Anthropic")
 */
export function PrivacyBadge({
  variant: _variant = 'footer',
  providerName,
}: PrivacyBadgeProps): React.JSX.Element {
  const badgeText = `Processed by ${providerName} • No message storage by TowerOfBabel`;

  return (
    <Link
      href="/privacy"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      aria-label="View privacy policy and provider information"
    >
      <PrivacyIcon className="h-4 w-4" />
      <span>{badgeText}</span>
    </Link>
  );
}
