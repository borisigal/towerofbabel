/**
 * Feedback Analytics Service
 *
 * Provides aggregated statistics and export functionality for interpretation feedback.
 * Used by admin dashboard to track quality trends and identify areas for improvement.
 *
 * Features:
 * - Overall feedback statistics (inbound/outbound positive rates)
 * - Culture pair analysis (identifies problematic culture pairs)
 * - Privacy-first design (exports metadata only, no message content)
 * - Date range filtering (7d, 30d, all time)
 * - Prisma aggregation for performance
 *
 * @see docs/stories/4.5.story.md
 * @see architecture/5-data-model.md#prisma-aggregation
 */

import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';

/**
 * Date range type for filtering analytics
 */
export type DateRangeType = '7d' | '30d' | 'all';

/**
 * Overall statistics interface
 */
export interface OverallStats {
  total_interpretations: number;
  inbound: {
    total_with_feedback: number;
    thumbs_up: number;
    thumbs_down: number;
    positive_rate: number;
  };
  outbound: {
    total_with_feedback: number;
    thumbs_up: number;
    thumbs_down: number;
    positive_rate: number;
  };
}

/**
 * Culture pair statistics interface
 */
export interface CulturePairStats {
  sender: string;
  receiver: string;
  total: number;
  thumbs_up: number;
  thumbs_down: number;
  positive_rate: number;
}

/**
 * Feedback export data interface
 */
export interface FeedbackExportData {
  interpretation_id: string;
  timestamp: Date;
  type: string;
  sender_culture: string;
  receiver_culture: string;
  feedback: string;
  feedback_timestamp: Date;
  character_count: number;
  llm_provider: string;
  response_time_ms: number;
  cost_usd: number;
}

/**
 * Parses date range string to start date
 * @param range - Date range type ('7d', '30d', 'all')
 * @returns Start date for filtering
 */
export function parseDateRange(range: DateRangeType): Date {
  const now = new Date();

  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(0); // Unix epoch (1970-01-01)
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
  }
}

/**
 * Calculates positive feedback rate
 * @param thumbsUp - Number of thumbs up
 * @param thumbsDown - Number of thumbs down
 * @returns Positive rate percentage (0-100)
 */
function calculatePositiveRate(thumbsUp: number, thumbsDown: number): number {
  const total = thumbsUp + thumbsDown;
  if (total === 0) return 0;
  return Math.round((thumbsUp / total) * 10000) / 100; // 2 decimal places
}

/**
 * Gets overall feedback statistics
 *
 * Aggregates feedback data across all interpretations, grouped by
 * interpretation type (inbound/outbound).
 *
 * @param dateRange - Date range filter ('7d', '30d', 'all')
 * @returns Overall statistics object
 */
