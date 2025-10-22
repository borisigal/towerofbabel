/**
 * Unit tests for LLM prompt generation.
 * Tests same-culture and cross-culture prompt templates.
 */

import { describe, it, expect } from 'vitest';
import {
  generateSameCulturePrompt,
  generateCrossCulturePrompt,
  generateInterpretationPrompt,
} from '@/lib/llm/prompts';

describe('generateSameCulturePrompt', () => {
  it('should include "explain like you\'re talking to a 14-year-old" instruction', () => {
    const prompt = generateSameCulturePrompt('Hello!', 'american');

    expect(prompt).toContain('14-year-old');
    expect(prompt.toLowerCase()).toContain('simple');
  });

  it('should request single emotion scores (senderScore only)', () => {
    const prompt = generateSameCulturePrompt('Hello!', 'american');

    expect(prompt).toContain('senderScore');
    expect(prompt).toContain('only include senderScore (not receiverScore)');
  });

  it('should include JSON schema for structured response', () => {
    const prompt = generateSameCulturePrompt('Hello!', 'american');

    expect(prompt).toContain('bottomLine');
    expect(prompt).toContain('culturalContext');
    expect(prompt).toContain('emotions');
    expect(prompt).toContain('JSON');
  });

  it('should instruct dynamic emotion detection (not preset list)', () => {
    const prompt = generateSameCulturePrompt('Hello!', 'american');

    expect(prompt).toContain('detect');
    expect(prompt).toContain('dynamically');
    expect(prompt.toLowerCase()).toContain('preset');
  });

  it('should include culture name correctly', () => {
    const prompt = generateSameCulturePrompt('Hello!', 'japanese');

    expect(prompt).toContain('Japanese');
  });

  it('should request exactly 3 emotions', () => {
    const prompt = generateSameCulturePrompt('Hello!', 'american');

    expect(prompt).toContain('top 3 emotions');
    expect(prompt).toContain('exactly 3 emotions');
  });

  it('should include the message text in the prompt', () => {
    const message = 'Thank you for your help with this project!';
    const prompt = generateSameCulturePrompt(message, 'american');

    expect(prompt).toContain(message);
  });
});

describe('generateCrossCulturePrompt', () => {
  it('should emphasize cultural context and differences', () => {
    const prompt = generateCrossCulturePrompt('Hello!', 'american', 'japanese');

    expect(prompt.toLowerCase()).toContain('cultural');
    expect(prompt.toLowerCase()).toContain('difference');
  });

  it('should request dual emotion scores (senderScore and receiverScore)', () => {
    const prompt = generateCrossCulturePrompt('Hello!', 'american', 'japanese');

    expect(prompt).toContain('senderScore');
    expect(prompt).toContain('receiverScore');
    expect(prompt).toContain('BOTH');
  });

  it('should include JSON schema for structured response', () => {
    const prompt = generateCrossCulturePrompt('Hello!', 'american', 'japanese');

    expect(prompt).toContain('bottomLine');
    expect(prompt).toContain('culturalContext');
    expect(prompt).toContain('emotions');
    expect(prompt).toContain('JSON');
  });

  it('should instruct dynamic emotion detection (not preset list)', () => {
    const prompt = generateCrossCulturePrompt('Hello!', 'american', 'japanese');

    expect(prompt).toContain('detect');
    expect(prompt).toContain('dynamically');
    expect(prompt.toLowerCase()).toContain('preset');
  });

  it('should include both sender and receiver culture names', () => {
    const prompt = generateCrossCulturePrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(prompt).toContain('American');
    expect(prompt).toContain('Japanese');
  });

  it('should request exactly 3 emotions', () => {
    const prompt = generateCrossCulturePrompt('Hello!', 'american', 'japanese');

    expect(prompt).toContain('top 3 emotions');
    expect(prompt).toContain('exactly 3 emotions');
  });

  it('should include the message text in the prompt', () => {
    const message = 'I appreciate your hard work on this project.';
    const prompt = generateCrossCulturePrompt(message, 'american', 'japanese');

    expect(prompt).toContain(message);
  });

  it('should mention how emotions may be perceived differently', () => {
    const prompt = generateCrossCulturePrompt('Hello!', 'american', 'japanese');

    expect(prompt.toLowerCase()).toContain('perceived');
    expect(prompt.toLowerCase()).toContain('expressed');
  });
});

describe('generateInterpretationPrompt', () => {
  it('should route to same-culture template when sameCulture is true', () => {
    const sameCulturePrompt = generateSameCulturePrompt('Hello!', 'american');
    const routedPrompt = generateInterpretationPrompt(
      'Hello!',
      'american',
      'american',
      true
    );

    expect(routedPrompt).toBe(sameCulturePrompt);
  });

  it('should route to cross-culture template when sameCulture is false', () => {
    const crossCulturePrompt = generateCrossCulturePrompt(
      'Hello!',
      'american',
      'japanese'
    );
    const routedPrompt = generateInterpretationPrompt(
      'Hello!',
      'american',
      'japanese',
      false
    );

    expect(routedPrompt).toBe(crossCulturePrompt);
  });

  it('should use sender culture for same-culture template', () => {
    const prompt = generateInterpretationPrompt(
      'Hello!',
      'german',
      'german',
      true
    );

    expect(prompt).toContain('German');
  });

  it('should use both cultures for cross-culture template', () => {
    const prompt = generateInterpretationPrompt(
      'Hello!',
      'british',
      'french',
      false
    );

    expect(prompt).toContain('British');
    expect(prompt).toContain('French');
  });
});

describe('Prompt content requirements', () => {
  it('should include system message about being a cultural expert', () => {
    const sameCulturePrompt = generateSameCulturePrompt('Hello!', 'american');
    const crossCulturePrompt = generateCrossCulturePrompt(
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
    const sameCulturePrompt = generateSameCulturePrompt('Hello!', 'american');
    const crossCulturePrompt = generateCrossCulturePrompt(
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
    const sameCulturePrompt = generateSameCulturePrompt('Hello!', 'american');
    const crossCulturePrompt = generateCrossCulturePrompt(
      'Hello!',
      'american',
      'japanese'
    );

    expect(sameCulturePrompt).toContain('0-10');
    expect(crossCulturePrompt).toContain('0-10');
  });
});
