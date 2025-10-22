/**
 * Shared TypeScript types for TowerOfBabel application.
 * Contains culture codes, interpretation types, and API request/response interfaces.
 */

/**
 * Supported culture codes for interpretation.
 * 17 cultures available for sender/receiver selection.
 */
export type CultureCode =
  | 'american'
  | 'british'
  | 'german'
  | 'french'
  | 'japanese'
  | 'chinese'
  | 'indian'
  | 'spanish'
  | 'italian'
  | 'dutch'
  | 'korean'
  | 'brazilian'
  | 'mexican'
  | 'australian'
  | 'canadian'
  | 'russian'
  | 'ukrainian';

/**
 * Human-readable culture names with flag emojis mapped to culture codes.
 * Used for dropdown display in culture selectors.
 */
export const CULTURE_NAMES: Record<CultureCode, string> = {
  american: '🇺🇸 American',
  british: '🇬🇧 British',
  german: '🇩🇪 German',
  french: '🇫🇷 French',
  japanese: '🇯🇵 Japanese',
  chinese: '🇨🇳 Chinese (Mandarin)',
  indian: '🇮🇳 Indian',
  spanish: '🇪🇸 Spanish',
  italian: '🇮🇹 Italian',
  dutch: '🇳🇱 Dutch',
  korean: '🇰🇷 Korean',
  brazilian: '🇧🇷 Brazilian Portuguese',
  mexican: '🇲🇽 Mexican',
  australian: '🇦🇺 Australian',
  canadian: '🇨🇦 Canadian',
  russian: '🇷🇺 Russian',
  ukrainian: '🇺🇦 Ukrainian',
};

/**
 * Array of all supported culture codes.
 * Useful for iterating over cultures in UI components.
 */
export const CULTURES: CultureCode[] = [
  'american',
  'british',
  'german',
  'french',
  'japanese',
  'chinese',
  'indian',
  'spanish',
  'italian',
  'dutch',
  'korean',
  'brazilian',
  'mexican',
  'australian',
  'canadian',
  'russian',
  'ukrainian',
];

/**
 * Interpretation mode type.
 * - inbound: Understanding message received from sender culture
 * - outbound: Optimizing message to send to receiver culture (future epic)
 */
export type InterpretationType = 'inbound' | 'outbound';

/**
 * Interpretation request payload sent to /api/interpret endpoint.
 * Story 2.1: Only 'inbound' mode implemented.
 * Story 2.3: Will be used for API integration.
 */
export interface InterpretationRequest {
  message: string;
  sender_culture: CultureCode;
  receiver_culture: CultureCode;
  mode: InterpretationType;
}

/**
 * Emotion data returned in interpretation results.
 * Includes sender/receiver emotion scores and labels.
 */
export interface Emotion {
  emotion: string;
  senderScore: number;
  receiverScore?: number;
  label: string;
}

/**
 * Interpretation result data structure.
 * Returned from LLM provider after successful interpretation.
 */
export interface InterpretationResult {
  bottomLine: string;
  culturalContext: string;
  emotions: Emotion[];
  metadata?: {
    costUsd?: number;
    model?: string;
    tokensUsed?: number;
  };
}

/**
 * API response format for interpretation endpoint.
 * Standardized success/error response structure.
 */
export interface InterpretationResponse {
  success: boolean;
  interpretation?: InterpretationResult;
  error?: {
    code: string;
    message: string;
  };
  messages_remaining?: number;
}
