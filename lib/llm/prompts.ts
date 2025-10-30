/**
 * Prompt template generation for LLM interpretation requests.
 * Provides different templates for same-culture vs. cross-culture scenarios.
 */

import { CultureCode } from '@/lib/types/models';
import { CULTURE_NAMES } from '@/lib/types/models';

/**
 * System message for all LLM interpretation requests.
 * Defines the LLM's role and output format.
 */
const SYSTEM_MESSAGE = `You are a cultural communication expert who helps people understand messages across different cultures. Your role is to analyze messages and provide insights about their meaning, cultural context, and emotional content. Always provide your analysis in structured JSON format.`;

/**
 * Generates a prompt for same-culture interpretation.
 * Emphasizes simple explanation and single emotion scores.
 *
 * @param message - The message text to interpret
 * @param culture - The shared culture of sender and receiver
 * @returns Formatted prompt for same-culture interpretation
 *
 * @example
 * ```typescript
 * const prompt = generateSameCulturePrompt('Thanks for your help!', 'american');
 * // Prompt emphasizes simple explanation for shared cultural context
 * ```
 */
export function generateSameCulturePrompt(
  message: string,
  culture: CultureCode
): string {
  const cultureName = CULTURE_NAMES[culture];

  return `${SYSTEM_MESSAGE}

Analyze the following message from someone in ${cultureName} culture, written for another ${cultureName} person.

Since the sender and receiver share the same cultural background, focus on:
- Explaining the message in simple, clear language (explain like you're talking to a 14-year-old)
- Identifying what the sender really means vs. what they literally said
- Detecting the top 3 emotions present in the message (detect these dynamically, don't use a preset list)

Message to analyze:
"""
${message}
"""

Provide your analysis in the following JSON format (return ONLY the JSON, no other text):
{
  "bottomLine": "A clear, simple explanation of what the message really means (2-3 sentences)",
  "culturalContext": "Brief insights about the communication style and any subtext (2-3 sentences)",
  "emotions": [
    {
      "name": "Emotion name (detect dynamically)",
      "senderScore": 7,
      "explanation": "Brief explanation of why this emotion is present"
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text
- Include exactly 3 emotions (top 3 most relevant)
- Emotion scores must be integers between 0-10
- For same culture, only include senderScore (not receiverScore)`;
}

/**
 * Generates a prompt for cross-culture interpretation.
 * Emphasizes cultural differences and dual emotion scores.
 *
 * @param message - The message text to interpret
 * @param senderCulture - Culture code of the message sender
 * @param receiverCulture - Culture code of the message receiver
 * @returns Formatted prompt for cross-culture interpretation
 *
 * @example
 * ```typescript
 * const prompt = generateCrossCulturePrompt(
 *   'I appreciate your hard work on this project.',
 *   'american',
 *   'japanese'
 * );
 * // Prompt emphasizes cultural differences and dual emotion scores
 * ```
 */
export function generateCrossCulturePrompt(
  message: string,
  senderCulture: CultureCode,
  receiverCulture: CultureCode
): string {
  const senderCultureName = CULTURE_NAMES[senderCulture];
  const receiverCultureName = CULTURE_NAMES[receiverCulture];

  return `${SYSTEM_MESSAGE}

Analyze the following message from someone in ${senderCultureName} culture, written for someone in ${receiverCultureName} culture.

Since the sender and receiver have different cultural backgrounds, focus on:
- Explaining cultural differences in communication style
- How the message might be perceived differently by the receiver
- Identifying misunderstandings that could arise from cultural differences
- Detecting the top 3 emotions (detect these dynamically, don't use a preset list)

Message to analyze:
"""
${message}
"""

Provide your analysis in the following JSON format (return ONLY the JSON, no other text):
{
  "bottomLine": "A clear explanation of what the message really means across cultures (2-3 sentences)",
  "culturalContext": "Detailed insights about cultural differences in communication and how this message might be perceived (3-4 sentences)",
  "emotions": [
    {
      "name": "Emotion name (detect dynamically)",
      "senderScore": 7,
      "receiverScore": 3,
      "explanation": "Brief explanation of the cultural difference in emotion expression"
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text
- Include exactly 3 emotions (top 3 most relevant)
- Emotion scores must be integers between 0-10
- For cross-culture, include BOTH senderScore (how intense in sender's culture) and receiverScore (how intense in receiver's culture)
- Explain how emotions may be expressed or perceived differently across these cultures`;
}

/**
 * Generates the appropriate prompt based on cultural context.
 * Routes to same-culture or cross-culture template automatically.
 *
 * @param message - The message text to interpret
 * @param senderCulture - Culture code of the message sender
 * @param receiverCulture - Culture code of the message receiver
 * @param sameCulture - Whether sender and receiver share the same culture
 * @returns Formatted prompt for LLM interpretation
 */
export function generateInterpretationPrompt(
  message: string,
  senderCulture: CultureCode,
  receiverCulture: CultureCode,
  sameCulture: boolean
): string {
  if (sameCulture) {
    return generateSameCulturePrompt(message, senderCulture);
  } else {
    return generateCrossCulturePrompt(message, senderCulture, receiverCulture);
  }
}

/**
 * Generates prompt for outbound optimization (same culture).
 * Focuses on improving message clarity and tone for receiver in same culture.
 *
 * @param message - The message user wants to send
 * @param culture - Shared culture of sender and receiver
 * @returns Formatted prompt for outbound optimization
 *
 * @example
 * ```typescript
 * const prompt = generateOutboundSameCulturePrompt(
 *   'Can you finish this by tomorrow?',
 *   'american'
 * );
 * // Prompt asks LLM to suggest more polite phrasing
 * ```
 */
