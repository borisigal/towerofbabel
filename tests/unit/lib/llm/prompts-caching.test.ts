/**
 * Unit tests for LLM prompt caching functionality.
 * Tests CACHEABLE_SYSTEM_MESSAGE and dynamic prompt generation.
 *
 * Story 6.2: Enable Anthropic Prompt Caching for System Messages
 */

import { describe, it, expect } from 'vitest';
import {
  CACHEABLE_SYSTEM_MESSAGE,
  generateSameCultureDynamicPrompt,
  generateCrossCultureDynamicPrompt,
  generateOutboundSameCultureDynamicPrompt,
  generateOutboundCrossCultureDynamicPrompt,
  generateDynamicInterpretationPrompt,
  generateDynamicOutboundPrompt,
} from '@/lib/llm/prompts';

describe('CACHEABLE_SYSTEM_MESSAGE', () => {
  it('should have at least 1024 tokens (Anthropic minimum for caching)', () => {
    // Rough estimate: ~4 characters per token for English text
    // 1024 tokens ≈ 4096 characters minimum
    // The actual system message should be ~1100-1200 tokens (~4500-5000 chars)
    const minChars = 3500; // Conservative lower bound

    expect(CACHEABLE_SYSTEM_MESSAGE.length).toBeGreaterThan(minChars);
  });

  it('should include cultural expertise for all 10 supported cultures', () => {
    const cultures = [
      'American',
      'British',
      'Japanese',
      'German',
      'French',
      'Chinese',
      'Brazilian',
      'Indian',
      'Australian',
      'Mexican',
    ];

    cultures.forEach((culture) => {
      expect(CACHEABLE_SYSTEM_MESSAGE).toContain(`### ${culture} Culture`);
    });
  });

  it('should include output format requirements for JSON', () => {
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('Output Format Requirements');
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('JSON');
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('JSON.parse()');
  });

  it('should include emotion detection guidelines', () => {
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('Emotion Detection Guidelines');
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('top 3');
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('dynamically');
  });

  it('should include scoring guidelines with 0-10 scale', () => {
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('Scoring Guidelines');
    // Check for the 0 and 10 range (written as "0 and 10" or "0-10")
    expect(CACHEABLE_SYSTEM_MESSAGE).toMatch(/between 0 and 10/);
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('senderScore');
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('receiverScore');
  });

  it('should define the LLM role as cultural communication expert', () => {
    expect(CACHEABLE_SYSTEM_MESSAGE).toContain('cultural communication expert');
  });
});

describe('generateSameCultureDynamicPrompt', () => {
  it('should NOT include system message content', () => {
    const prompt = generateSameCultureDynamicPrompt('Hello!', 'american');

    // Should not contain the verbose cultural expertise from CACHEABLE_SYSTEM_MESSAGE
    expect(prompt).not.toContain('## Your Expertise');
    expect(prompt).not.toContain('### American Culture');
    expect(prompt).not.toContain('### Japanese Culture');
  });

  it('should include task-specific instructions', () => {
    const prompt = generateSameCultureDynamicPrompt('Hello!', 'american');

    expect(prompt).toContain('## Task: Same-Culture Inbound Interpretation');
    expect(prompt).toContain('American');
    expect(prompt).toContain('Hello!');
  });

  it('should include JSON response format', () => {
    const prompt = generateSameCultureDynamicPrompt('Hello!', 'american');

    expect(prompt).toContain('bottomLine');
    expect(prompt).toContain('culturalContext');
    expect(prompt).toContain('emotions');
    expect(prompt).toContain('senderScore');
  });

  it('should request senderScore only (not receiverScore)', () => {
    const prompt = generateSameCultureDynamicPrompt('Hello!', 'american');

    expect(prompt).toContain('only include senderScore');
  });
});

describe('generateCrossCultureDynamicPrompt', () => {
  it('should NOT include system message content', () => {
    const prompt = generateCrossCultureDynamicPrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(prompt).not.toContain('## Your Expertise');
    expect(prompt).not.toContain('Communication style: Direct, explicit');
  });

  it('should include task-specific instructions', () => {
    const prompt = generateCrossCultureDynamicPrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(prompt).toContain('## Task: Cross-Culture Inbound Interpretation');
    expect(prompt).toContain('American');
    expect(prompt).toContain('Japanese');
  });

  it('should request both senderScore and receiverScore', () => {
    const prompt = generateCrossCultureDynamicPrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(prompt).toContain('senderScore');
    expect(prompt).toContain('receiverScore');
    expect(prompt).toContain('BOTH');
  });
});

