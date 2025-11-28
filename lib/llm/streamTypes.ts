/**
 * TypeScript interfaces for LLM streaming responses.
 * Defines chunk types for progressive streaming of interpretation results.
 *
 * @see docs/stories/6.1.story.md
 */

import { InterpretationResponse, LLMMetadata } from './types';

/**
 * Text chunk yielded during streaming interpretation.
 * Contains a fragment of the raw LLM response text.
 */
export interface StreamTextChunk {
  /** Discriminator for chunk type */
  type: 'text';
  /** Text fragment from the LLM response */
  text: string;
}

/**
 * Complete chunk yielded when streaming finishes.
 * Contains the parsed interpretation and metadata for cost tracking.
 */
export interface StreamCompleteChunk {
  /** Discriminator for chunk type */
  type: 'complete';
  /** Parsed interpretation response */
  interpretation: InterpretationResponse;
  /** LLM call metadata (cost, tokens, response time) */
  metadata: LLMMetadata;
}

/**
 * Error chunk yielded when streaming encounters an error.
 * Sent to client to indicate stream failure.
 */
export interface StreamErrorChunk {
  /** Discriminator for chunk type */
  type: 'error';
  /** Error details */
  error: {
    /** Machine-readable error code */
    code: string;
    /** User-friendly error message */
    message: string;
  };
}

/**
 * Union type for all stream chunks.
 * Consumer should check chunk.type to determine chunk kind.
 *
 * @example
 * ```typescript
 * for await (const chunk of generator) {
 *   if (chunk.type === 'text') {
 *     console.log('Received text:', chunk.text);
 *   } else if (chunk.type === 'complete') {
 *     console.log('Complete:', chunk.interpretation);
 *   }
 * }
 * ```
 */
export type StreamChunk = StreamTextChunk | StreamCompleteChunk;

/**
 * SSE event data sent to client during streaming.
 * Extends StreamChunk with additional metadata for client consumption.
 */
export type SSEEventData =
  | StreamTextChunk
  | (StreamCompleteChunk & {
      /** Database ID of saved interpretation */
      interpretationId?: string;
      /** Additional metadata for client */
      metadata?: {
        /** Remaining messages for the user */
        messages_remaining?: number;
      };
    })
  | StreamErrorChunk;
