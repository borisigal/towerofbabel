'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorMessageProps {
  error: {
    code: string;
    message: string;
  };
  onRetry?: () => void;
}

/**
 * Displays user-friendly error messages with actionable guidance.
 * Translates technical error codes into helpful messages without jargon.
 *
 * Supported error codes:
 * - LIMIT_EXCEEDED: User has exhausted message quota
 * - RATE_LIMITED: Too many requests in time window
 * - UNAUTHORIZED: Session expired or invalid
 * - INVALID_INPUT: Invalid message or culture selection
 * - SERVICE_OVERLOADED: System experiencing high load
 * - INTERNAL_ERROR: Unexpected server error
 *
 * @param error - Error object with code and message
 * @param onRetry - Optional callback to retry the failed operation
 *
 * @example
 * ```tsx
 * <ErrorMessage
 *   error={{ code: 'LIMIT_EXCEEDED', message: 'Quota exceeded' }}
 *   onRetry={() => retryInterpretation()}
 * />
 * ```
 */
export function ErrorMessage({ error, onRetry }: ErrorMessageProps): JSX.Element {
  const getUserFriendlyMessage = (
    code: string
  ): { title: string; description: string; action?: string } => {
    switch (code) {
      case 'LIMIT_EXCEEDED':
        return {
          title: 'Message Limit Reached',
          description:
            "You've used all your free messages. Upgrade to Pro for unlimited interpretations.",
          action: 'View Pricing',
        };
      case 'RATE_LIMITED':
        return {
          title: 'Too Many Requests',
          description:
            'Please wait a moment before trying again. This helps us keep the service fast for everyone.',
          action: 'Try Again in 30s',
        };
      case 'UNAUTHORIZED':
        return {
          title: 'Session Expired',
          description: 'Your session has expired. Please sign in again to continue.',
          action: 'Sign In',
        };
      case 'INVALID_INPUT':
        return {
          title: 'Invalid Message',
          description: 'Please check your message and culture selections, then try again.',
          action: 'Edit Message',
        };
      case 'SERVICE_OVERLOADED':
        return {
          title: 'Service Temporarily Unavailable',
          description: "We're experiencing high demand. Please try again in a few moments.",
          action: 'Retry',
        };
      case 'INTERNAL_ERROR':
      default:
        return {
          title: 'Something Went Wrong',
          description:
            'We encountered an unexpected error. Our team has been notified. Please try again.',
          action: 'Retry',
        };
    }
  };

  const { title, description, action } = getUserFriendlyMessage(error.code);

  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        {onRetry && action && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-sm"
          >
            {action}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