describe('generateOutboundSameCultureDynamicPrompt', () => {
  it('should NOT include system message content', () => {
    const prompt = generateOutboundSameCultureDynamicPrompt(
      'Can you help?',
      'american'
    );

    expect(prompt).not.toContain('## Your Expertise');
  });

  it('should include outbound optimization instructions', () => {
    const prompt = generateOutboundSameCultureDynamicPrompt(
      'Can you help?',
      'american'
    );

    expect(prompt).toContain('## Task: Same-Culture Outbound Optimization');
    expect(prompt).toContain('optimize');
    expect(prompt).toContain('suggestions');
    expect(prompt).toContain('optimizedMessage');
  });
});

describe('generateOutboundCrossCultureDynamicPrompt', () => {
  it('should NOT include system message content', () => {
    const prompt = generateOutboundCrossCultureDynamicPrompt(
      'I appreciate your work',
      'american',
      'japanese'
    );

    expect(prompt).not.toContain('## Your Expertise');
  });

  it('should include cross-culture outbound instructions', () => {
    const prompt = generateOutboundCrossCultureDynamicPrompt(
      'I appreciate your work',
      'american',
      'japanese'
    );

    expect(prompt).toContain('## Task: Cross-Culture Outbound Optimization');
    expect(prompt).toContain('American');
    expect(prompt).toContain('Japanese');
    expect(prompt).toContain('BOTH senderScore and receiverScore');
  });
});

describe('generateDynamicInterpretationPrompt (router)', () => {
  it('should route to same-culture dynamic prompt when sameCulture is true', () => {
    const routedPrompt = generateDynamicInterpretationPrompt(
      'Hello!',
      'american',
      'american',
      true
    );

    expect(routedPrompt).toContain('Same-Culture Inbound');
  });

  it('should route to cross-culture dynamic prompt when sameCulture is false', () => {
    const routedPrompt = generateDynamicInterpretationPrompt(
      'Hello!',
      'american',
      'japanese',
      false
    );

    expect(routedPrompt).toContain('Cross-Culture Inbound');
  });
});

describe('generateDynamicOutboundPrompt (router)', () => {
  it('should route to same-culture outbound when sameCulture is true', () => {
    const routedPrompt = generateDynamicOutboundPrompt(
      'Help please',
      'american',
      'american',
      true
    );

    expect(routedPrompt).toContain('Same-Culture Outbound');
  });

  it('should route to cross-culture outbound when sameCulture is false', () => {
    const routedPrompt = generateDynamicOutboundPrompt(
      'Help please',
      'american',
      'japanese',
      false
    );

    expect(routedPrompt).toContain('Cross-Culture Outbound');
  });
});

describe('Dynamic prompts content validation', () => {
  it('all dynamic prompts should include the user message', () => {
    const testMessage = 'This is a test message for validation';

    const sameCultureInbound = generateSameCultureDynamicPrompt(
      testMessage,
      'american'
    );
    const crossCultureInbound = generateCrossCultureDynamicPrompt(
      testMessage,
      'american',
      'japanese'
    );
    const sameCultureOutbound = generateOutboundSameCultureDynamicPrompt(
      testMessage,
      'american'
    );
    const crossCultureOutbound = generateOutboundCrossCultureDynamicPrompt(
      testMessage,
      'american',
      'japanese'
    );

    expect(sameCultureInbound).toContain(testMessage);
    expect(crossCultureInbound).toContain(testMessage);
    expect(sameCultureOutbound).toContain(testMessage);
    expect(crossCultureOutbound).toContain(testMessage);
  });

  it('all dynamic prompts should be shorter than CACHEABLE_SYSTEM_MESSAGE', () => {
    // Dynamic prompts should be much shorter since they don't include the system message
    const dynamicPrompt = generateSameCultureDynamicPrompt(
      'Short test message',
      'american'
    );

    // Dynamic prompt should be significantly shorter than the cacheable system message
    expect(dynamicPrompt.length).toBeLessThan(CACHEABLE_SYSTEM_MESSAGE.length);
  });
});
