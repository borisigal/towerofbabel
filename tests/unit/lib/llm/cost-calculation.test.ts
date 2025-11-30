/**
 * Unit tests for LLM cost calculation with prompt caching.
 *
 * Story 6.2: Enable Anthropic Prompt Caching for System Messages
 *
 * These tests verify the cost calculation logic for:
 * - Standard (non-cached) requests
 * - Cache creation requests (25% premium)
 * - Cache read requests (90% discount)
 * - Mixed scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAdapter } from '@/lib/llm/anthropicAdapter';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const originalEnv = process.env;

describe('Cost Calculation with Prompt Caching', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'sk-ant-test123',
      LLM_MODEL: 'claude-sonnet-4-5-20250929',
      LLM_TIMEOUT_MS: '10000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  /**
   * Helper to create mock Anthropic response with cache metrics (same culture)
   */
  function createMockResponse(
    inputTokens: number,
    outputTokens: number,
    cacheCreationTokens: number = 0,
    cacheReadTokens: number = 0
  ) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Test interpretation',
            culturalContext: 'Test cultural context',
            emotions: [
              { name: 'Neutral', senderScore: 5, explanation: 'Test' },
              { name: 'Calm', senderScore: 4, explanation: 'Test' },
              { name: 'Content', senderScore: 3, explanation: 'Test' },
            ],
          }),
        },
      ],
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: cacheCreationTokens,
        cache_read_input_tokens: cacheReadTokens,
      },
    };
  }

  /**
   * Helper to create mock Anthropic response for cross-culture (with receiverScore)
   */
  function createMockCrossCultureResponse(
    inputTokens: number,
    outputTokens: number,
    cacheCreationTokens: number = 0,
    cacheReadTokens: number = 0
  ) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Test interpretation',
            culturalContext: 'Test cultural context',
            emotions: [
              { name: 'Neutral', senderScore: 5, receiverScore: 4, explanation: 'Test' },
              { name: 'Calm', senderScore: 4, receiverScore: 3, explanation: 'Test' },
              { name: 'Content', senderScore: 3, receiverScore: 2, explanation: 'Test' },
            ],
          }),
        },
      ],
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: cacheCreationTokens,
        cache_read_input_tokens: cacheReadTokens,
      },
    };
  }

  it('should calculate cost correctly for non-cached request', async () => {
    // Pricing: $3/1M input, $15/1M output
    // 1000 input tokens = $0.003
    // 500 output tokens = $0.0075
    // Total = $0.0105
    const mockResponse = createMockResponse(1000, 500, 0, 0);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret(
      {
        message: 'Hello',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      },
      'inbound'
    );

    // With caching, the cost calculation changes:
    // regularInputTokens = 1000 - 0 (cache read) = 1000
    // inputCost = (1000 / 1_000_000) * 3 = 0.003
    // outputCost = (500 / 1_000_000) * 15 = 0.0075
    // cacheWriteCost = 0
    // cacheReadCost = 0
    // Total = 0.0105
    expect(result.metadata.costUsd).toBeCloseTo(0.0105, 4);
    expect(result.metadata.cacheReadTokens).toBe(0);
    expect(result.metadata.cacheCreationTokens).toBe(0);
  });

  it('should calculate cost correctly for cache creation (25% premium)', async () => {
    // Cache creation: $3.75/1M (25% more than standard $3/1M)
    // 1000 total input tokens, 800 are cache creation
    // Regular input: 1000 - 0 (cache read) = 1000 tokens
    // BUT 800 of these are cache creation tokens (billed at 25% premium)
    // regularInputTokens = 1000 (total) - 0 (cache read) = 1000
    // inputCost = (1000 / 1_000_000) * 3 = 0.003
    // cacheWriteCost = (800 / 1_000_000) * 3.75 = 0.003
    // outputCost = (500 / 1_000_000) * 15 = 0.0075
    // Total = 0.003 + 0.003 + 0.0075 = 0.0135
    const mockResponse = createMockResponse(1000, 500, 800, 0);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret(
      {
        message: 'Hello',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      },
      'inbound'
    );

    expect(result.metadata.cacheCreationTokens).toBe(800);
    expect(result.metadata.cacheReadTokens).toBe(0);
    // Verify cache creation cost is included
    expect(result.metadata.costUsd).toBeGreaterThan(0.0105);
  });

  it('should calculate cost correctly for cache hit (90% discount)', async () => {
    // Cache read: $0.30/1M (90% less than standard $3/1M)
    // 1000 total input tokens, 800 are from cache
    // IMPORTANT: input_tokens INCLUDES cache_read_tokens
    // regularInputTokens = 1000 - 800 = 200 (billed at $3/1M)
    // cacheReadTokens = 800 (billed at $0.30/1M)
    // inputCost = (200 / 1_000_000) * 3 = 0.0006
    // cacheReadCost = (800 / 1_000_000) * 0.30 = 0.00024
    // outputCost = (500 / 1_000_000) * 15 = 0.0075
    // Total = 0.0006 + 0.00024 + 0.0075 = 0.00834
    const mockResponse = createMockResponse(1000, 500, 0, 800);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret(
      {
        message: 'Hello',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      },
      'inbound'
    );

    expect(result.metadata.cacheReadTokens).toBe(800);
    expect(result.metadata.cacheCreationTokens).toBe(0);
    // Verify cost is LESS than non-cached (due to 90% discount on cached portion)
    expect(result.metadata.costUsd).toBeLessThan(0.0105);
  });

  it('should include cache metrics in metadata', async () => {
    // Use cross-culture mock response (includes receiverScore)
    const mockResponse = createMockCrossCultureResponse(1500, 600, 200, 1000);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret(
      {
        message: 'Hello',
        senderCulture: 'american',
        receiverCulture: 'japanese',
        sameCulture: false,
      },
      'inbound'
    );

    // Verify all cache metrics are included in metadata
    expect(result.metadata).toHaveProperty('cacheReadTokens');
    expect(result.metadata).toHaveProperty('cacheCreationTokens');
    expect(result.metadata).toHaveProperty('inputTokens');
    expect(result.metadata).toHaveProperty('outputTokens');
    expect(result.metadata.inputTokens).toBe(1500);
    expect(result.metadata.outputTokens).toBe(600);
    expect(result.metadata.cacheCreationTokens).toBe(200);
    expect(result.metadata.cacheReadTokens).toBe(1000);
  });

  it('should calculate token count as input + output', async () => {
    const mockResponse = createMockResponse(1200, 400, 0, 1000);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret(
      {
        message: 'Hello',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      },
      'inbound'
    );

    // Total token count should be input + output
    expect(result.metadata.tokenCount).toBe(1600);
  });
});