export function generateOutboundSameCulturePrompt(
  message: string,
  culture: CultureCode
): string {
  const cultureName = CULTURE_NAMES[culture];

  return `${SYSTEM_MESSAGE}

You are helping someone in ${cultureName} culture optimize a message they want to send to another ${cultureName} person.

Analyze the message and provide:
1. **Original Analysis**: Explain how the message will likely be perceived by the receiver (2-3 sentences, explain like you're talking to a 14-year-old)
2. **Suggestions**: List 3-5 specific ways to improve the message (be concrete, not vague)
3. **Optimized Message**: Provide a culturally optimized version that's clearer, more appropriate, and better received
4. **Emotions**: Detect the top 3 emotions present in the ORIGINAL message (detect these dynamically, don't use a preset list)

Message to optimize:
"""
${message}
"""

Provide your analysis in the following JSON format (return ONLY the JSON, no other text):
{
  "originalAnalysis": "How the receiver will likely perceive this message (2-3 sentences)",
  "suggestions": [
    "Specific improvement 1: [concrete suggestion]",
    "Specific improvement 2: [concrete suggestion]",
    "Specific improvement 3: [concrete suggestion]"
  ],
  "optimizedMessage": "The improved version of the message that will be better received",
  "emotions": [
    {
      "name": "Emotion name (detect dynamically)",
      "senderScore": 7,
      "explanation": "Brief explanation of why this emotion is present in the original message"
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text
- Include 3-5 suggestions (minimum 3, maximum 5)
- Suggestions must be specific and actionable (not vague like "be nicer")
- optimizedMessage should feel natural, not robotic or overly formal
- Include exactly 3 emotions (top 3 most relevant in the ORIGINAL message)
- Emotion scores must be integers between 0-10
- For same culture, only include senderScore (not receiverScore)`;
}

/**
 * Generates prompt for outbound optimization (cross-culture).
 * Focuses on bridging cultural differences and avoiding misunderstandings.
 *
 * @param message - The message user wants to send
 * @param senderCulture - Culture code of message sender
 * @param receiverCulture - Culture code of message receiver
 * @returns Formatted prompt for cross-culture outbound optimization
 *
 * @example
 * ```typescript
 * const prompt = generateOutboundCrossCulturePrompt(
 *   'I appreciate your hard work on this project.',
 *   'american',
 *   'japanese'
 * );
 * // Prompt suggests more indirect phrasing for Japanese receiver
 * ```
 */
export function generateOutboundCrossCulturePrompt(
  message: string,
  senderCulture: CultureCode,
  receiverCulture: CultureCode
): string {
  const senderCultureName = CULTURE_NAMES[senderCulture];
  const receiverCultureName = CULTURE_NAMES[receiverCulture];

  return `${SYSTEM_MESSAGE}

You are helping someone in ${senderCultureName} culture optimize a message they want to send to someone in ${receiverCultureName} culture.

This is a CROSS-CULTURE message. Focus on:
- How the message might be misunderstood due to cultural differences
- What communication style differences exist between these cultures
- How to bridge the cultural gap and make the message resonate with the receiver

Provide:
1. **Original Analysis**: Explain how the ${receiverCultureName} receiver will likely perceive this ${senderCultureName}-style message (3-4 sentences, explain like you're talking to a 14-year-old)
2. **Suggestions**: List 3-5 culturally-specific improvements that bridge the gap between ${senderCultureName} and ${receiverCultureName} communication styles
3. **Optimized Message**: Provide a culturally optimized version that resonates with ${receiverCultureName} culture while preserving the sender's intent
4. **Emotions**: Detect the top 3 emotions with BOTH sender and receiver intensity scores (how intense in each culture)

Message to optimize:
"""
${message}
"""

Provide your analysis in the following JSON format (return ONLY the JSON, no other text):
{
  "originalAnalysis": "How this message will likely be perceived by the ${receiverCultureName} receiver, including potential cultural misunderstandings (3-4 sentences)",
  "suggestions": [
    "Cultural improvement 1: [specific to ${receiverCultureName} culture]",
    "Cultural improvement 2: [bridges gap between cultures]",
    "Cultural improvement 3: [adapts communication style]"
  ],
  "optimizedMessage": "The culturally adapted version that will resonate with ${receiverCultureName} receiver",
  "emotions": [
    {
      "name": "Emotion name (detect dynamically)",
      "senderScore": 7,
      "receiverScore": 3,
      "explanation": "Brief explanation of how this emotion is expressed/perceived differently across these cultures"
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text
- Include 3-5 suggestions (minimum 3, maximum 5)
- Suggestions must be culturally specific (not generic advice)
- optimizedMessage should adapt to ${receiverCultureName} communication norms
- Include exactly 3 emotions (top 3 most relevant in the ORIGINAL message)
- Emotion scores must be integers between 0-10
- For cross-culture, include BOTH senderScore and receiverScore
- Explain how emotions may be expressed or perceived differently across these cultures`;
}

/**
 * Generates the appropriate outbound prompt based on cultural context.
 * Routes to same-culture or cross-culture outbound template.
 *
 * @param message - The message user wants to send
 * @param senderCulture - Culture code of message sender
 * @param receiverCulture - Culture code of message receiver
 * @param sameCulture - Whether sender and receiver share the same culture
 * @returns Formatted prompt for outbound optimization
 */
export function generateOutboundOptimizationPrompt(
  message: string,
  senderCulture: CultureCode,
  receiverCulture: CultureCode,
  sameCulture: boolean
): string {
  if (sameCulture) {
    return generateOutboundSameCulturePrompt(message, senderCulture);
  } else {
    return generateOutboundCrossCulturePrompt(
      message,
      senderCulture,
      receiverCulture
    );
  }
}
