/**
 * Integration Tests for /api/interpret Endpoint - Outbound Mode
 *
 * Tests full request/response cycle for outbound optimization including:
 * - Mode routing (inbound vs outbound)
 * - Outbound response structure validation
 * - Database persistence (interpretation_type='outbound')
 * - Usage tracking for outbound mode
 * - Cost tracking for outbound mode
 * - Mixed inbound/outbound tier limit enforcement
 * - Error handling (invalid mode, malformed LLM response)
 *
 * Story 4.2 - Task 13
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/interpret/route';

// Mock all dependencies
vi.mock('@/lib/auth/supabaseServer', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/middleware/rateLimit', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/services/usageService', () => ({
  checkUsageLimit: vi.fn(),
}));

vi.mock('@/lib/llm/costCircuitBreaker', () => ({
  checkCostBudget: vi.fn(),
  trackCost: vi.fn(),
}));

vi.mock('@/lib/llm/factory', () => ({
  createLLMProvider: vi.fn(),
}));

vi.mock('@/lib/db/repositories/interpretationRepository', () => ({
  createInterpretation: vi.fn(),
}));

vi.mock('@/lib/db/repositories/userRepository', () => ({
  incrementUserUsage: vi.fn(),
}));

vi.mock('@/lib/lemonsqueezy/usageReporting', () => ({
  reportInterpretationUsage: vi.fn(),
}));

vi.mock('@/lib/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked modules
import { createClient } from '@/lib/auth/supabaseServer';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import { checkUsageLimit } from '@/lib/services/usageService';
import { checkCostBudget, trackCost } from '@/lib/llm/costCircuitBreaker';
import { createLLMProvider } from '@/lib/llm/factory';
import { createInterpretation } from '@/lib/db/repositories/interpretationRepository';
import { incrementUserUsage } from '@/lib/db/repositories/userRepository';
import { LLMParsingError } from '@/lib/llm/errors';

/**
 * Helper to create a mock Next.js request
 */
function createMockRequest(body: unknown): NextRequest {
  const url = 'http://localhost:3000/api/interpret';
  const init = {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'x-forwarded-for': '192.168.1.100',
    }),
    body: JSON.stringify(body),
  };

  return new NextRequest(url, init);
}

/**
 * Helper to setup successful authentication
 */
function mockAuthSuccess(userId = 'user-123') {
  const mockUser = {
    id: userId,
    email: 'test@example.com',
  };

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
    },
  };

  vi.mocked(createClient).mockReturnValue(
    mockSupabaseClient as ReturnType<typeof createClient>
  );
}

/**
 * Helper to setup rate limit check (allowed)
 */
function mockRateLimitAllowed() {
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    limit: 50,
    remaining: 45,
    reset: Date.now() / 1000 + 3600,
  });
}

/**
 * Helper to setup usage limit check
 */
function mockUsageLimitCheck(messagesRemaining: number, tier = 'trial') {
  vi.mocked(checkUsageLimit).mockResolvedValue({
    allowed: messagesRemaining > 0,
    messagesRemaining,
    messagesUsed: 10 - messagesRemaining,
    tier,
  });
}

/**
 * Helper to setup cost circuit breaker (allowed)
 */
function mockCostBudgetAllowed() {
  vi.mocked(checkCostBudget).mockResolvedValue({
    allowed: true,
  });
}

