/**
 * Integration Tests for /api/interpret Endpoint
 *
 * Tests full request/response cycle including:
 * - Authentication
 * - Rate limiting
 * - Request validation
 * - Usage limit checking
 * - Cost circuit breaker
 * - LLM integration
 * - Database persistence
 *
 * Story 2.3 - Task 17
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
import { LLMTimeoutError, LLMRateLimitError } from '@/lib/llm/errors';

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

describe('/api/interpret - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Interpretation Request', () => {
    it('should return 200 OK with interpretation for authenticated user with valid request', async () => {
      // Mock authentication success
      const mockUser = {
        id: 'user-123',
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

      // Mock rate limit - allowed
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 50,
        remaining: 45,
        reset: Date.now() / 1000 + 3600,
      });

      // Mock usage check - allowed (Pro user with messages remaining)
      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true,
        messagesRemaining: 50,
      });

      // Mock cost circuit breaker - allowed
      vi.mocked(checkCostBudget).mockResolvedValue({
        allowed: true,
      });

      // Mock LLM provider
      const mockLLMProvider = {
        interpret: vi.fn().mockResolvedValue({
          interpretation: {
            bottomLine: 'This message expresses gratitude.',
            culturalContext:
              'American culture values explicit appreciation.',
            emotions: [
              {
                name: 'Gratitude',
                senderScore: 8,
                receiverScore: 7,
                explanation: 'Strong appreciation for help.',
              },
            ],
          },
          metadata: {
            costUsd: 0.0075,
            responseTimeMs: 3200,
            tokenCount: 450,
            model: 'claude-sonnet-4-5-20250929',
          },
        }),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);

      // Mock persistence
      vi.mocked(createInterpretation).mockResolvedValue({
        id: 'interpretation-123',
        user_id: 'user-123',
        timestamp: new Date(),
        cost_usd: 0.0075,
        response_time_ms: 3200,
      } as any);

      vi.mocked(incrementUserUsage).mockResolvedValue({
        messages_used_count: 51,
        tier: 'pro',
      } as any);

      // Act: Send request
      const request = createMockRequest({
        message: 'Thank you for your help!',
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      // Assert: Success response
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.interpretation.bottomLine).toBe(
        'This message expresses gratitude.'
      );
      expect(body.metadata.messages_remaining).toBe(49); // 50 - 1

      // Verify cost was tracked
      expect(trackCost).toHaveBeenCalledWith('user-123', 0.0075);

      // Verify interpretation was saved
      expect(createInterpretation).toHaveBeenCalled();

      // Verify usage was incremented
      expect(incrementUserUsage).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Authentication Errors', () => {
    it('should return 401 Unauthorized when user not authenticated', async () => {
      // Mock authentication failure
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      };

      vi.mocked(createClient).mockReturnValue(
        mockSupabaseClient as ReturnType<typeof createClient>
      );

      const request = createMockRequest({
        message: 'Test message',
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 Too Many Requests when rate limit exceeded', async () => {
      // Mock authentication success
      const mockUser = { id: 'user-123', email: 'test@example.com' };
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

      // Mock rate limit exceeded
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        limit: 50,
        remaining: 0,
        reset: Date.now() / 1000 + 3600,
      });

      const request = createMockRequest({
        message: 'Test message',
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMITED');

      // Verify rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBe('50');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      // Mock successful auth and rate limit for validation tests
      const mockUser = { id: 'user-123', email: 'test@example.com' };
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

      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 50,
        remaining: 45,
        reset: Date.now() / 1000 + 3600,
      });
    });

    it('should return 400 Bad Request when message missing', async () => {
      const request = createMockRequest({
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('message');
    });

    it('should return 400 Bad Request when message exceeds 2000 characters', async () => {
      const longMessage = 'a'.repeat(2001);

      const request = createMockRequest({
        message: longMessage,
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('2000 characters');
    });

    it('should return 400 Bad Request when sender_culture invalid', async () => {
      const request = createMockRequest({
        message: 'Test message',
        sender_culture: 'klingon', // Invalid culture
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('sender_culture');
    });
  });

  describe('Usage Limit Enforcement', () => {
    beforeEach(() => {
      // Mock successful auth and rate limit
      const mockUser = { id: 'user-123', email: 'test@example.com' };
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

      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 50,
        remaining: 45,
        reset: Date.now() / 1000 + 3600,
      });
    });

    it('should return 403 Forbidden when trial user exhausted limit', async () => {
      // Mock usage limit exceeded
      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: false,
        messagesRemaining: 0,
        error: 'TRIAL_LIMIT_EXCEEDED',
        message: 'Trial limit of 10 messages exceeded.',
      });

      const request = createMockRequest({
        message: 'Test message',
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TRIAL_LIMIT_EXCEEDED');
    });
  });

  describe('Cost Circuit Breaker', () => {
    beforeEach(() => {
      // Mock successful auth, rate limit, and usage check
      const mockUser = { id: 'user-123', email: 'test@example.com' };
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

      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 50,
        remaining: 45,
        reset: Date.now() / 1000 + 3600,
      });

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true,
        messagesRemaining: 50,
      });
    });

    it('should return 503 Service Unavailable when cost circuit breaker triggered', async () => {
      // Mock cost circuit breaker triggered
      vi.mocked(checkCostBudget).mockResolvedValue({
        allowed: false,
        reason: 'Daily cost limit exceeded',
        layer: 'daily',
        currentCost: 52,
        limit: 50,
      });

      const request = createMockRequest({
        message: 'Test message',
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SERVICE_OVERLOADED');
    });
  });

  describe('LLM Error Handling', () => {
    beforeEach(() => {
      // Mock successful auth, rate limit, usage, and cost check
      const mockUser = { id: 'user-123', email: 'test@example.com' };
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

      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        limit: 50,
        remaining: 45,
        reset: Date.now() / 1000 + 3600,
      });

      vi.mocked(checkUsageLimit).mockResolvedValue({
        allowed: true,
        messagesRemaining: 50,
      });

      vi.mocked(checkCostBudget).mockResolvedValue({
        allowed: true,
      });
    });

    it('should return 504 Gateway Timeout when LLM request times out', async () => {
      // Mock LLM timeout error
      const mockLLMProvider = {
        interpret: vi.fn().mockRejectedValue(new LLMTimeoutError()),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);

      const request = createMockRequest({
        message: 'Test message',
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(504);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('LLM_TIMEOUT');
    });

    it('should return 429 Too Many Requests when LLM rate limit hit', async () => {
      // Mock LLM rate limit error
      const mockLLMProvider = {
        interpret: vi.fn().mockRejectedValue(new LLMRateLimitError()),
      };

      vi.mocked(createLLMProvider).mockReturnValue(mockLLMProvider as any);

      const request = createMockRequest({
        message: 'Test message',
        sender_culture: 'american',
        receiver_culture: 'japanese',
        mode: 'inbound',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('LLM_RATE_LIMITED');
    });
  });
});
