/**
 * Unit tests for LLM outbound optimization prompt generation.
 * Tests same-culture and cross-culture outbound prompt templates.
 */

import { describe, it, expect } from 'vitest';
import {
  generateOutboundSameCulturePrompt,
  generateOutboundCrossCulturePrompt,
  generateOutboundOptimizationPrompt,
} from '@/lib/llm/prompts';

describe('generateOutboundSameCulturePrompt', () => {
  it('should include "explain like you\'re talking to a 14-year-old" instruction', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt).toContain('14-year-old');
  });

  it('should mention "optimize" and "improve" keywords', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt.toLowerCase()).toContain('optimize');
    expect(prompt.toLowerCase()).toContain('improve');
  });

  it('should include JSON schema for outbound response', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt).toContain('originalAnalysis');
    expect(prompt).toContain('suggestions');
    expect(prompt).toContain('optimizedMessage');
    expect(prompt).toContain('emotions');
    expect(prompt).toContain('JSON');
  });

  it('should request 3-5 specific suggestions', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt).toContain('3-5');
    expect(prompt).toContain('specific');
    expect(prompt.toLowerCase()).toContain('suggestion');
  });

  it('should instruct dynamic emotion detection (not preset list)', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt).toContain('detect');
    expect(prompt).toContain('dynamically');
    expect(prompt.toLowerCase()).toContain('preset');
  });

  it('should request single emotion scores (senderScore only) for same culture', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt).toContain('senderScore');
    expect(prompt).toContain('only include senderScore (not receiverScore)');
  });

  it('should include culture name correctly', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'japanese');

    expect(prompt).toContain('Japanese');
  });

  it('should request exactly 3 emotions', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt).toContain('top 3 emotions');
    expect(prompt).toContain('exactly 3 emotions');
  });

  it('should include the message text in the prompt', () => {
    const message = 'Can you finish this by tomorrow?';
    const prompt = generateOutboundSameCulturePrompt(message, 'american');

    expect(prompt).toContain(message);
  });

  it('should instruct to avoid vague suggestions like "be nicer"', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt.toLowerCase()).toContain('not vague');
    expect(prompt.toLowerCase()).toContain('be nicer');
  });

  it('should request natural, not robotic language for optimizedMessage', () => {
    const prompt = generateOutboundSameCulturePrompt('Can you finish this by tomorrow?', 'american');

    expect(prompt.toLowerCase()).toContain('natural');
    expect(prompt.toLowerCase()).toContain('robotic');
  });
});

describe('generateOutboundCrossCulturePrompt', () => {
  it('should emphasize cultural differences and bridging gaps', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt.toLowerCase()).toContain('cultural');
    expect(prompt.toLowerCase()).toContain('difference');
    expect(prompt.toLowerCase()).toContain('bridge');
  });

  it('should request dual emotion scores (senderScore and receiverScore)', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt).toContain('senderScore');
    expect(prompt).toContain('receiverScore');
    expect(prompt).toContain('BOTH');
  });

  it('should include JSON schema for outbound response', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt).toContain('originalAnalysis');
    expect(prompt).toContain('suggestions');
    expect(prompt).toContain('optimizedMessage');
    expect(prompt).toContain('emotions');
    expect(prompt).toContain('JSON');
  });

  it('should instruct dynamic emotion detection (not preset list)', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt).toContain('detect');
    expect(prompt).toContain('dynamically');
  });

  it('should include both sender and receiver culture names', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt).toContain('American');
    expect(prompt).toContain('Japanese');
  });

  it('should request exactly 3 emotions', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt).toContain('top 3 emotions');
    expect(prompt).toContain('exactly 3 emotions');
  });

  it('should include the message text in the prompt', () => {
    const message = 'I appreciate your hard work on this project.';
    const prompt = generateOutboundCrossCulturePrompt(message, 'american', 'japanese');

    expect(prompt).toContain(message);
  });

  it('should mention how message might be misunderstood across cultures', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt.toLowerCase()).toContain('misunderstood');
    expect(prompt.toLowerCase()).toContain('resonate');
  });

  it('should request culturally-specific improvements', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt.toLowerCase()).toContain('culturally-specific');
    expect(prompt.toLowerCase()).toContain('culturally specific');
  });

  it('should request 3-5 suggestions', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt).toContain('3-5');
  });

  it('should explain cross-culture emotion expression differences', () => {
    const prompt = generateOutboundCrossCulturePrompt(
      'I appreciate your hard work on this project.',
      'american',
      'japanese'
    );

    expect(prompt.toLowerCase()).toContain('expressed');
    expect(prompt.toLowerCase()).toContain('perceived differently');
  });
});

