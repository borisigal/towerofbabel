/**
 * User-friendly success messages for toast notifications.
 * Used throughout the application to provide consistent, helpful feedback.
 *
 * Usage:
 * ```tsx
 * import { useToast } from '@/components/ui/use-toast';
 * import { SUCCESS_MESSAGES } from '@/lib/constants/successMessages';
 *
 * const { toast } = useToast();
 * toast(SUCCESS_MESSAGES.SIGN_IN);
 * ```
 */
export const SUCCESS_MESSAGES = {
  SIGN_IN: {
    title: 'Signed in successfully',
    description: 'Welcome back to TowerOfBabel!',
  },
  SIGN_UP: {
    title: 'Account created',
    description: 'Check your email for the magic link to sign in.',
  },
  SUBSCRIPTION_SUCCESS: {
    title: 'Welcome to Pro!',
    description: 'You now have unlimited interpretations. Start exploring!',
  },
  FEEDBACK_SUBMITTED: {
    title: 'Thanks for your feedback!',
    description: 'Your input helps us improve interpretation quality.',
  },
  INTERPRETATION_SAVED: {
    title: 'Interpretation complete',
    description: 'Your results are ready below.',
  },
} as const;

/**
 * Type for success message keys.
 * Useful for ensuring type safety when referencing success messages.
 */
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;
