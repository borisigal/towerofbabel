/**
 * POST /api/interpret/stream - Streaming Cultural Interpretation API Route
 *
 * Processes user messages through LLM with Server-Sent Events (SSE) streaming.
 * Returns interpretation results progressively as they are generated.
 *
 * **Endpoint Strategy:** This is a NEW endpoint that complements /api/interpret.
 * The existing buffered endpoint remains unchanged for fallback support.
 *
 * **Middleware Chain Order (Same as /api/interpret):**
 * 1. Authentication (Supabase Auth)
 * 2. Rate Limiting (IP-based)
 * 3. Request Validation
 * 4. Authorization (Database query for tier/usage - NOT JWT)
 * 5. Usage Limit Check (tier-specific)
 * 6. Cost Circuit Breaker (CRITICAL risk mitigation)
 * 7. Business Logic (LLM streaming interpretation)
 * 8. Cost Tracking (AFTER stream completes)
 * 9. Persistence (save metadata, increment usage)
 * 10. SSE Response (text/event-stream)
 *
 * @see docs/stories/6.1.story.md
 * @see architecture/16-coding-standards.md#api-route-patterns
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import { checkUsageLimit } from '@/lib/services/usageService';
import { checkCostBudget, trackCost } from '@/lib/llm/costCircuitBreaker';
import { createLLMProvider } from '@/lib/llm/factory';
import { createInterpretation } from '@/lib/db/repositories/interpretationRepository';
import { incrementUserUsage } from '@/lib/db/repositories/userRepository';
import { reportInterpretationUsage } from '@/lib/lemonsqueezy/usageReporting';
import { logger } from '@/lib/observability/logger';
import { CULTURES, CultureCode, InterpretationType } from '@/lib/types/models';
import { InterpretationResponse, LLMMetadata } from '@/lib/llm/types';
import { SSEEventData } from '@/lib/llm/streamTypes';

/**
 * Request body validation schema.
 * Same as /api/interpret for consistency.
 */
interface InterpretationRequestBody {
  message: string;
  sender_culture: string;
  receiver_culture: string;
  mode: string;
}

/**
 * Validates interpretation request body.
 * Identical to /api/interpret validation for consistency.
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
 * Creates a JSON error response (non-streaming).
 * Used for pre-streaming errors (auth, validation, etc.).
 *
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code
 * @param headers - Optional additional headers
 * @returns Response object
 */
