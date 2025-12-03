'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OutboundAnalysis } from './OutboundAnalysis';
import { FeedbackButtons } from './FeedbackButtons';
import { type OutboundInterpretationResponse } from '@/lib/llm/types';
import { type Emotion, type CultureCode } from '@/lib/types/models';

interface OutboundResultProps {
  result: OutboundInterpretationResponse;
  originalMessage: string;
  messagesRemaining?: number;
  interpretationId?: string;
  senderCulture?: CultureCode;
  receiverCulture?: CultureCode;
}

/**
 * Outbound Result Display Component
 *
 * Displays outbound optimization results with side-by-side message comparison.
 *
 * Features:
 * - Side-by-side layout (desktop) / Stacked layout (mobile)
 * - Original message vs optimized message comparison
 * - Copy to clipboard functionality
 * - Analysis section with originalAnalysis, suggestions, and emotions
 * - Responsive design (mobile/tablet/desktop)
 * - Reuses EmotionGauge component from inbound
 *
 * @param result - Outbound interpretation result from API
 * @param originalMessage - User's original message (from form state)
 * @param messagesRemaining - Optional count of remaining messages
 *
 * @example
 * ```tsx
 * <OutboundResult
 *   result={{
 *     originalAnalysis: "The receiver will perceive this as...",
 *     suggestions: ["Add more context", "Use softer tone", "Be more specific"],
 *     optimizedMessage: "I would appreciate...",
 *     emotions: [...]
 *   }}
 *   originalMessage="Can you finish this by tomorrow?"
 *   messagesRemaining={9}
 * />
 * ```
 */
export function OutboundResult({
  result,
  originalMessage: _originalMessage,
  messagesRemaining,
  interpretationId,
  senderCulture,
  receiverCulture,
}: OutboundResultProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const { originalAnalysis, suggestions, optimizedMessage, emotions } = result;

  // Determine if this is same-culture interpretation
  // Same culture = receiverScore is undefined for all emotions
  const sameCulture = emotions.length > 0 && emotions[0]?.receiverScore === undefined;

  /**
   * Copies optimized message to clipboard.
   * Shows success confirmation for 2 seconds.
   * Includes fallback for browsers without Clipboard API support.
   */
  const handleCopyToClipboard = async (): Promise<void> => {
    try {
      // Modern Clipboard API (Chrome 66+, Firefox 63+, Safari 13.1+)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(optimizedMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Fallback for older browsers using execCommand
      const textArea = document.createElement('textarea');
      textArea.value = optimizedMessage;
      textArea.style.position = 'fixed'; // Prevent scrolling
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('execCommand failed');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Show error alert for manual copy
      alert('Failed to copy. Please select and copy manually.');
    }
  };

  return (
    <div className="w-full mx-auto py-4">
      <div className="space-y-6">
        {/* Optimized Message Section */}
        <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
          role="region"
          aria-label="Optimized message"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">
              Culturally Optimized Version
            </h3>
            <Button
              onClick={handleCopyToClipboard}
              disabled={copied}
              variant="outline"
              size="sm"
              className="min-h-[36px] border-white/30 text-white hover:bg-white/10"
              aria-label="Copy optimized message to clipboard"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <p className="text-base leading-relaxed text-white/90 whitespace-pre-wrap">
              {optimizedMessage}
            </p>
          </div>
        </div>

        {/* Analysis Section */}
        <OutboundAnalysis
          originalAnalysis={originalAnalysis}
          suggestions={suggestions}
          emotions={emotions as Emotion[]}
          sameCulture={sameCulture}
          senderCulture={senderCulture}
          receiverCulture={receiverCulture}
        />

        {/* Feedback Buttons Section */}
        {interpretationId && (
          <div className="border-t border-white/10 pt-4">
            <FeedbackButtons interpretationId={interpretationId} />
          </div>
        )}

        {/* Messages Remaining Display */}
        {messagesRemaining !== undefined && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-sm text-white/60 text-center">
              {messagesRemaining} messages remaining
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
