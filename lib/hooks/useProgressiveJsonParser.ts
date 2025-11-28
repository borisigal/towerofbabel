'use client';

import { useMemo } from 'react';
import { type Emotion } from '@/lib/types/models';

/**
 * Partial result for inbound interpretation during streaming.
 */
export interface PartialInboundResult {
  bottomLine?: string;
  culturalContext?: string;
  emotions?: Emotion[];
}

/**
 * Partial result for outbound interpretation during streaming.
 */
export interface PartialOutboundResult {
  originalAnalysis?: string;
  suggestions?: string[];
  optimizedMessage?: string;
  emotions?: Emotion[];
}

/**
 * Combined partial result type.
 */
export type PartialResult = PartialInboundResult | PartialOutboundResult;

/**
 * Extracts a complete string field value from partial JSON.
 * Handles escaped quotes and nested strings properly.
 *
 * @param json - Partial JSON string being streamed
 * @param fieldName - Name of the field to extract
 * @returns The field value if complete, undefined otherwise
 */
function extractStringField(json: string, fieldName: string): string | undefined {
  // Pattern: "fieldName": "value" (with proper quote escaping)
  // We need to find the complete string value after the field name
  const fieldPattern = new RegExp(`"${fieldName}"\\s*:\\s*"`);
  const match = json.match(fieldPattern);

  if (!match) {
    return undefined;
  }

  const startIndex = match.index! + match[0].length;
  let endIndex = startIndex;
  let escaped = false;

  // Find the closing quote (handling escaped quotes)
  for (let i = startIndex; i < json.length; i++) {
    const char = json[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      endIndex = i;
      // Verify this is followed by valid JSON (comma, closing brace, or whitespace)
      const nextChar = json[i + 1];
      if (nextChar === ',' || nextChar === '}' || nextChar === '\n' || nextChar === '\r' || nextChar === ' ') {
        // Found complete string
        const rawValue = json.slice(startIndex, endIndex);
        // Unescape JSON string
        try {
          return JSON.parse(`"${rawValue}"`);
        } catch {
          return rawValue;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extracts a complete string array field from partial JSON.
 *
 * @param json - Partial JSON string being streamed
 * @param fieldName - Name of the array field to extract
 * @returns The array if complete, undefined otherwise
 */
function extractStringArrayField(json: string, fieldName: string): string[] | undefined {
  // Pattern: "fieldName": [...]
  const fieldPattern = new RegExp(`"${fieldName}"\\s*:\\s*\\[`);
  const match = json.match(fieldPattern);

  if (!match) {
    return undefined;
  }

  const startIndex = match.index! + match[0].length - 1; // Include the opening bracket
  let depth = 0;
  let endIndex = -1;

  // Find the matching closing bracket
  for (let i = startIndex; i < json.length; i++) {
    const char = json[i];

    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (endIndex === -1) {
    return undefined;
  }

  const arrayStr = json.slice(startIndex, endIndex);

  try {
    const parsed = JSON.parse(arrayStr);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * Extracts complete emotions array from partial JSON.
 *
 * @param json - Partial JSON string being streamed
 * @returns The emotions array if complete, undefined otherwise
 */
function extractEmotionsField(json: string): Emotion[] | undefined {
  // Pattern: "emotions": [...]
  const fieldPattern = /"emotions"\s*:\s*\[/;
  const match = json.match(fieldPattern);

  if (!match) {
    return undefined;
  }

  const startIndex = match.index! + match[0].length - 1; // Include the opening bracket
  let depth = 0;
  let endIndex = -1;

  // Find the matching closing bracket
  for (let i = startIndex; i < json.length; i++) {
    const char = json[i];

    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (endIndex === -1) {
    return undefined;
  }

  const arrayStr = json.slice(startIndex, endIndex);

  try {
    const parsed = JSON.parse(arrayStr);
    if (Array.isArray(parsed)) {
      // Validate emotion structure
      const emotions: Emotion[] = [];
      for (const item of parsed) {
        if (
          typeof item === 'object' &&
          item !== null &&
          typeof item.name === 'string' &&
          typeof item.senderScore === 'number'
        ) {
          emotions.push({
            name: item.name,
            senderScore: item.senderScore,
            receiverScore: item.receiverScore,
            explanation: item.explanation,
          });
        }
      }
      if (emotions.length > 0) {
        return emotions;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * Parses streaming JSON text and extracts completed fields.
 * Used to progressively render interpretation results during streaming.
 *
 * @param streamingText - The accumulated JSON text from the stream
 * @param mode - 'inbound' or 'outbound' interpretation mode
 * @returns Partial result with completed fields
 *
 * @example
 * ```typescript
 * const partial = parseProgressiveJson(streamingText, 'inbound');
 * if (partial.bottomLine) {
 *   // Render the bottom line section
 * }
 * ```
 */
export function parseProgressiveJson(
  streamingText: string,
  mode: 'inbound' | 'outbound'
): PartialResult {
  if (!streamingText || streamingText.trim().length === 0) {
    return {};
  }

  if (mode === 'inbound') {
    const result: PartialInboundResult = {};

    const bottomLine = extractStringField(streamingText, 'bottomLine');
    if (bottomLine) {
      result.bottomLine = bottomLine;
    }

    const culturalContext = extractStringField(streamingText, 'culturalContext');
    if (culturalContext) {
      result.culturalContext = culturalContext;
    }

    const emotions = extractEmotionsField(streamingText);
    if (emotions) {
      result.emotions = emotions;
    }

    return result;
  } else {
    const result: PartialOutboundResult = {};

    const originalAnalysis = extractStringField(streamingText, 'originalAnalysis');
    if (originalAnalysis) {
      result.originalAnalysis = originalAnalysis;
    }

    const suggestions = extractStringArrayField(streamingText, 'suggestions');
    if (suggestions) {
      result.suggestions = suggestions;
    }

    const optimizedMessage = extractStringField(streamingText, 'optimizedMessage');
    if (optimizedMessage) {
      result.optimizedMessage = optimizedMessage;
    }

    const emotions = extractEmotionsField(streamingText);
    if (emotions) {
      result.emotions = emotions;
    }

    return result;
  }
}

/**
 * Hook for progressive JSON parsing during streaming.
 * Memoizes the parsing to avoid unnecessary recalculations.
 *
 * @param streamingText - The accumulated JSON text from the stream
 * @param mode - 'inbound' or 'outbound' interpretation mode
 * @returns Partial result with completed fields
 */
export function useProgressiveJsonParser(
  streamingText: string,
  mode: 'inbound' | 'outbound'
): PartialResult {
  return useMemo(() => {
    return parseProgressiveJson(streamingText, mode);
  }, [streamingText, mode]);
}