export async function getOverallStats(
  dateRange: DateRangeType
): Promise<OverallStats> {
  const startDate = parseDateRange(dateRange);

  try {
    log.info('Fetching overall feedback stats', { dateRange, startDate });

    // Total interpretations in date range
    const totalInterpretations = await prisma.interpretation.count({
      where: {
        timestamp: { gte: startDate },
      },
    });

    // Inbound feedback aggregation
    const inboundFeedback = await prisma.interpretation.groupBy({
      by: ['feedback'],
      where: {
        interpretation_type: 'inbound',
        feedback: { not: null },
        timestamp: { gte: startDate },
      },
      _count: {
        feedback: true,
      },
    });

    // Calculate inbound stats
    const inboundThumbsUp =
      inboundFeedback.find((f) => f.feedback === 'up')?._count.feedback || 0;
    const inboundThumbsDown =
      inboundFeedback.find((f) => f.feedback === 'down')?._count.feedback || 0;
    const inboundTotal = inboundThumbsUp + inboundThumbsDown;
    const inboundPositiveRate = calculatePositiveRate(
      inboundThumbsUp,
      inboundThumbsDown
    );

    // Outbound feedback aggregation
    const outboundFeedback = await prisma.interpretation.groupBy({
      by: ['feedback'],
      where: {
        interpretation_type: 'outbound',
        feedback: { not: null },
        timestamp: { gte: startDate },
      },
      _count: {
        feedback: true,
      },
    });

    // Calculate outbound stats
    const outboundThumbsUp =
      outboundFeedback.find((f) => f.feedback === 'up')?._count.feedback || 0;
    const outboundThumbsDown =
      outboundFeedback.find((f) => f.feedback === 'down')?._count.feedback ||
      0;
    const outboundTotal = outboundThumbsUp + outboundThumbsDown;
    const outboundPositiveRate = calculatePositiveRate(
      outboundThumbsUp,
      outboundThumbsDown
    );

    log.info('Overall stats fetched successfully', {
      totalInterpretations,
      inboundTotal,
      outboundTotal,
    });

    return {
      total_interpretations: totalInterpretations,
      inbound: {
        total_with_feedback: inboundTotal,
        thumbs_up: inboundThumbsUp,
        thumbs_down: inboundThumbsDown,
        positive_rate: inboundPositiveRate,
      },
      outbound: {
        total_with_feedback: outboundTotal,
        thumbs_up: outboundThumbsUp,
        thumbs_down: outboundThumbsDown,
        positive_rate: outboundPositiveRate,
      },
    };
  } catch (error) {
    log.error('Failed to fetch overall stats', {
      dateRange,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to fetch overall statistics');
  }
}

/**
 * Gets culture pair statistics (top 5 pairs with lowest positive rates)
 *
 * Identifies problematic culture pairs that need prompt improvements.
 *
 * @param dateRange - Date range filter ('7d', '30d', 'all')
 * @returns Array of culture pair statistics (top 5 lowest positive rates)
 */
export async function getCulturePairStats(
  dateRange: DateRangeType
): Promise<CulturePairStats[]> {
  const startDate = parseDateRange(dateRange);

  try {
    log.info('Fetching culture pair stats', { dateRange, startDate });

    // Get all interpretations with feedback, grouped by culture pair
    const culturePairs = await prisma.interpretation.groupBy({
      by: ['culture_sender', 'culture_receiver', 'feedback'],
      where: {
        feedback: { not: null },
        timestamp: { gte: startDate },
      },
      _count: {
        feedback: true,
      },
    });

    // Aggregate by culture pair (sender + receiver combination)
    const pairMap = new Map<
      string,
      { sender: string; receiver: string; up: number; down: number }
    >();

    culturePairs.forEach((pair) => {
      const key = `${pair.culture_sender}|${pair.culture_receiver}`;

      if (!pairMap.has(key)) {
        pairMap.set(key, {
          sender: pair.culture_sender,
          receiver: pair.culture_receiver,
          up: 0,
          down: 0,
        });
      }

      const stats = pairMap.get(key)!;
      if (pair.feedback === 'up') {
        stats.up += pair._count.feedback;
      } else if (pair.feedback === 'down') {
        stats.down += pair._count.feedback;
      }
    });

    // Convert to array and calculate positive rates
    const pairStats: CulturePairStats[] = Array.from(pairMap.values()).map(
      (stats) => ({
        sender: stats.sender,
        receiver: stats.receiver,
        total: stats.up + stats.down,
        thumbs_up: stats.up,
        thumbs_down: stats.down,
        positive_rate: calculatePositiveRate(stats.up, stats.down),
      })
    );

    // Sort by positive rate (ascending) - lowest rates first (problematic pairs)
    pairStats.sort((a, b) => a.positive_rate - b.positive_rate);

    // Return top 5 lowest
    const top5Lowest = pairStats.slice(0, 5);

    log.info('Culture pair stats fetched successfully', {
      totalPairs: pairStats.length,
      top5Count: top5Lowest.length,
    });

    return top5Lowest;
  } catch (error) {
    log.error('Failed to fetch culture pair stats', {
      dateRange,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to fetch culture pair statistics');
  }
}

/**
 * Exports feedback data as structured array for CSV conversion
 *
 * Returns metadata only (no message content) for privacy.
 *
 * @param dateRange - Date range filter ('7d', '30d', 'all')
 * @returns Array of feedback data (metadata only)
 */
export async function exportFeedbackData(
  dateRange: DateRangeType
): Promise<FeedbackExportData[]> {
  const startDate = parseDateRange(dateRange);

  try {
    log.info('Exporting feedback data', { dateRange, startDate });

    const feedbackData = await prisma.interpretation.findMany({
      where: {
        feedback: { not: null },
        timestamp: { gte: startDate },
      },
      select: {
        id: true,
        timestamp: true,
        interpretation_type: true,
        culture_sender: true,
        culture_receiver: true,
        feedback: true,
        feedback_timestamp: true,
        character_count: true,
        llm_provider: true,
        response_time_ms: true,
        cost_usd: true,
        // EXCLUDE: No message content fields
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    const exportData: FeedbackExportData[] = feedbackData.map((item) => ({
      interpretation_id: item.id,
      timestamp: item.timestamp,
      type: item.interpretation_type,
      sender_culture: item.culture_sender,
      receiver_culture: item.culture_receiver,
      feedback: item.feedback!,
      feedback_timestamp: item.feedback_timestamp!,
      character_count: item.character_count,
      llm_provider: item.llm_provider,
      response_time_ms: item.response_time_ms,
      cost_usd: parseFloat(item.cost_usd.toString()),
    }));

    log.info('Feedback data exported successfully', {
      recordCount: exportData.length,
    });

    return exportData;
  } catch (error) {
    log.error('Failed to export feedback data', {
      dateRange,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to export feedback data');
  }
}
