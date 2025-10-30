/**
 * Unit Tests for Feedback Analytics Service
 *
 * Tests aggregation logic for admin feedback analytics:
 * - Overall stats calculation
 * - Culture pair analysis
 * - Date range filtering
 * - CSV export data formatting
 * - Privacy compliance (no message content)
 *
 * Story 4.5 - Task 11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOverallStats,
  getCulturePairStats,
  exportFeedbackData,
  parseDateRange,
} from '@/lib/services/feedbackAnalyticsService';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  default: {
    interpretation: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/observability/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import prisma from '@/lib/db/prisma';

describe('feedbackAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseDateRange', () => {
    it('should convert "7d" to 7 days ago', () => {
      const result = parseDateRange('7d');
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance for test execution time
      expect(result.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime() - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(sevenDaysAgo.getTime() + 1000);
    });

    it('should convert "30d" to 30 days ago', () => {
      const result = parseDateRange('30d');
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      expect(result.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime() - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(thirtyDaysAgo.getTime() + 1000);
    });

    it('should convert "all" to Unix epoch (1970-01-01)', () => {
      const result = parseDateRange('all');
      expect(result.getTime()).toBe(0);
    });
  });

  describe('getOverallStats', () => {
    it('should return correct aggregated data with feedback', async () => {
      // Mock total count
      vi.mocked(prisma.interpretation.count).mockResolvedValue(100);

      // Mock inbound feedback groupBy
      vi.mocked(prisma.interpretation.groupBy)
        .mockResolvedValueOnce([
          { feedback: 'up', _count: { feedback: 80 } },
          { feedback: 'down', _count: { feedback: 20 } },
        ] as any)
        .mockResolvedValueOnce([
          { feedback: 'up', _count: { feedback: 60 } },
          { feedback: 'down', _count: { feedback: 40 } },
        ] as any);

      const result = await getOverallStats('30d');

      expect(result.total_interpretations).toBe(100);
      expect(result.inbound.thumbs_up).toBe(80);
      expect(result.inbound.thumbs_down).toBe(20);
      expect(result.inbound.positive_rate).toBe(80.0);
      expect(result.outbound.thumbs_up).toBe(60);
      expect(result.outbound.thumbs_down).toBe(40);
      expect(result.outbound.positive_rate).toBe(60.0);
    });

    it('should handle 0 feedback case (no division by zero)', async () => {
      vi.mocked(prisma.interpretation.count).mockResolvedValue(50);
      vi.mocked(prisma.interpretation.groupBy)
        .mockResolvedValueOnce([]) // Inbound: no feedback
        .mockResolvedValueOnce([]); // Outbound: no feedback

      const result = await getOverallStats('7d');

      expect(result.total_interpretations).toBe(50);
      expect(result.inbound.total_with_feedback).toBe(0);
      expect(result.inbound.positive_rate).toBe(0);
      expect(result.outbound.total_with_feedback).toBe(0);
      expect(result.outbound.positive_rate).toBe(0);
    });

    it('should calculate inbound stats correctly', async () => {
      vi.mocked(prisma.interpretation.count).mockResolvedValue(150);
      vi.mocked(prisma.interpretation.groupBy)
        .mockResolvedValueOnce([
          { feedback: 'up', _count: { feedback: 90 } },
          { feedback: 'down', _count: { feedback: 10 } },
        ] as any)
        .mockResolvedValueOnce([]);

      const result = await getOverallStats('all');

      expect(result.inbound.total_with_feedback).toBe(100);
      expect(result.inbound.thumbs_up).toBe(90);
      expect(result.inbound.thumbs_down).toBe(10);
      expect(result.inbound.positive_rate).toBe(90.0);
    });

    it('should calculate outbound stats correctly', async () => {
      vi.mocked(prisma.interpretation.count).mockResolvedValue(200);
      vi.mocked(prisma.interpretation.groupBy)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { feedback: 'up', _count: { feedback: 70 } },
          { feedback: 'down', _count: { feedback: 30 } },
        ] as any);

      const result = await getOverallStats('30d');

      expect(result.outbound.total_with_feedback).toBe(100);
      expect(result.outbound.thumbs_up).toBe(70);
      expect(result.outbound.thumbs_down).toBe(30);
      expect(result.outbound.positive_rate).toBe(70.0);
    });

    it('should use correct date range filter', async () => {
      vi.mocked(prisma.interpretation.count).mockResolvedValue(10);
      vi.mocked(prisma.interpretation.groupBy).mockResolvedValue([]);

      await getOverallStats('7d');

      // Verify count was called with date filter
      expect(prisma.interpretation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe('getCulturePairStats', () => {
    it('should return top 5 culture pairs with lowest positive rates', async () => {
      vi.mocked(prisma.interpretation.groupBy).mockResolvedValue([
        { culture_sender: 'en-US', culture_receiver: 'ja-JP', feedback: 'up', _count: { feedback: 10 } },
        { culture_sender: 'en-US', culture_receiver: 'ja-JP', feedback: 'down', _count: { feedback: 90 } },
        { culture_sender: 'fr-FR', culture_receiver: 'de-DE', feedback: 'up', _count: { feedback: 80 } },
        { culture_sender: 'fr-FR', culture_receiver: 'de-DE', feedback: 'down', _count: { feedback: 20 } },
      ] as any);

      const result = await getCulturePairStats('30d');

      expect(result).toHaveLength(2);
      // First should be lowest positive rate (en-US -> ja-JP: 10%)
      expect(result[0].sender).toBe('en-US');
      expect(result[0].receiver).toBe('ja-JP');
      expect(result[0].positive_rate).toBe(10.0);
      // Second should be higher (fr-FR -> de-DE: 80%)
      expect(result[1].sender).toBe('fr-FR');
      expect(result[1].receiver).toBe('de-DE');
      expect(result[1].positive_rate).toBe(80.0);
    });

    it('should sort culture pairs correctly (ascending by positive rate)', async () => {
      vi.mocked(prisma.interpretation.groupBy).mockResolvedValue([
        { culture_sender: 'en-US', culture_receiver: 'ja-JP', feedback: 'up', _count: { feedback: 90 } },
        { culture_sender: 'en-US', culture_receiver: 'ja-JP', feedback: 'down', _count: { feedback: 10 } },
        { culture_sender: 'fr-FR', culture_receiver: 'de-DE', feedback: 'up', _count: { feedback: 50 } },
        { culture_sender: 'fr-FR', culture_receiver: 'de-DE', feedback: 'down', _count: { feedback: 50 } },
        { culture_sender: 'es-ES', culture_receiver: 'pt-PT', feedback: 'up', _count: { feedback: 20 } },
        { culture_sender: 'es-ES', culture_receiver: 'pt-PT', feedback: 'down', _count: { feedback: 80 } },
      ] as any);

      const result = await getCulturePairStats('all');

      // Should be sorted ascending: 20%, 50%, 90%
      expect(result[0].positive_rate).toBe(20.0);
      expect(result[1].positive_rate).toBe(50.0);
      expect(result[2].positive_rate).toBe(90.0);
    });

    it('should return max 5 pairs', async () => {
      // Create 10 pairs
      const mockData = [];
      for (let i = 0; i < 10; i++) {
        mockData.push(
          { culture_sender: `en-${i}`, culture_receiver: `ja-${i}`, feedback: 'up', _count: { feedback: i } },
          { culture_sender: `en-${i}`, culture_receiver: `ja-${i}`, feedback: 'down', _count: { feedback: 100 - i } }
        );
      }
      vi.mocked(prisma.interpretation.groupBy).mockResolvedValue(mockData as any);

      const result = await getCulturePairStats('7d');

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('exportFeedbackData', () => {
    it('should return correct metadata (no message content)', async () => {
      const mockData = [
        {
          id: '123',
          timestamp: new Date('2025-01-01'),
          interpretation_type: 'inbound',
          culture_sender: 'en-US',
          culture_receiver: 'ja-JP',
          feedback: 'up',
          feedback_timestamp: new Date('2025-01-02'),
          character_count: 100,
          llm_provider: 'anthropic',
          response_time_ms: 500,
          cost_usd: 0.01,
        },
      ];

      vi.mocked(prisma.interpretation.findMany).mockResolvedValue(mockData as any);

      const result = await exportFeedbackData('30d');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('interpretation_id');
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('sender_culture');
      expect(result[0]).toHaveProperty('receiver_culture');
      expect(result[0]).toHaveProperty('feedback');
      expect(result[0]).toHaveProperty('feedback_timestamp');
      expect(result[0]).toHaveProperty('character_count');
      expect(result[0]).toHaveProperty('llm_provider');
      expect(result[0]).toHaveProperty('response_time_ms');
      expect(result[0]).toHaveProperty('cost_usd');
    });

    it('should NOT include message content fields', async () => {
      const mockData = [
        {
          id: '123',
          timestamp: new Date(),
          interpretation_type: 'inbound',
          culture_sender: 'en-US',
          culture_receiver: 'ja-JP',
          feedback: 'up',
          feedback_timestamp: new Date(),
          character_count: 100,
          llm_provider: 'anthropic',
          response_time_ms: 500,
          cost_usd: 0.01,
        },
      ];

      vi.mocked(prisma.interpretation.findMany).mockResolvedValue(mockData as any);

      const result = await exportFeedbackData('all');

      // Verify message content fields are NOT present
      expect(result[0]).not.toHaveProperty('original_message');
      expect(result[0]).not.toHaveProperty('sender_emotions');
      expect(result[0]).not.toHaveProperty('receiver_emotions');
      expect(result[0]).not.toHaveProperty('insights');
    });

    it('should filter by date range', async () => {
      vi.mocked(prisma.interpretation.findMany).mockResolvedValue([]);

      await exportFeedbackData('7d');

      expect(prisma.interpretation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            feedback: { not: null },
            timestamp: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });
});
