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
