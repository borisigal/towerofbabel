'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CultureSelector } from './CultureSelector';
import { type CultureCode } from '@/lib/types/models';

/**
 * Form data structure for interpretation request.
 * Matches InterpretationRequest type from models.ts (mode is fixed to 'inbound').
 */
interface InterpretationFormData {
  message: string;
  sender_culture: CultureCode | '';
  receiver_culture: CultureCode | '';
}

/**
 * Main interpretation form component for dashboard.
 *
 * Features:
 * - Large textarea for message input (max 2000 characters)
 * - Real-time character counter with warning state
 * - Two culture selector dropdowns (sender/receiver)
 * - Form validation (message length, culture selection)
 * - Loading state during submission
 * - Fully responsive design (mobile, tablet, desktop)
 * - WCAG 2.1 AA accessible (keyboard navigation, screen reader support)
 *
 * Story 2.1: UI only, console.log submission
 * Story 2.3: Will integrate with /api/interpret endpoint
 */
export function InterpretationForm(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InterpretationFormData>({
    defaultValues: {
      message: '',
      sender_culture: 'american',
      receiver_culture: 'american',
    },
  });

  // Watch message for real-time character counter
  const message = watch('message') || '';
  const characterCount = message.length;
  const isOverLimit = characterCount > 2000;

  // Watch cultures for form validation
  const senderCulture = watch('sender_culture');
  const receiverCulture = watch('receiver_culture');

  // Form is valid when: message not empty, ≤2000 chars, both cultures selected
  const isFormValid =
    message.length > 0 &&
    message.length <= 2000 &&
    senderCulture !== '' &&
    receiverCulture !== '';

  /**
   * Form submission handler.
   * TODO: Story 2.3 - Replace console.log with API call to /api/interpret
   */
  const onSubmit = async (data: InterpretationFormData): Promise<void> => {
    if (!isFormValid) return;

    setIsLoading(true);

    try {
      // TODO: Story 2.3 - Call /api/interpret endpoint
      // const response = await fetch('/api/interpret', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     message: data.message,
      //     sender_culture: data.sender_culture,
      //     receiver_culture: data.receiver_culture,
      //     mode: 'inbound',
      //   }),
      // });
      //
      // const result = await response.json();
      // if (result.success) {
      //   // Story 2.4 will handle result display
      // }

      console.log('Submitting interpretation request:', {
        message: data.message,
        sender_culture: data.sender_culture,
        receiver_culture: data.receiver_culture,
        mode: 'inbound',
      });

      // Simulate API call delay for testing loading state
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('Interpretation request completed (simulated)');
    } catch (error) {
      console.error('Interpretation failed:', error);
      // Story 2.4 will handle error display
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-6 text-foreground">
          Interpret Message
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Message Textarea with Character Counter */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-base font-medium">
              Message to Interpret
            </Label>
            <Textarea
              id="message"
              placeholder="Paste the message you want to interpret..."
              className="min-h-[150px] sm:min-h-[200px] resize-none"
              aria-label="Message to interpret"
              aria-describedby="character-counter"
              disabled={isLoading}
              {...register('message', {
                required: 'Message is required',
                maxLength: {
                  value: 2000,
                  message: 'Message must be 2000 characters or less',
                },
              })}
            />

            {/* Character Counter */}
            <div
              id="character-counter"
              aria-live="polite"
              className={`text-sm ${
                isOverLimit
                  ? 'text-destructive font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              {characterCount} / 2,000 characters
              {isOverLimit && ' - Message too long'}
            </div>

            {errors.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.message.message}
              </p>
            )}
          </div>

          {/* Culture Selectors - Stack on mobile, side-by-side on desktop */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="sender-culture" className="text-base font-medium">
                Sender&apos;s Culture
              </Label>
              <CultureSelector
                id="sender-culture"
                value={senderCulture as CultureCode}
                onChange={(value) => setValue('sender_culture', value)}
                disabled={isLoading}
                aria-label="Sender's culture"
                placeholder="Select sender's culture"
              />
              {errors.sender_culture && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.sender_culture.message}
                </p>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <Label
                htmlFor="receiver-culture"
                className="text-base font-medium"
              >
                Receiver&apos;s Culture
              </Label>
              <CultureSelector
                id="receiver-culture"
                value={receiverCulture as CultureCode}
                onChange={(value) => setValue('receiver_culture', value)}
                disabled={isLoading}
                aria-label="Receiver's culture"
                placeholder="Select receiver's culture"
              />
              {errors.receiver_culture && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.receiver_culture.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button with Loading State and Tooltip */}
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="submit"
                      disabled={!isFormValid || isLoading}
                      className="w-full sm:w-auto min-h-[44px] px-6"
                      aria-live="polite"
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isLoading ? 'Interpreting...' : 'Interpret'}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!isFormValid && !isLoading && (
                  <TooltipContent>
                    <p>
                      {isOverLimit
                        ? 'Message too long. Please shorten to 2,000 characters or less.'
                        : message.length === 0
                          ? 'Please enter a message to interpret.'
                          : !senderCulture || !receiverCulture
                            ? 'Please select both sender and receiver cultures.'
                            : 'Please complete all fields.'}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </form>
      </div>
    </div>
  );
}