describe('/api/interpret - Outbound Mode Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test INT-4.2-001: Outbound interpretation returns correct response structure
   */
  describe('INT-4.2-001: Outbound Response Structure', () => {
    it('should return originalAnalysis, suggestions, optimizedMessage, and emotions for outbound mode', async () => {
      // Setup: Mock successful authentication and checks
      mockAuthSuccess();
      mockRateLimitAllowed();
      mockUsageLimitCheck(5);
      mockCostBudgetAllowed();

      // Mock LLM provider with outbound response
      const mockLLMProvider = {
        interpret: vi.fn().mockResolvedValue({
          interpretation: {
            originalAnalysis: 'This message sounds demanding and might be perceived as rude.',
            suggestions: [
              'Add "please" to make it more polite',
              'Use "would you be able to" instead of "can you"',
              'Provide a reason for the urgency',
            ],
            optimizedMessage: 'Would you be able to finish this by tomorrow? It would really help us meet the deadline. Thank you!',
            emotions: [
              {
                name: 'Urgency',
                senderScore: 7,
                explanation: 'Pressing deadline',
              },
              {
                name: 'Impatience',
                senderScore: 5,
                explanation: 'Slightly demanding tone',
              },
              {
                name: 'Expectation',
                senderScore: 6,
                explanation: 'Assumes completion',
              },
            ],
          },
          metadata: {
            costUsd: 0.0085,
            responseTimeMs: 3500,
            tokenCount: 520,
            model: 'claude-sonnet-4-5-20250929',
          },
        }),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);

      // Mock persistence
      vi.mocked(createInterpretation).mockResolvedValue({
        id: 'interpretation-outbound-123',
        user_id: 'user-123',
        timestamp: new Date(),
      } as any);

      vi.mocked(incrementUserUsage).mockResolvedValue({
        messages_used_count: 6,
        tier: 'trial',
      } as any);

      // Act: Send outbound request
      const request = createMockRequest({
        message: 'Can you finish this by tomorrow?',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: Outbound response structure
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.interpretation).toHaveProperty('originalAnalysis');
      expect(body.data.interpretation).toHaveProperty('suggestions');
      expect(body.data.interpretation).toHaveProperty('optimizedMessage');
      expect(body.data.interpretation).toHaveProperty('emotions');

      // Verify outbound-specific fields
      expect(body.data.interpretation.originalAnalysis).toContain('demanding');
      expect(body.data.interpretation.suggestions).toHaveLength(3);
      expect(body.data.interpretation.suggestions[0]).toContain('please');
      expect(body.data.interpretation.optimizedMessage).toContain('Would you be able');
      expect(body.data.interpretation.emotions).toHaveLength(3);

      // Verify LLM provider called with outbound mode
      expect(mockLLMProvider.interpret).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Can you finish this by tomorrow?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        }),
        'outbound'
      );
    });

    it('should return suggestions array with 3-5 items for outbound mode', async () => {
      // Setup
      mockAuthSuccess();
      mockRateLimitAllowed();
      mockUsageLimitCheck(5);
      mockCostBudgetAllowed();

      // Mock LLM provider with 5 suggestions
      const mockLLMProvider = {
        interpret: vi.fn().mockResolvedValue({
          interpretation: {
            originalAnalysis: 'Message analysis here',
            suggestions: [
              'Suggestion 1',
              'Suggestion 2',
              'Suggestion 3',
              'Suggestion 4',
              'Suggestion 5',
            ],
            optimizedMessage: 'Optimized message',
            emotions: [
              { name: 'Emotion1', senderScore: 5, explanation: 'Explanation' },
              { name: 'Emotion2', senderScore: 6, explanation: 'Explanation' },
              { name: 'Emotion3', senderScore: 7, explanation: 'Explanation' },
            ],
          },
          metadata: {
            costUsd: 0.008,
            responseTimeMs: 3000,
            tokenCount: 500,
            model: 'claude-sonnet-4-5-20250929',
          },
        }),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);
      vi.mocked(createInterpretation).mockResolvedValue({ id: 'int-123' } as any);
      vi.mocked(incrementUserUsage).mockResolvedValue({} as any);

      // Act
      const request = createMockRequest({
        message: 'Test message',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: Suggestions count is within valid range
      expect(body.data.interpretation.suggestions.length).toBeGreaterThanOrEqual(3);
      expect(body.data.interpretation.suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  /**
   * Test INT-4.2-002: Outbound interpretation saved with interpretation_type='outbound'
   */
  describe('INT-4.2-002: Database Persistence', () => {
    it('should save outbound interpretation with interpretation_type="outbound" in database', async () => {
      // Setup
      mockAuthSuccess('user-456');
      mockRateLimitAllowed();
      mockUsageLimitCheck(8);
      mockCostBudgetAllowed();

      // Mock LLM provider
      const mockLLMProvider = {
        interpret: vi.fn().mockResolvedValue({
          interpretation: {
            originalAnalysis: 'Analysis',
            suggestions: ['Suggestion 1', 'Suggestion 2', 'Suggestion 3'],
            optimizedMessage: 'Optimized',
            emotions: [
              { name: 'Happy', senderScore: 8, explanation: 'Positive tone' },
              { name: 'Grateful', senderScore: 7, explanation: 'Appreciative' },
              { name: 'Friendly', senderScore: 6, explanation: 'Warm' },
            ],
          },
          metadata: {
            costUsd: 0.009,
            responseTimeMs: 3200,
            tokenCount: 550,
            model: 'claude-sonnet-4-5-20250929',
          },
        }),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);
      vi.mocked(createInterpretation).mockResolvedValue({ id: 'int-789' } as any);
      vi.mocked(incrementUserUsage).mockResolvedValue({} as any);

      // Act
      const request = createMockRequest({
        message: 'Thanks for your help!',
        sender_culture: 'american',
        receiver_culture: 'british',
        mode: 'outbound',
      });

      await POST(request);

      // Assert: createInterpretation called with interpretation_type='outbound'
      expect(createInterpretation).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          culture_sender: 'american',
          culture_receiver: 'british',
          interpretation_type: 'outbound',
          cost_usd: 0.009,
          llm_provider: 'anthropic',
        })
      );
    });
  });

  /**
   * Test INT-4.2-003: Outbound interpretation increments usage count
   */
  describe('INT-4.2-003: Usage Tracking', () => {
    it('should increment messages_used_count for outbound interpretation', async () => {
      // Setup: Trial user with 8/10 messages used
      mockAuthSuccess('user-trial');
      mockRateLimitAllowed();
      mockUsageLimitCheck(2, 'trial'); // 2 messages remaining
      mockCostBudgetAllowed();

      // Mock LLM provider
      const mockLLMProvider = {
        interpret: vi.fn().mockResolvedValue({
          interpretation: {
            originalAnalysis: 'Analysis',
            suggestions: ['S1', 'S2', 'S3'],
            optimizedMessage: 'Optimized',
            emotions: [
              { name: 'E1', senderScore: 5, explanation: 'Exp' },
              { name: 'E2', senderScore: 6, explanation: 'Exp' },
              { name: 'E3', senderScore: 7, explanation: 'Exp' },
            ],
          },
          metadata: {
            costUsd: 0.007,
            responseTimeMs: 3000,
            tokenCount: 480,
            model: 'claude-sonnet-4-5-20250929',
          },
        }),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);
      vi.mocked(createInterpretation).mockResolvedValue({ id: 'int-usage' } as any);
      vi.mocked(incrementUserUsage).mockResolvedValue({
        messages_used_count: 9,
        tier: 'trial',
      } as any);

      // Act
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: incrementUserUsage called
      expect(incrementUserUsage).toHaveBeenCalledWith('user-trial');

      // Assert: messages_remaining decremented
      expect(body.metadata.messages_remaining).toBe(1); // 2 - 1 = 1
    });
  });

  /**
   * Test INT-4.2-004: Outbound interpretation tracked in cost circuit breaker
   */
  describe('INT-4.2-004: Cost Tracking', () => {
    it('should track LLM cost for outbound interpretation in circuit breaker', async () => {
      // Setup
      mockAuthSuccess('user-cost');
      mockRateLimitAllowed();
      mockUsageLimitCheck(5);
      mockCostBudgetAllowed();

      // Mock LLM provider with specific cost
      const outboundCost = 0.0092;
      const mockLLMProvider = {
        interpret: vi.fn().mockResolvedValue({
          interpretation: {
            originalAnalysis: 'Analysis',
            suggestions: ['S1', 'S2', 'S3'],
            optimizedMessage: 'Optimized',
            emotions: [
              { name: 'E1', senderScore: 5, explanation: 'Exp' },
              { name: 'E2', senderScore: 6, explanation: 'Exp' },
              { name: 'E3', senderScore: 7, explanation: 'Exp' },
            ],
          },
          metadata: {
            costUsd: outboundCost,
            responseTimeMs: 3500,
            tokenCount: 600,
            model: 'claude-sonnet-4-5-20250929',
          },
        }),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);
      vi.mocked(createInterpretation).mockResolvedValue({ id: 'int-cost' } as any);
      vi.mocked(incrementUserUsage).mockResolvedValue({} as any);

      // Act
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      await POST(request);

      // Assert: trackCost called with outbound cost
      expect(trackCost).toHaveBeenCalledWith('user-cost', outboundCost);
    });
  });

  /**
   * Test INT-4.2-005: Mixed inbound/outbound exhausts trial limit (AC #10)
   */
  describe('INT-4.2-005: Mixed Inbound/Outbound Tier Limits', () => {
    it('should exhaust trial limit with combination of inbound and outbound interpretations', async () => {
      // Setup: Trial user with 0 messages remaining (10/10 used)
      mockAuthSuccess('user-trial-limit');
      mockRateLimitAllowed();
      mockUsageLimitCheck(0, 'trial'); // No messages remaining

      // Act: Attempt 11th interpretation (outbound mode)
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: 403 LIMIT_EXCEEDED
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('LIMIT_EXCEEDED');

      // Verify LLM was NOT called
      expect(createLLMProvider).not.toHaveBeenCalled();
    });

    it('should count outbound and inbound interpretations toward same trial limit', async () => {
      // This test verifies the behavior conceptually - in reality, we'd track
      // usage across multiple API calls, but we can verify the limit check is mode-agnostic

      // Setup: Trial user with 1 message remaining
      mockAuthSuccess('user-trial-9');
      mockRateLimitAllowed();
      mockUsageLimitCheck(1, 'trial'); // 9/10 used, 1 remaining
      mockCostBudgetAllowed();

      // Mock LLM provider
      const mockLLMProvider = {
        interpret: vi.fn().mockResolvedValue({
          interpretation: {
            originalAnalysis: 'Analysis',
            suggestions: ['S1', 'S2', 'S3'],
            optimizedMessage: 'Optimized',
            emotions: [
              { name: 'E1', senderScore: 5, explanation: 'Exp' },
              { name: 'E2', senderScore: 6, explanation: 'Exp' },
              { name: 'E3', senderScore: 7, explanation: 'Exp' },
            ],
          },
          metadata: {
            costUsd: 0.008,
            responseTimeMs: 3000,
            tokenCount: 500,
            model: 'claude-sonnet-4-5-20250929',
          },
        }),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);
      vi.mocked(createInterpretation).mockResolvedValue({ id: 'int-10th' } as any);
      vi.mocked(incrementUserUsage).mockResolvedValue({
        messages_used_count: 10,
        tier: 'trial',
      } as any);

      // Act: 10th interpretation (outbound)
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: Success (10th message allowed)
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify remaining messages is 0
      expect(body.metadata.messages_remaining).toBe(0); // 1 - 1 = 0
    });
  });

  /**
   * Test INT-4.2-006: Invalid mode parameter returns 400 error
   */
  describe('INT-4.2-006: Invalid Mode Parameter', () => {
    it('should return 400 error for invalid mode parameter', async () => {
      // Setup
      mockAuthSuccess();
      mockRateLimitAllowed();

      // Act: Send request with invalid mode
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'invalid-mode', // Invalid mode
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: 400 validation error
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('mode');
      expect(body.error.message).toContain('inbound');
      expect(body.error.message).toContain('outbound');
    });

    it('should return 400 error for missing mode parameter', async () => {
      // Setup
      mockAuthSuccess();
      mockRateLimitAllowed();

      // Act: Send request without mode
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        // mode is missing
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: 400 validation error
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('mode');
    });
  });

  /**
   * Test INT-4.2-007: Malformed outbound LLM response returns 500 error
   */
  describe('INT-4.2-007: Malformed Outbound LLM Response', () => {
    it('should return 500 error when LLM returns invalid outbound response (missing originalAnalysis)', async () => {
      // Setup
      mockAuthSuccess();
      mockRateLimitAllowed();
      mockUsageLimitCheck(5);
      mockCostBudgetAllowed();

      // Mock LLM provider to return invalid outbound response
      const mockLLMProvider = {
        interpret: vi.fn().mockRejectedValue(
          new LLMParsingError('Missing or invalid originalAnalysis field in outbound response', {
            parsed: {
              // originalAnalysis is missing
              suggestions: ['S1', 'S2', 'S3'],
              optimizedMessage: 'Optimized',
              emotions: [],
            },
          })
        ),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);

      // Act
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: 500 internal error
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return 500 error when LLM returns outbound response with invalid suggestions count', async () => {
      // Setup
      mockAuthSuccess();
      mockRateLimitAllowed();
      mockUsageLimitCheck(5);
      mockCostBudgetAllowed();

      // Mock LLM provider to return outbound response with too few suggestions
      const mockLLMProvider = {
        interpret: vi.fn().mockRejectedValue(
          new LLMParsingError('Suggestions array must contain 3-5 items', {
            parsed: {
              originalAnalysis: 'Analysis',
              suggestions: ['S1', 'S2'], // Only 2 suggestions (need 3-5)
              optimizedMessage: 'Optimized',
              emotions: [],
            },
          })
        ),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);

      // Act
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: 500 internal error
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return 500 error when LLM returns outbound response with missing optimizedMessage', async () => {
      // Setup
      mockAuthSuccess();
      mockRateLimitAllowed();
      mockUsageLimitCheck(5);
      mockCostBudgetAllowed();

      // Mock LLM provider to return invalid outbound response
      const mockLLMProvider = {
        interpret: vi.fn().mockRejectedValue(
          new LLMParsingError('Missing or invalid optimizedMessage field in outbound response', {
            parsed: {
              originalAnalysis: 'Analysis',
              suggestions: ['S1', 'S2', 'S3'],
              // optimizedMessage is missing
              emotions: [],
            },
          })
        ),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);

      // Act
      const request = createMockRequest({
        message: 'Test',
        sender_culture: 'american',
        receiver_culture: 'american',
        mode: 'outbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: 500 internal error
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
