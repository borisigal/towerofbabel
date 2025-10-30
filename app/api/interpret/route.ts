/**
 * POST /api/interpret - Cultural Interpretation API Route
 *
 * Processes user messages through LLM to provide cultural interpretation insights.
 * Integrates LLM service layer (Story 2.2) with authentication, rate limiting,
 * usage tracking, and cost circuit breaker protection (Story 1.5C).
 *
 * **Middleware Chain Order (MANDATORY):**
 * 1. Authentication (Supabase Auth)
 * 2. Rate Limiting (IP-based)
 * 3. Request Validation
 * 4. Authorization (Database query for tier/usage - NOT JWT)
 * 5. Usage Limit Check (tier-specific)
 * 6. Cost Circuit Breaker (CRITICAL risk mitigation)
 * 7. Business Logic (LLM interpretation)
 * 8. Cost Tracking (CRITICAL - immediate after LLM call)
 * 9. Persistence (save metadata, increment usage)
 * 10. Logging (structured, privacy-first)
 * 11. Response (standardized format)
 * 12. Error Handling (specific error types)
 *
 * @see docs/stories/2.3.story.md
 * @see architecture/16-coding-standards.md#api-route-patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import { checkUsageLimit } from '@/lib/services/usageService';
import { checkCostBudget, trackCost } from '@/lib/llm/costCircuitBreaker';
import { createLLMProvider } from '@/lib/llm/factory';
import {
  LLMTimeoutError,
  LLMRateLimitError,
  LLMAuthError,
  LLMParsingError,
  LLMProviderError,
} from '@/lib/llm/errors';
import { createInterpretation } from '@/lib/db/repositories/interpretationRepository';
import { incrementUserUsage } from '@/lib/db/repositories/userRepository';
import { reportInterpretationUsage } from '@/lib/lemonsqueezy/usageReporting';
import { logger } from '@/lib/observability/logger';
import { CULTURES, CultureCode, InterpretationType } from '@/lib/types/models';

/**
 * Request body validation schema.
 * Ensures all required fields are present and valid.
 */
interface InterpretationRequestBody {
  message: string;
  sender_culture: string;
  receiver_culture: string;
  mode: string;
}

/**
 * Validates interpretation request body.
 *
 * Checks:
 * - Required fields present
 * - Message length ≤ 2000 characters
 * - Valid culture codes
 * - Valid mode ('inbound' or 'outbound')
 *
 * @param body - Request body to validate
 * @returns Validation result with success flag and error message
 */
function validateInterpretationRequest(body: unknown): {
  success: boolean;
  error?: string;
  data?: InterpretationRequestBody;
} {
  // Check if body is an object
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be a JSON object' };
  }

  const req = body as InterpretationRequestBody;

  // Check required fields
  if (!req.message || typeof req.message !== 'string') {
    return {
      success: false,
      error: 'Field "message" is required and must be a string',
    };
  }

  if (!req.sender_culture || typeof req.sender_culture !== 'string') {
    return {
      success: false,
      error: 'Field "sender_culture" is required and must be a string',
    };
  }

  if (!req.receiver_culture || typeof req.receiver_culture !== 'string') {
    return {
      success: false,
      error: 'Field "receiver_culture" is required and must be a string',
    };
  }

  if (!req.mode || typeof req.mode !== 'string') {
    return {
      success: false,
      error: 'Field "mode" is required and must be a string',
    };
  }

  // Validate message length
  if (req.message.length > 2000) {
    return {
      success: false,
      error: 'Message must be 2000 characters or less',
    };
  }

  if (req.message.length === 0) {
    return {
      success: false,
      error: 'Message cannot be empty',
    };
  }

  // Validate culture codes
  if (!CULTURES.includes(req.sender_culture as CultureCode)) {
    return {
      success: false,
      error: `Invalid sender_culture: "${req.sender_culture}". Must be one of: ${CULTURES.join(', ')}`,
    };
  }

  if (!CULTURES.includes(req.receiver_culture as CultureCode)) {
    return {
      success: false,
      error: `Invalid receiver_culture: "${req.receiver_culture}". Must be one of: ${CULTURES.join(', ')}`,
    };
  }

  // Validate mode
  if (req.mode !== 'inbound' && req.mode !== 'outbound') {
    return {
      success: false,
      error: 'Field "mode" must be either "inbound" or "outbound"',
    };
  }

  return { success: true, data: req };
}