describe('generateOutboundOptimizationPrompt', () => {
  it('should route to same-culture template when sameCulture is true', () => {
    const sameCulturePrompt = generateOutboundSameCulturePrompt('Hello!', 'american');
    const routedPrompt = generateOutboundOptimizationPrompt(
      'Hello!',
      'american',
      'american',
      true
    );

    expect(routedPrompt).toBe(sameCulturePrompt);
  });

  it('should route to cross-culture template when sameCulture is false', () => {
    const crossCulturePrompt = generateOutboundCrossCulturePrompt(
      'Hello!',
      'american',
      'japanese'
    );
    const routedPrompt = generateOutboundOptimizationPrompt(
      'Hello!',
      'american',
      'japanese',
      false
    );

    expect(routedPrompt).toBe(crossCulturePrompt);
  });

  it('should use sender culture for same-culture template', () => {
    const prompt = generateOutboundOptimizationPrompt(
      'Hello!',
      'german',
      'german',
      true
    );

    expect(prompt).toContain('German');
  });

  it('should use both cultures for cross-culture template', () => {
    const prompt = generateOutboundOptimizationPrompt(
      'Hello!',
      'british',
      'french',
      false
    );

    expect(prompt).toContain('British');
    expect(prompt).toContain('French');
  });
});

describe('Outbound prompt content requirements', () => {
  it('should include system message about being a cultural expert', () => {
    const sameCulturePrompt = generateOutboundSameCulturePrompt('Hello!', 'american');
    const crossCulturePrompt = generateOutboundCrossCulturePrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(sameCulturePrompt).toContain('cultural');
    expect(sameCulturePrompt.toLowerCase()).toContain('expert');
    expect(crossCulturePrompt).toContain('cultural');
    expect(crossCulturePrompt.toLowerCase()).toContain('expert');
  });

  it('should instruct to return ONLY JSON (no other text)', () => {
    const sameCulturePrompt = generateOutboundSameCulturePrompt('Hello!', 'american');
    const crossCulturePrompt = generateOutboundCrossCulturePrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(sameCulturePrompt.toUpperCase()).toContain('ONLY');
    expect(sameCulturePrompt.toLowerCase()).toContain('no other text');
    expect(crossCulturePrompt.toUpperCase()).toContain('ONLY');
    expect(crossCulturePrompt.toLowerCase()).toContain('no other text');
  });

  it('should specify emotion score range (0-10)', () => {
    const sameCulturePrompt = generateOutboundSameCulturePrompt('Hello!', 'american');
    const crossCulturePrompt = generateOutboundCrossCulturePrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(sameCulturePrompt).toContain('0-10');
    expect(crossCulturePrompt).toContain('0-10');
  });

  it('should specify minimum 3 and maximum 5 suggestions', () => {
    const sameCulturePrompt = generateOutboundSameCulturePrompt('Hello!', 'american');
    const crossCulturePrompt = generateOutboundCrossCulturePrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(sameCulturePrompt).toContain('minimum 3');
    expect(sameCulturePrompt).toContain('maximum 5');
    expect(crossCulturePrompt).toContain('minimum 3');
    expect(crossCulturePrompt).toContain('maximum 5');
  });
});
