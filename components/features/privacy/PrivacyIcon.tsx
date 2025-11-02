import React from 'react';
import { Lock } from 'lucide-react';

interface PrivacyIconProps {
  className?: string;
}

/**
 * Lock icon for privacy badge.
 * Uses Lucide React's Lock component for consistency with shadcn/ui.
 *
 * @param className - Optional CSS classes for styling
 */
export function PrivacyIcon({ className }: PrivacyIconProps): React.JSX.Element {
  return <Lock className={className} aria-hidden="true" />;
}