/**
 * POST handler for /api/interpret endpoint.
 *
 * Processes cultural interpretation requests with full middleware chain.
 * Follows mandatory order for authentication, authorization, rate limiting,
 * cost protection, and usage tracking.
 *
 * @param req - Next.js request object
 * @returns JSON response with interpretation result or error
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // ============================================
    // 1. AUTHENTICATION (Supabase Auth)
    // ============================================
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn({ authError }, 'Authentication failed');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please sign in.',
          },
        },
        { status: 401 }
      );
    }

    // ============================================
    // 2. RATE LIMITING (IP-based)
    // ============================================
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      logger.info({ ip, userId: user.id }, 'Rate limit exceeded');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    // ============================================
    // 3. REQUEST VALIDATION
    // ============================================
    let body: InterpretationRequestBody;
    try {
      const rawBody = await req.json();
      const validation = validateInterpretationRequest(rawBody);

      if (!validation.success) {
        logger.info(
          { userId: user.id, error: validation.error },
          'Invalid request'
        );
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: validation.error,
            },
          },
          { status: 400 }
        );
      }

      body = validation.data!;
    } catch (error) {
      logger.error({ userId: user.id, error }, 'Failed to parse request body');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid JSON in request body',
          },
        },
        { status: 400 }
      );
    }

    // Log request received (NO message content - privacy-first)
    logger.info(
      {
        user_id: user.id,
        culture_pair: `${body.sender_culture}-${body.receiver_culture}`,
        character_count: body.message.length,
        interpretation_type: body.mode,
      },
      'Interpretation request received'
    );

    // ============================================
    // 4. AUTHORIZATION & 5. USAGE LIMIT CHECK
    // CRITICAL: Query DATABASE for tier/usage (NOT JWT)
    // ============================================
    const usageCheck = await checkUsageLimit(user.id);

    if (!usageCheck.allowed) {
      logger.info(
        {
          user_id: user.id,
          error: usageCheck.error,
          messages_remaining: usageCheck.messagesRemaining,
          tier: usageCheck.tier,
        },
        'Usage limit exceeded'
      );

      // Build enhanced error response with usage details
      const errorResponse: {
        code: string;
        message: string;
        tier?: string;
        messages_used?: number;
        messages_limit?: number;
        days_elapsed?: number;
        trial_end_date?: string;
        reset_date?: string;
      } = {
        code: usageCheck.error || 'LIMIT_EXCEEDED',
        message: usageCheck.message || 'Usage limit exceeded',
      };

      // Add tier-specific details to error response
      if (usageCheck.tier) {
        errorResponse.tier = usageCheck.tier;
      }

      if (usageCheck.messagesUsed !== undefined) {
        errorResponse.messages_used = usageCheck.messagesUsed;
      }

      if (usageCheck.messagesLimit !== undefined) {
        errorResponse.messages_limit = usageCheck.messagesLimit;
      }

      if (usageCheck.daysElapsed !== undefined) {
        errorResponse.days_elapsed = usageCheck.daysElapsed;
      }

      if (usageCheck.trialEndDate) {
        errorResponse.trial_end_date = usageCheck.trialEndDate;
      }

      if (usageCheck.resetDate) {
        errorResponse.reset_date = usageCheck.resetDate;
      }

      return NextResponse.json(
        {
          success: false,
          error: errorResponse,
        },
        { status: 403 }
      );
    }

    // ============================================
    // 6. COST CIRCUIT BREAKER - CRITICAL
    // ============================================
    const costCheck = await checkCostBudget(user.id);

    if (!costCheck.allowed) {
      logger.warn(
        {
          userId: user.id,
          layer: costCheck.layer,
          currentCost: costCheck.currentCost,
          limit: costCheck.limit,
        },
        'Cost circuit breaker triggered'
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_OVERLOADED',
            message:
              'Service is temporarily overloaded. Please try again later.',
          },
        },
        { status: 503 }
      );
    }

    // ============================================
    // 7. BUSINESS LOGIC (LLM Interpretation/Optimization)
    // ============================================
    const llmProvider = createLLMProvider();
    const sameCulture = body.sender_culture === body.receiver_culture;

    const result = await llmProvider.interpret(
      {
        message: body.message,
        senderCulture: body.sender_culture as CultureCode,
        receiverCulture: body.receiver_culture as CultureCode,
        sameCulture,
      },
      body.mode as 'inbound' | 'outbound'
    );

    // ============================================
    // 8. COST TRACKING - CRITICAL (Immediate)
    // ============================================
    await trackCost(user.id, result.metadata.costUsd);

    // ============================================
    // 9. PERSISTENCE
    // ============================================
    // Save interpretation metadata (NO message content - privacy-first)
    const interpretation = await createInterpretation({
      user_id: user.id,
      culture_sender: body.sender_culture as CultureCode,
      culture_receiver: body.receiver_culture as CultureCode,
      character_count: body.message.length,
      interpretation_type: body.mode as InterpretationType,
      cost_usd: result.metadata.costUsd,
      llm_provider: 'anthropic',
      response_time_ms: result.metadata.responseTimeMs,
      tokens_input: result.metadata.tokenCount,
      tokens_output: 0, // Will be split in future if needed
    });

    // Increment user message count
    await incrementUserUsage(user.id);

    // Report usage to Lemon Squeezy for PAYG users
    // Non-blocking: errors are logged but don't prevent interpretation from succeeding
    if (usageCheck.tier === 'payg') {
      reportInterpretationUsage(user.id, interpretation.id).catch(error => {
        logger.error({ userId: user.id, interpretationId: interpretation.id, error },
          'Failed to report usage to Lemon Squeezy');
      });
    }

    // ============================================
    // 10. LOGGING (Structured, Privacy-First)
    // ============================================
    logger.info(
      {
        user_id: user.id,
        culture_pair: `${body.sender_culture}-${body.receiver_culture}`,
        cost_usd: result.metadata.costUsd,
        response_time_ms: Date.now() - startTime,
        messages_remaining: usageCheck.messagesRemaining
          ? usageCheck.messagesRemaining - 1
          : undefined,
      },
      'Interpretation successful'
    );

    // ============================================
    // 11. RESPONSE (Standardized Format)
    // ============================================
    return NextResponse.json(
      {
        success: true,
        data: {
          interpretation: result.interpretation,
          interpretationId: interpretation.id,
        },
        metadata: {
          messages_remaining: usageCheck.messagesRemaining
            ? usageCheck.messagesRemaining - 1
            : undefined,
        },
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
        },
      }
    );
  } catch (error) {
    // ============================================
    // 12. ERROR HANDLING (Specific Error Types)
    // ============================================
    const responseTimeMs = Date.now() - startTime;

    // LLM-specific errors
    if (error instanceof LLMTimeoutError) {
      logger.error(
        { error, response_time_ms: responseTimeMs },
        'LLM request timed out'
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LLM_TIMEOUT',
            message: 'Request timed out. Please try again.',
          },
        },
        { status: 504 }
      );
    }

    if (error instanceof LLMRateLimitError) {
      logger.error({ error }, 'LLM rate limit exceeded');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LLM_RATE_LIMITED',
            message: 'Service is busy. Please try again in a moment.',
          },
        },
        { status: 429 }
      );
    }

    if (error instanceof LLMAuthError) {
      logger.error({ error }, 'LLM authentication failed');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Service configuration error. Please contact support.',
          },
        },
        { status: 500 }
      );
    }

    if (error instanceof LLMParsingError) {
      logger.error({ error }, 'LLM response parsing failed');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process response. Please try again.',
          },
        },
        { status: 500 }
      );
    }

    if (error instanceof LLMProviderError) {
      logger.error({ error }, 'LLM provider error');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Service error. Please try again.',
          },
        },
        { status: 500 }
      );
    }

    // Generic error
    logger.error(
      { error, response_time_ms: responseTimeMs },
      'Interpretation failed with unexpected error'
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}
