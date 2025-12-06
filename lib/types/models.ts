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
 * Human-readable culture names mapped to culture codes.
 * Used for dropdown display in culture selectors.
 */
export const CULTURE_NAMES: Record<CultureCode, string> = {
  american: 'American',
  british: 'British',
  german: 'German',
  french: 'French',
  japanese: 'Japanese',
  chinese: 'Chinese (Mandarin)',
  indian: 'Indian',
  spanish: 'Spanish',
  italian: 'Italian',
  dutch: 'Dutch',
  korean: 'Korean',
  brazilian: 'Brazilian Portuguese',
  mexican: 'Mexican',
  australian: 'Australian',
  canadian: 'Canadian',
  russian: 'Russian',
  ukrainian: 'Ukrainian',
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
 * Includes sender/receiver emotion scores and explanation.
 *
 * @property name - Name of the emotion (e.g., "Gratitude", "Directness")
 * @property senderScore - Emotion intensity from sender's perspective (0-10)
 * @property receiverScore - Emotion intensity from receiver's perspective (0-10, undefined if same culture)
 * @property explanation - Optional explanation of the emotion context
 */
export interface Emotion {
  name: string;
  senderScore: number;
  receiverScore?: number;
  explanation?: string;
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

/**
 * Feedback request payload sent to /api/feedback endpoint.
 *
 * @property interpretationId - UUID of the interpretation being rated
 * @property feedback - Binary rating: 'up' (helpful) or 'down' (not helpful)
 * @property feedback_text - Optional user-provided text feedback (max 500 chars enforced at API layer)
 *
 * @example
 * ```typescript
 * // Thumbs up without text
 * { interpretationId: '123', feedback: 'up' }
 *
 * // Thumbs down with text explanation
 * { interpretationId: '123', feedback: 'down', feedback_text: 'Missing cultural context about hierarchy' }
 * ```
 */
export interface FeedbackRequest {
  interpretationId: string;
  feedback: 'up' | 'down';
  feedback_text?: string;
}

/**
 * Feedback response from /api/feedback endpoint.
 * Standardized success/error response structure.
 */
export interface FeedbackResponse {
  success: boolean;
  data?: {
    interpretationId: string;
    feedback: 'up' | 'down';
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
