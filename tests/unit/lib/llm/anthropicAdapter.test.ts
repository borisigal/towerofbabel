/**
 * Unit tests for Anthropic adapter response parsing and error handling.
 * Tests validation, malformed responses, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAdapter } from '@/lib/llm/anthropicAdapter';
import {
  LLMTimeoutError,
  LLMRateLimitError,
  LLMAuthError,
  LLMParsingError,
  LLMProviderError,
} from '@/lib/llm/errors';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

// Mock environment variables
const originalEnv = process.env;

describe('AnthropicAdapter - Constructor', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error if ANTHROPIC_API_KEY not set', () => {
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => new AnthropicAdapter()).toThrow('ANTHROPIC_API_KEY');
  });

  it('should use default model if LLM_MODEL not set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test123';
    delete process.env.LLM_MODEL;

    const adapter = new AnthropicAdapter();
    expect(adapter).toBeDefined();
  });

  it('should use default timeout if LLM_TIMEOUT_MS not set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test123';
    delete process.env.LLM_TIMEOUT_MS;

    const adapter = new AnthropicAdapter();
    expect(adapter).toBeDefined();
  });
});

describe('AnthropicAdapter - Response Parsing', () => {
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

  it('should parse valid JSON response correctly (same culture)', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'They are expressing gratitude.',
            culturalContext: 'In American culture, thank you is direct.',
            emotions: [
              { name: 'Gratitude', senderScore: 8, explanation: 'Clear thanks' },
              { name: 'Warmth', senderScore: 6, explanation: 'Friendly tone' },
              { name: 'Appreciation', senderScore: 7, explanation: 'Values help' },
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret({
      message: 'Thank you so much!',
      senderCulture: 'american',
      receiverCulture: 'american',
      sameCulture: true,
    });

    expect(result.interpretation.bottomLine).toBe('They are expressing gratitude.');
    expect(result.interpretation.emotions).toHaveLength(3);
    expect(result.interpretation.emotions[0].name).toBe('Gratitude');
    expect(result.interpretation.emotions[0].senderScore).toBe(8);
    expect(result.metadata.costUsd).toBeGreaterThan(0);
    expect(result.metadata.tokenCount).toBe(250);
  });

  it('should parse valid JSON response correctly (cross culture)', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'American directness may seem too casual.',
            culturalContext:
              'Americans express gratitude directly, Japanese prefer subtle acknowledgment.',
            emotions: [
              {
                name: 'Gratitude',
                senderScore: 8,
                receiverScore: 5,
                explanation: 'Less intense in Japanese context',
              },
              {
                name: 'Warmth',
                senderScore: 6,
                receiverScore: 4,
                explanation: 'Reserved in Japanese culture',
              },
              {
                name: 'Appreciation',
                senderScore: 7,
                receiverScore: 6,
                explanation: 'Similar but expressed differently',
              },
            ],
          }),
        },
      ],
      usage: { input_tokens: 200, output_tokens: 150 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret({
      message: 'I appreciate your hard work!',
      senderCulture: 'american',
      receiverCulture: 'japanese',
      sameCulture: false,
    });

    expect(result.interpretation.bottomLine).toBe(
      'American directness may seem too casual.'
    );
    expect(result.interpretation.emotions[0].receiverScore).toBe(5);
  });

  it('should parse response with markdown code blocks correctly', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: '```json\n' + JSON.stringify({
            bottomLine: 'They are grateful.',
            culturalContext: 'Direct expression.',
            emotions: [
              { name: 'Gratitude', senderScore: 8 },
              { name: 'Warmth', senderScore: 6 },
              { name: 'Joy', senderScore: 5 },
            ],
          }) + '\n```',
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret({
      message: 'Thank you!',
      senderCulture: 'american',
      receiverCulture: 'american',
      sameCulture: true,
    });

    expect(result.interpretation.bottomLine).toBe('They are grateful.');
  });

  it('should throw LLMParsingError for malformed JSON', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: 'This is not valid JSON {invalid',
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMParsingError);
  });

  it('should throw LLMParsingError for missing bottomLine field', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            // Missing bottomLine
            culturalContext: 'Some context.',
            emotions: [{ name: 'Happy', senderScore: 5 }],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMParsingError);
  });

  it('should throw LLMParsingError for missing culturalContext field', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Some text.',
            // Missing culturalContext
            emotions: [{ name: 'Happy', senderScore: 5 }],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMParsingError);
  });

  it('should throw LLMParsingError for empty emotions array', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Some text.',
            culturalContext: 'Some context.',
            emotions: [], // Empty array
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMParsingError);
  });

  it('should throw LLMParsingError for emotion score out of range (< 0)', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Some text.',
            culturalContext: 'Some context.',
            emotions: [
              { name: 'Happy', senderScore: -1 }, // Invalid score
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMParsingError);
  });

  it('should throw LLMParsingError for emotion score out of range (> 10)', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Some text.',
            culturalContext: 'Some context.',
            emotions: [
              { name: 'Happy', senderScore: 11 }, // Invalid score
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMParsingError);
  });

  it('should throw LLMParsingError for missing receiverScore in cross-culture', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Some text.',
            culturalContext: 'Some context.',
            emotions: [
              { name: 'Happy', senderScore: 5 }, // Missing receiverScore
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'japanese',
        sameCulture: false, // Cross-culture requires receiverScore
      })
    ).rejects.toThrow(LLMParsingError);
  });

  it('should limit emotions to top 3 if more provided', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Some text.',
            culturalContext: 'Some context.',
            emotions: [
              { name: 'Emotion1', senderScore: 8 },
              { name: 'Emotion2', senderScore: 7 },
              { name: 'Emotion3', senderScore: 6 },
              { name: 'Emotion4', senderScore: 5 },
              { name: 'Emotion5', senderScore: 4 },
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret({
      message: 'Test',
      senderCulture: 'american',
      receiverCulture: 'american',
      sameCulture: true,
    });

    // Should only include top 3
    expect(result.interpretation.emotions).toHaveLength(3);
    expect(result.interpretation.emotions[0].name).toBe('Emotion1');
    expect(result.interpretation.emotions[2].name).toBe('Emotion3');
  });
});

describe('AnthropicAdapter - Cost Calculation', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'sk-ant-test123',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should calculate cost correctly based on token usage', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            bottomLine: 'Test',
            culturalContext: 'Test',
            emotions: [{ name: 'Happy', senderScore: 5 }],
          }),
        },
      ],
      usage: { input_tokens: 1000, output_tokens: 500 },
    };

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockResolvedValue(mockResponse);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();
    const result = await adapter.interpret({
      message: 'Test',
      senderCulture: 'american',
      receiverCulture: 'american',
      sameCulture: true,
    });

    // Claude Sonnet 4.5 pricing: $3/1M input, $15/1M output
    // Cost = (1000/1M * $3) + (500/1M * $15) = $0.003 + $0.0075 = $0.0105
    expect(result.metadata.costUsd).toBeCloseTo(0.0105, 4);
  });
});

describe('AnthropicAdapter - Error Handling', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'sk-ant-test123',
      LLM_TIMEOUT_MS: '100', // Short timeout for testing
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should throw LLMTimeoutError when request exceeds timeout', async () => {
    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            reject(error);
          }, 150); // Longer than 100ms timeout
        })
    );
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMTimeoutError);
  });

  it('should throw LLMRateLimitError for 429 status', async () => {
    // Create a proper Anthropic APIError instance
    const apiError: unknown = Object.assign(new Error('Rate limit exceeded'), {
      status: 429,
      headers: { 'retry-after': '60' },
      type: 'rate_limit_error',
    });

    // Make instanceof check work
    Object.setPrototypeOf(apiError, Anthropic.APIError.prototype);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockRejectedValue(apiError);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMRateLimitError);
  });

  it('should include retry-after value in LLMRateLimitError', async () => {
    // Create a proper Anthropic APIError instance
    const apiError: unknown = Object.assign(new Error('Rate limit exceeded'), {
      status: 429,
      headers: { 'retry-after': '60' },
      type: 'rate_limit_error',
    });

    // Make instanceof check work
    Object.setPrototypeOf(apiError, Anthropic.APIError.prototype);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockRejectedValue(apiError);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    try {
      await adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      });
      // Should not reach here
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMRateLimitError);
      expect((error as LLMRateLimitError).retryAfter).toBe(60);
    }
  });

  it('should throw LLMAuthError for 401 status (invalid API key)', async () => {
    // Create a proper Anthropic APIError instance
    const apiError: unknown = Object.assign(new Error('Invalid API key'), {
      status: 401,
      headers: {},
      type: 'authentication_error',
    });

    // Make instanceof check work
    Object.setPrototypeOf(apiError, Anthropic.APIError.prototype);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockRejectedValue(apiError);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMAuthError);
  });

  it('should throw LLMProviderError for 500 status (generic API error)', async () => {
    // Create a proper Anthropic APIError instance
    const apiError: unknown = Object.assign(new Error('Internal server error'), {
      status: 500,
      headers: {},
      type: 'internal_server_error',
    });

    // Make instanceof check work
    Object.setPrototypeOf(apiError, Anthropic.APIError.prototype);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockRejectedValue(apiError);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMProviderError);
  });

  it('should include status code in LLMProviderError', async () => {
    // Create a proper Anthropic APIError instance
    const apiError: unknown = Object.assign(new Error('Service temporarily unavailable'), {
      status: 503,
      headers: {},
      type: 'service_unavailable',
    });

    // Make instanceof check work
    Object.setPrototypeOf(apiError, Anthropic.APIError.prototype);

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockRejectedValue(apiError);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    try {
      await adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      });
      // Should not reach here
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMProviderError);
      expect((error as LLMProviderError).statusCode).toBe(503);
    }
  });

  it('should throw LLMProviderError for network errors', async () => {
    const networkError = new Error('Network request failed');

    const MockedAnthropic = Anthropic as unknown as vi.MockedClass<
      typeof Anthropic
    >;
    const mockCreate = vi.fn().mockRejectedValue(networkError);
    MockedAnthropic.prototype.messages = {
      create: mockCreate,
    } as unknown as typeof MockedAnthropic.prototype.messages;

    const adapter = new AnthropicAdapter();

    await expect(
      adapter.interpret({
        message: 'Test',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      })
    ).rejects.toThrow(LLMProviderError);
  });
});