function jsonErrorResponse(
  code: string,
  message: string,
  status: number,
  headers?: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

/**
 * POST handler for /api/interpret/stream endpoint.
 *
 * Processes cultural interpretation requests with SSE streaming response.
 * Follows same middleware chain as /api/interpret, but returns streaming response.
 *
 * @param req - Next.js request object
 * @returns SSE streaming response or JSON error response
 */
export async function POST(req: NextRequest): Promise<Response> {
  const startTime = Date.now();

  // ============================================
  // 1. AUTHENTICATION (Supabase Auth)
  // ============================================
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logger.warn({ authError }, 'Streaming: Authentication failed');
    return jsonErrorResponse(
      'UNAUTHORIZED',
      'Authentication required. Please sign in.',
      401
    );
  }

  // ============================================
  // 2. RATE LIMITING (IP-based)
  // ============================================
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = await checkRateLimit(ip);

  if (!rateLimit.allowed) {
    logger.info({ ip, userId: user.id }, 'Streaming: Rate limit exceeded');
    return jsonErrorResponse(
      'RATE_LIMITED',
      'Too many requests. Please try again later.',
      429,
      {
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.reset.toString(),
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
        'Streaming: Invalid request'
      );
      return jsonErrorResponse('INVALID_INPUT', validation.error || 'Invalid input', 400);
    }

    body = validation.data!;
  } catch (error) {
    logger.error({ userId: user.id, error }, 'Streaming: Failed to parse request body');
    return jsonErrorResponse('INVALID_INPUT', 'Invalid JSON in request body', 400);
  }

  // Log request received (NO message content - privacy-first)
  logger.info(
    {
      user_id: user.id,
      culture_pair: `${body.sender_culture}-${body.receiver_culture}`,
      character_count: body.message.length,
      interpretation_type: body.mode,
      streaming: true,
    },
    'Streaming interpretation request received'
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
        streaming: true,
      },
      'Streaming: Usage limit exceeded'
    );

    return jsonErrorResponse(
      usageCheck.error || 'LIMIT_EXCEEDED',
      usageCheck.message || 'Usage limit exceeded',
      403
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
        streaming: true,
      },
      'Streaming: Cost circuit breaker triggered'
    );

    return jsonErrorResponse(
      'SERVICE_OVERLOADED',
      'Service is temporarily overloaded. Please try again later.',
      503
    );
  }

  // ============================================
  // 7. STREAMING RESPONSE SETUP
  // ============================================
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Capture values needed in async closure
  const userId = user.id;
  const messagesRemaining = usageCheck.messagesRemaining;
  const userTier = usageCheck.tier;
  const sameCulture = body.sender_culture === body.receiver_culture;

  // Start streaming in background (non-blocking)
  (async () => {
    let finalResult: {
      interpretation: InterpretationResponse;
      metadata: LLMMetadata;
    } | null = null;

    try {
      const llmProvider = createLLMProvider();

      // Verify streaming is supported
      if (!llmProvider.interpretStream) {
        throw new Error('LLM provider does not support streaming');
      }

      const generator = llmProvider.interpretStream(
        {
          message: body.message,
          senderCulture: body.sender_culture as CultureCode,
          receiverCulture: body.receiver_culture as CultureCode,
          sameCulture,
        },
        body.mode as 'inbound' | 'outbound'
      );

      // Log time to first chunk for performance tracking
      let firstChunkTime: number | null = null;

      // Process all chunks from the generator
      for await (const chunk of generator) {
        if (chunk.type === 'text') {
          // Track time to first chunk
          if (firstChunkTime === null) {
            firstChunkTime = Date.now() - startTime;
            logger.info(
              {
                user_id: userId,
                time_to_first_chunk_ms: firstChunkTime,
                streaming: true,
              },
              'Streaming: First chunk received'
            );
          }

          // Send text chunk to client immediately
          const sseData: SSEEventData = { type: 'text', text: chunk.text };
          await writer.write(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
        } else if (chunk.type === 'complete') {
          // Capture final result from complete chunk
          finalResult = {
            interpretation: chunk.interpretation,
            metadata: chunk.metadata,
          };
        }
      }

      // Validate we received a complete chunk
      if (!finalResult) {
        throw new Error('Stream completed without final result');
      }

      // ============================================
      // 8. COST TRACKING - CRITICAL (After stream completes)
      // ============================================
      await trackCost(userId, finalResult.metadata.costUsd);

      // ============================================
      // 9. PERSISTENCE
      // ============================================
      // Includes cache metrics for cost tracking
      const interpretation = await createInterpretation({
        user_id: userId,
        culture_sender: body.sender_culture as CultureCode,
        culture_receiver: body.receiver_culture as CultureCode,
        character_count: body.message.length,
        interpretation_type: body.mode as InterpretationType,
        cost_usd: finalResult.metadata.costUsd,
        llm_provider: 'anthropic',
        response_time_ms: finalResult.metadata.responseTimeMs,
        tokens_input: finalResult.metadata.inputTokens,
        tokens_output: finalResult.metadata.outputTokens,
        tokens_cached: finalResult.metadata.cacheReadTokens,
      });

      await incrementUserUsage(userId);

      // Report usage to Lemon Squeezy for PAYG users (non-blocking)
      if (userTier === 'payg') {
        reportInterpretationUsage(userId, interpretation.id).catch((error) => {
          logger.error(
            { userId, interpretationId: interpretation.id, error },
            'Streaming: Failed to report usage to Lemon Squeezy'
          );
        });
      }

      // ============================================
      // 10. SEND COMPLETION EVENT
      // ============================================
      const completeData: SSEEventData = {
        type: 'complete',
        interpretation: finalResult.interpretation,
        metadata: finalResult.metadata,
        interpretationId: interpretation.id,
      };

      // Add messages_remaining to metadata
      const completeWithMessages = {
        ...completeData,
        metadata: {
          ...completeData.metadata,
          messages_remaining: messagesRemaining ? messagesRemaining - 1 : undefined,
        },
      };

      await writer.write(
        encoder.encode(`data: ${JSON.stringify(completeWithMessages)}\n\n`)
      );

      // Log success
      logger.info(
        {
          user_id: userId,
          culture_pair: `${body.sender_culture}-${body.receiver_culture}`,
          cost_usd: finalResult.metadata.costUsd,
          response_time_ms: Date.now() - startTime,
          messages_remaining: messagesRemaining ? messagesRemaining - 1 : undefined,
          streaming: true,
        },
        'Streaming interpretation successful'
      );
    } catch (error) {
      logger.error(
        { error, userId, streaming: true },
        'Streaming interpretation failed'
      );

      // Send error event to client
      const errorData: SSEEventData = {
        type: 'error',
        error: {
          code: 'STREAM_ERROR',
          message: 'Streaming failed. Please try again.',
        },
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  // ============================================
  // 11. RETURN SSE RESPONSE
  // ============================================
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.reset.toString(),
    },
  });
}
