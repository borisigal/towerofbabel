/**
 * Interpretation Repository
 *
 * ALL database access for Interpretation model MUST go through these repository functions.
 * Direct Prisma calls in API routes are FORBIDDEN.
 *
 * Repository Pattern Benefits:
 * - Centralized database access (easy to test and mock)
 * - Circuit breaker protection on all queries
 * - Consistent query optimization (explicit select clauses)
 * - Privacy-first enforcement (no message content stored)
 *
 * CRITICAL PRIVACY: NO message content is ever stored in database.
 * Only metadata (culture pair, cost, character count) is persisted.
 *
 * @see architecture/16-coding-standards.md#repository-pattern-mandatory
 * @see architecture/4-data-models.md#privacy-first-design
 */

import prisma from '@/lib/db/prisma';
import { executeWithCircuitBreaker } from '@/lib/db/connectionMonitor';
import { CultureCode, InterpretationType } from '@/lib/types/models';

/**
 * Data required to create an interpretation record.
 *
 * PRIVACY-FIRST: No message content field exists.
 */
export interface CreateInterpretationData {
  user_id: string;
  culture_sender: CultureCode;
  culture_receiver: CultureCode;
  character_count: number;
  interpretation_type: InterpretationType;
  cost_usd: number;
  llm_provider: string;
  response_time_ms: number;
  tokens_input?: number;
  tokens_output?: number;
  tokens_cached?: number;
}

/**
 * Creates a new interpretation record with metadata only (no message content).
 *
 * Called after each successful LLM interpretation to track:
 * - Usage statistics (for analytics)
 * - Cost tracking (for margin validation)
 * - Performance metrics (for monitoring)
 *
 * CRITICAL: Never pass message content to this function.
 * Privacy-first design ensures GDPR compliance.
 *
 * @param data - Interpretation metadata
 * @returns Promise resolving to created interpretation record
 *
 * @example
 * ```typescript
 * await createInterpretation({
 *   user_id: user.id,
 *   culture_sender: 'american',
 *   culture_receiver: 'japanese',
 *   character_count: 150,
 *   interpretation_type: 'inbound',
 *   cost_usd: 0.0075,
 *   llm_provider: 'anthropic',
 *   response_time_ms: 3200,
 *   tokens_input: 450,
 *   tokens_output: 200
 * });
 * ```
 */
export async function createInterpretation(
  data: CreateInterpretationData
): Promise<{
  id: string;
  user_id: string;
  timestamp: Date;
  cost_usd: number;
  response_time_ms: number;
}> {
  const result = await executeWithCircuitBreaker(() =>
    prisma.interpretation.create({
      data: {
        user_id: data.user_id,
        culture_sender: data.culture_sender,
        culture_receiver: data.culture_receiver,
        character_count: data.character_count,
        interpretation_type: data.interpretation_type,
        cost_usd: data.cost_usd,
        llm_provider: data.llm_provider,
        response_time_ms: data.response_time_ms,
        tokens_input: data.tokens_input,
        tokens_output: data.tokens_output,
        tokens_cached: data.tokens_cached,
      },
      select: {
        id: true,
        user_id: true,
        timestamp: true,
        cost_usd: true,
        response_time_ms: true,
      },
    })
  );

  return {
    ...result,
    cost_usd: Number(result.cost_usd),
  };
}

/**
 * Gets interpretation count for a user (for analytics).
 *
 * Returns total number of interpretations performed by user.
 * Used in admin dashboard and user profile.
 *
 * @param userId - User UUID
 * @returns Promise resolving to interpretation count
 */
export async function getUserInterpretationCount(
  userId: string
): Promise<number> {
  return executeWithCircuitBreaker(() =>
    prisma.interpretation.count({
      where: { user_id: userId },
    })
  );
}

/**
 * Gets recent interpretations for a user (for history/analytics).
 *
 * Returns most recent interpretations with metadata only.
 * PRIVACY: No message content returned.
 *
 * @param userId - User UUID
 * @param limit - Maximum number of records to return (default: 10)
 * @returns Promise resolving to array of interpretation records
 */
export async function getUserRecentInterpretations(
  userId: string,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    timestamp: Date;
    culture_sender: string;
    culture_receiver: string;
    character_count: number;
    interpretation_type: string;
    cost_usd: number;
    response_time_ms: number;
  }>
> {
  const results = await executeWithCircuitBreaker(() =>
    prisma.interpretation.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        timestamp: true,
        culture_sender: true,
        culture_receiver: true,
        character_count: true,
        interpretation_type: true,
        cost_usd: true,
        response_time_ms: true,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
  );

  return results.map((result) => ({
    ...result,
    cost_usd: Number(result.cost_usd),
  }));
}

/**
 * Gets total cost for a user (for billing/analytics).
 *
 * Sums all interpretation costs for a user.
 * Used for pay-as-you-go billing and cost monitoring.
 *
 * @param userId - User UUID
 * @returns Promise resolving to total cost in USD
 */
export async function getUserTotalCost(userId: string): Promise<number> {
  const result = await executeWithCircuitBreaker(() =>
    prisma.interpretation.aggregate({
      where: { user_id: userId },
      _sum: {
        cost_usd: true,
      },
    })
  );

  return Number(result._sum.cost_usd) || 0;
}