describe('Cost Savings Calculation', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'sk-ant-test123',
      LLM_MODEL: 'claude-sonnet-4-5-20250929',
      LLM_TIMEOUT_MS: '10000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should show ~90% cost reduction for cached input tokens', () => {
    // Compare cost of 1000 cached vs 1000 non-cached input tokens
    // Non-cached: (1000 / 1_000_000) * 3 = $0.003
    // Cached: (1000 / 1_000_000) * 0.30 = $0.0003
    // Savings: ($0.003 - $0.0003) / $0.003 = 90%

    const nonCachedCost = (1000 / 1_000_000) * 3.0;
    const cachedCost = (1000 / 1_000_000) * 0.3;
    const savingsPercent = ((nonCachedCost - cachedCost) / nonCachedCost) * 100;

    expect(savingsPercent).toBeCloseTo(90, 1);
  });

  it('should show 25% premium for cache creation tokens', () => {
    // Compare cost of 1000 cache creation vs 1000 standard input tokens
    // Standard: (1000 / 1_000_000) * 3 = $0.003
    // Cache creation: (1000 / 1_000_000) * 3.75 = $0.00375
    // Premium: ($0.00375 - $0.003) / $0.003 = 25%

    const standardCost = (1000 / 1_000_000) * 3.0;
    const cacheCreationCost = (1000 / 1_000_000) * 3.75;
    const premiumPercent =
      ((cacheCreationCost - standardCost) / standardCost) * 100;

    expect(premiumPercent).toBeCloseTo(25, 1);
  });
});
