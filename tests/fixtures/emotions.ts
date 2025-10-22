/**
 * Mock emotion data for testing interpretation components.
 * Provides fixtures for same-culture and cross-culture scenarios.
 */

import { Emotion, InterpretationResult } from '@/lib/types/models';

/**
 * Same-culture emotion example (no receiverScore).
 * Used for testing single-score display.
 */
export const sameCultureEmotion: Emotion = {
  name: 'Gratitude',
  senderScore: 8,
  explanation: 'Strong gratitude expressed with warmth',
};

/**
 * Cross-culture emotion example (has receiverScore).
 * Used for testing dual-score comparison display.
 */
export const crossCultureEmotion: Emotion = {
  name: 'Directness',
  senderScore: 8,
  receiverScore: 3,
  explanation: 'Americans value direct communication more than Japanese culture',
};

/**
 * Additional same-culture emotions for testing lists.
 */
export const sameCultureEmotions: Emotion[] = [
  {
    name: 'Gratitude',
    senderScore: 8,
    explanation: 'Strong gratitude expressed',
  },
  {
    name: 'Warmth',
    senderScore: 6,
    explanation: 'Friendly warmth conveyed',
  },
  {
    name: 'Appreciation',
    senderScore: 7,
  },
];

/**
 * Cross-culture emotions for testing dual-score displays.
 */
export const crossCultureEmotions: Emotion[] = [
  {
    name: 'Directness',
    senderScore: 8,
    receiverScore: 3,
    explanation: 'Americans value direct communication more',
  },
  {
    name: 'Formality',
    senderScore: 2,
    receiverScore: 7,
    explanation: 'Japanese culture emphasizes formality',
  },
  {
    name: 'Gratitude',
    senderScore: 7,
    receiverScore: 9,
    explanation: 'Gratitude expressed differently across cultures',
  },
];

/**
 * Mock same-culture interpretation result.
 * American → American interpretation.
 */
export const mockSameCultureResult: InterpretationResult = {
  bottomLine: 'The sender is expressing sincere gratitude with warmth.',
  culturalContext:
    'In American culture, "thank you so much" is a direct expression of gratitude. It conveys appreciation without expectation of reciprocity.',
  emotions: sameCultureEmotions,
  metadata: {
    costUsd: 0.015,
    model: 'gpt-4-turbo',
    tokensUsed: 450,
  },
};

/**
 * Mock cross-culture interpretation result.
 * American → Japanese interpretation.
 */
export const mockCrossCultureResult: InterpretationResult = {
  bottomLine:
    'The sender is being very direct in their communication, which may come across as less formal than expected in Japanese business culture.',
  culturalContext:
    'Americans tend to value directness and efficiency in communication. Japanese culture typically emphasizes formality, indirectness, and reading between the lines. This message might benefit from more formal language and context-setting.',
  emotions: crossCultureEmotions,
  metadata: {
    costUsd: 0.018,
    model: 'gpt-4-turbo',
    tokensUsed: 520,
  },
};

/**
 * Mock interpretation response with messages remaining.
 */
export const mockInterpretationResponse = {
  success: true,
  data: {
    interpretation: mockSameCultureResult,
  },
  metadata: {
    messages_remaining: 9,
  },
};

/**
 * Mock error response.
 */
export const mockErrorResponse = {
  success: false,
  error: {
    code: 'LIMIT_EXCEEDED',
    message: "You've reached your message limit. Upgrade to Pro for more!",
  },
};
