/**
 * Unit tests for Anthropic adapter outbound optimization parsing and validation.
 * Tests outbound response parsing, error handling, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAdapter } from '@/lib/llm/anthropicAdapter';
import { LLMParsingError } from '@/lib/llm/errors';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

// Mock environment variables
const originalEnv = process.env;

describe('AnthropicAdapter - Outbound Response Parsing', () => {
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

  it('should parse valid outbound response correctly (same culture)', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding and might be perceived as rude.',
            suggestions: [
              'Add "please" to make it more polite',
              'Use "would you be able to" instead of "can you"',
              'Provide a reason for the urgency',
            ],
            optimizedMessage: 'Would you be able to finish this by tomorrow? It would really help us meet the deadline. Thank you!',
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Pressing deadline' },
              { name: 'Impatience', senderScore: 5, explanation: 'Slightly demanding tone' },
              { name: 'Expectation', senderScore: 6, explanation: 'Assumes completion' },
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 200 },
    };

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
        message: 'Can you finish this by tomorrow?',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      },
      'outbound'
    );

    expect(result.interpretation).toHaveProperty('originalAnalysis');
    expect(result.interpretation).toHaveProperty('suggestions');
    expect(result.interpretation).toHaveProperty('optimizedMessage');
    expect(result.interpretation).toHaveProperty('emotions');

    const outboundResult = result.interpretation as {
      originalAnalysis: string;
      suggestions: string[];
      optimizedMessage: string;
      emotions: Array<{ name: string; senderScore: number }>;
    };

    expect(outboundResult.originalAnalysis).toContain('demanding');
    expect(outboundResult.suggestions).toHaveLength(3);
    expect(outboundResult.suggestions[0]).toContain('please');
    expect(outboundResult.optimizedMessage).toContain('Would you be able');
    expect(outboundResult.emotions).toHaveLength(3);
    expect(outboundResult.emotions[0].name).toBe('Urgency');
  });

  it('should parse valid outbound response correctly (cross culture)', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'American directness may be perceived as too blunt in Japanese culture.',
            suggestions: [
              'Use more indirect phrasing',
              'Add honorifics to show respect',
              'Soften the request with conditional language',
              'Express appreciation for their effort',
            ],
            optimizedMessage: 'I would be very grateful if you could possibly complete this by tomorrow. I understand this is a tight deadline.',
            emotions: [
              {
                name: 'Urgency',
                senderScore: 7,
                receiverScore: 9,
                explanation: 'Urgency perceived as more intense in Japanese context',
              },
              {
                name: 'Directness',
                senderScore: 6,
                receiverScore: 8,
                explanation: 'American directness may seem harsh',
              },
              {
                name: 'Expectation',
                senderScore: 5,
                receiverScore: 7,
                explanation: 'Higher expectation pressure in Japanese culture',
              },
            ],
          }),
        },
      ],
      usage: { input_tokens: 200, output_tokens: 250 },
    };

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
        message: 'Can you finish this by tomorrow?',
        senderCulture: 'american',
        receiverCulture: 'japanese',
        sameCulture: false,
      },
      'outbound'
    );

    const outboundResult = result.interpretation as {
      originalAnalysis: string;
      suggestions: string[];
      optimizedMessage: string;
      emotions: Array<{ name: string; senderScore: number; receiverScore: number }>;
    };

    expect(outboundResult.suggestions).toHaveLength(4);
    expect(outboundResult.emotions[0].receiverScore).toBeDefined();
    expect(outboundResult.emotions[0].receiverScore).toBe(9);
  });

  it('should throw LLMParsingError if originalAnalysis is missing', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            // Missing originalAnalysis
            suggestions: ['Add please', 'Use softer language'],
            optimizedMessage: 'Could you please finish this?',
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Urgent' },
              { name: 'Politeness', senderScore: 5, explanation: 'Polite' },
              { name: 'Expectation', senderScore: 6, explanation: 'Expected' },
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
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow(LLMParsingError);

    await expect(
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow('originalAnalysis');
  });

  it('should throw LLMParsingError if suggestions array is missing', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding.',
            // Missing suggestions
            optimizedMessage: 'Could you please finish this?',
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Urgent' },
              { name: 'Politeness', senderScore: 5, explanation: 'Polite' },
              { name: 'Expectation', senderScore: 6, explanation: 'Expected' },
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
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow(LLMParsingError);

    await expect(
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow('suggestions');
  });

  it('should throw LLMParsingError if suggestions array is empty', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding.',
            suggestions: [], // Empty array
            optimizedMessage: 'Could you please finish this?',
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Urgent' },
              { name: 'Politeness', senderScore: 5, explanation: 'Polite' },
              { name: 'Expectation', senderScore: 6, explanation: 'Expected' },
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
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow(LLMParsingError);

    await expect(
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow('3-5 items');
  });

  it('should throw LLMParsingError if suggestions array has less than 3 items', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding.',
            suggestions: ['Add please', 'Use softer language'], // Only 2 items
            optimizedMessage: 'Could you please finish this?',
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Urgent' },
              { name: 'Politeness', senderScore: 5, explanation: 'Polite' },
              { name: 'Expectation', senderScore: 6, explanation: 'Expected' },
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
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow(LLMParsingError);
  });

  it('should throw LLMParsingError if suggestions array has more than 5 items', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding.',
            suggestions: [
              'Add please',
              'Use softer language',
              'Add context',
              'Express gratitude',
              'Use conditional language',
              'Add honorifics', // 6 items - too many
            ],
            optimizedMessage: 'Could you please finish this?',
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Urgent' },
              { name: 'Politeness', senderScore: 5, explanation: 'Polite' },
              { name: 'Expectation', senderScore: 6, explanation: 'Expected' },
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
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow(LLMParsingError);
  });

  it('should throw LLMParsingError if optimizedMessage is missing', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding.',
            suggestions: ['Add please', 'Use softer language', 'Add context'],
            // Missing optimizedMessage
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Urgent' },
              { name: 'Politeness', senderScore: 5, explanation: 'Polite' },
              { name: 'Expectation', senderScore: 6, explanation: 'Expected' },
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
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow(LLMParsingError);

    await expect(
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow('optimizedMessage');
  });

  it('should throw LLMParsingError if emotions array is missing', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding.',
            suggestions: ['Add please', 'Use softer language', 'Add context'],
            optimizedMessage: 'Could you please finish this?',
            // Missing emotions
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
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow(LLMParsingError);

    await expect(
      adapter.interpret(
        {
          message: 'Can you finish this?',
          senderCulture: 'american',
          receiverCulture: 'american',
          sameCulture: true,
        },
        'outbound'
      )
    ).rejects.toThrow('emotions');
  });

  it('should accept exactly 5 suggestions (maximum boundary)', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding.',
            suggestions: [
              'Add please',
              'Use softer language',
              'Add context',
              'Express gratitude',
              'Use conditional language',
            ],
            optimizedMessage: 'Could you please finish this?',
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Urgent' },
              { name: 'Politeness', senderScore: 5, explanation: 'Polite' },
              { name: 'Expectation', senderScore: 6, explanation: 'Expected' },
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 150 },
    };

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
        message: 'Can you finish this?',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      },
      'outbound'
    );

    const outboundResult = result.interpretation as {
      suggestions: string[];
    };

    expect(outboundResult.suggestions).toHaveLength(5);
  });

  it('should accept exactly 3 suggestions (minimum boundary)', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            originalAnalysis: 'This message sounds demanding.',
            suggestions: ['Add please', 'Use softer language', 'Add context'],
            optimizedMessage: 'Could you please finish this?',
            emotions: [
              { name: 'Urgency', senderScore: 7, explanation: 'Urgent' },
              { name: 'Politeness', senderScore: 5, explanation: 'Polite' },
              { name: 'Expectation', senderScore: 6, explanation: 'Expected' },
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 150 },
    };

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
        message: 'Can you finish this?',
        senderCulture: 'american',
        receiverCulture: 'american',
        sameCulture: true,
      },
      'outbound'
    );

    const outboundResult = result.interpretation as {
      suggestions: string[];
    };

    expect(outboundResult.suggestions).toHaveLength(3);
  });
});
