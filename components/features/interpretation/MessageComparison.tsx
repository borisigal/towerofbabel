'use client';

import React from 'react';

interface MessageComparisonProps {
  originalMessage: string;
  optimizedMessage: string;
}

/**
 * Message Comparison Component
 *
 * Displays original and optimized messages side-by-side (desktop) or stacked (mobile).
 *
 * Features:
 * - Responsive layout: side-by-side (≥1024px) / stacked (<1024px)
 * - Scrollable panels for long messages
 * - Visual separation with borders and background colors
 * - Clear headings for each panel
 *
 * @param originalMessage - User's original message
 * @param optimizedMessage - AI-optimized message
 *
 * @example
 * ```tsx
 * <MessageComparison
 *   originalMessage="Can you finish this by tomorrow?"
 *   optimizedMessage="I apologize for the short notice, but we have a client..."
 * />
 * ```
 */
export function MessageComparison({
  originalMessage,
  optimizedMessage,
}: MessageComparisonProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Panel: Original Message */}
      <div
        className="bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg p-4"
        role="region"
        aria-label="Original message"
      >
        <h3 className="text-lg font-semibold mb-3 text-foreground">
          📝 Your Original Message
        </h3>
        <div className="max-h-[300px] overflow-y-auto">
          <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {originalMessage}
          </p>
        </div>
      </div>

      {/* Right Panel: Optimized Message */}
      <div
        className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4"
        role="region"
        aria-label="Optimized message"
      >
        <h3 className="text-lg font-semibold mb-3 text-foreground">
          ✨ Culturally Optimized Version
        </h3>
        <div className="max-h-[300px] overflow-y-auto">
          <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {optimizedMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
