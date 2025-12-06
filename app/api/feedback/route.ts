/**
 * POST /api/feedback - Interpretation Feedback API Route
 *
 * Submits user feedback (thumbs up/down) for an interpretation.
 *
 * Authentication: Required (Supabase session)
 * Authorization: User must own the interpretation
 * Idempotency: Feedback cannot be changed once submitted
 * Privacy: Links only to interpretation_id (no message content)
 *
 * @see docs/stories/4.4.story.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import prisma from '@/lib/db/prisma';
import { logger } from '@/lib/observability/logger';
import { z } from 'zod';

/**
 * Request body validation schema
 *
 * feedback_text is optional and limited to 500 characters.
 * Character limit chosen for concise, actionable feedback without overwhelming PMs.
 */
const FeedbackRequestSchema = z.object({
  interpretationId: z.string().uuid('Invalid interpretation ID format'),
  feedback: z.enum(['up', 'down']),
  feedback_text: z
    .string()
    .max(500, 'Feedback text must be 500 characters or less')
    .optional(),
});

/**
 * Sanitizes user-provided feedback text to prevent XSS attacks.
 * Strips HTML tags and trims whitespace.
 *
 * @param text - User-provided feedback text (optional)
 * @returns Sanitized text or null if empty
 */
function sanitizeFeedbackText(text: string | undefined): string | null {
  if (!text || text.trim() === '') return null;

  // Strip HTML tags to prevent XSS
  const sanitized = text.replace(/<[^>]*>/g, '').trim();

  return sanitized.length > 0 ? sanitized : null;
}

/**
 * POST /api/feedback
 *
 * Submits user feedback (thumbs up/down) for an interpretation.
 *
 * @param req - Next.js request with { interpretationId, feedback }
 * @returns JSON response with success/error
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // 1. AUTHENTICATION - Check user session
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn({
        error: authError?.message,
      }, 'Feedback submission - Unauthorized');

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // 2. REQUEST VALIDATION
    const body = await req.json();

    const validationResult = FeedbackRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn({
        user_id: user.id,
        errors: validationResult.error.issues,
      }, 'Feedback submission - Invalid input');

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: validationResult.error.issues[0]?.message || 'Invalid input',
          },
        },
        { status: 400 }
      );
    }

    const { interpretationId, feedback, feedback_text } = validationResult.data;

    // 3. AUTHORIZATION - Verify interpretation exists and belongs to user
    const interpretation = await prisma.interpretation.findUnique({
      where: { id: interpretationId },
      select: {
        id: true,
        user_id: true,
        feedback: true,
        feedback_timestamp: true,
      },
    });

    if (!interpretation) {
      logger.warn({
        user_id: user.id,
        interpretationId,
      }, 'Feedback submission - Interpretation not found');

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Interpretation not found',
          },
        },
        { status: 404 }
      );
    }

    if (interpretation.user_id !== user.id) {
      logger.warn({
        user_id: user.id,
        interpretation_owner: interpretation.user_id,
        interpretationId,
      }, 'Feedback submission - Unauthorized access');

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You do not have permission to provide feedback for this interpretation',
          },
        },
        { status: 401 }
      );
    }

    // 4. IDEMPOTENCY CHECK - Feedback already submitted?
    if (interpretation.feedback) {
      logger.info({
        user_id: user.id,
        interpretationId,
        existingFeedback: interpretation.feedback,
        attemptedFeedback: feedback,
      }, 'Feedback submission - Already submitted');

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_SUBMITTED',
            message: 'Feedback already submitted for this interpretation',
          },
        },
        { status: 400 }
      );
    }

    // 5. UPDATE DATABASE - Store feedback, text (sanitized), and timestamp atomically
    const feedbackTimestamp = new Date();
    const sanitizedText = sanitizeFeedbackText(feedback_text);

    await prisma.interpretation.update({
      where: { id: interpretationId },
      data: {
        feedback,
        feedback_text: sanitizedText,
        feedback_timestamp: feedbackTimestamp,
      },
    });

    const responseTimeMs = Date.now() - startTime;

    logger.info({
      user_id: user.id,
      interpretationId,
      feedback,
      response_time_ms: responseTimeMs,
    }, 'Feedback submitted successfully');

    // 6. RESPONSE
    return NextResponse.json(
      {
        success: true,
        data: {
          interpretationId,
          feedback,
          timestamp: feedbackTimestamp.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: responseTimeMs,
    }, 'Feedback submission - Server error');

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}
