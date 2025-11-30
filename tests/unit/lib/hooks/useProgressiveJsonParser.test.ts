/**
 * Tests for useProgressiveJsonParser hook.
 * Verifies progressive JSON parsing for streaming interpretation results.
 */

import { describe, it, expect } from 'vitest';
import { parseProgressiveJson } from '@/lib/hooks/useProgressiveJsonParser';

describe('parseProgressiveJson', () => {
  describe('inbound mode', () => {
    it('should return empty object for empty string', () => {
      const result = parseProgressiveJson('', 'inbound');
      expect(result).toEqual({});
    });

    it('should extract bottomLine when complete', () => {
      const json = '{"bottomLine": "This message conveys warmth and appreciation",';
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).toHaveProperty('bottomLine', 'This message conveys warmth and appreciation');
    });

    it('should not extract bottomLine when incomplete', () => {
      const json = '{"bottomLine": "This message conv';
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).not.toHaveProperty('bottomLine');
    });

    it('should extract culturalContext when complete', () => {
      const json = '{"bottomLine": "Test", "culturalContext": "In American culture, this is typical",';
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).toHaveProperty('bottomLine', 'Test');
      expect(result).toHaveProperty('culturalContext', 'In American culture, this is typical');
    });

    it('should extract emotions array when complete', () => {
      const json = `{
        "bottomLine": "Test",
        "culturalContext": "Context",
        "emotions": [
          {"name": "Gratitude", "senderScore": 8, "explanation": "Strong gratitude"},
          {"name": "Warmth", "senderScore": 6, "explanation": "Warm tone"},
          {"name": "Respect", "senderScore": 7, "explanation": "Respectful language"}
        ]
      }`;
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).toHaveProperty('emotions');
      expect(result.emotions).toHaveLength(3);
      expect(result.emotions?.[0]).toEqual({
        name: 'Gratitude',
        senderScore: 8,
        receiverScore: undefined,
        explanation: 'Strong gratitude',
      });
    });

    it('should not extract emotions when array is incomplete', () => {
      const json = `{
        "bottomLine": "Test",
        "culturalContext": "Context",
        "emotions": [
          {"name": "Gratitude", "senderScore": 8, "explanation": "Strong gratitude"},
          {"name": "Warmth", "sender`;
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).toHaveProperty('bottomLine');
      expect(result).toHaveProperty('culturalContext');
      expect(result).not.toHaveProperty('emotions');
    });

    it('should handle escaped quotes in strings', () => {
      const json = '{"bottomLine": "He said \\"hello\\" to her",';
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).toHaveProperty('bottomLine', 'He said "hello" to her');
    });

    it('should handle cross-culture emotions with receiverScore', () => {
      const json = `{
        "emotions": [
          {"name": "Directness", "senderScore": 8, "receiverScore": 3, "explanation": "Cultural difference"}
        ]
      }`;
      const result = parseProgressiveJson(json, 'inbound');
      expect(result.emotions?.[0]).toEqual({
        name: 'Directness',
        senderScore: 8,
        receiverScore: 3,
        explanation: 'Cultural difference',
      });
    });
  });

  describe('outbound mode', () => {
    it('should extract originalAnalysis when complete', () => {
      const json = '{"originalAnalysis": "The receiver will perceive this as direct",';
      const result = parseProgressiveJson(json, 'outbound');
      expect(result).toHaveProperty('originalAnalysis', 'The receiver will perceive this as direct');
    });

    it('should extract suggestions array when complete', () => {
      const json = `{
        "originalAnalysis": "Test",
        "suggestions": ["Add more context", "Use softer tone", "Be more specific"],`;
      const result = parseProgressiveJson(json, 'outbound');
      expect(result).toHaveProperty('suggestions');
      expect(result.suggestions).toEqual([
        'Add more context',
        'Use softer tone',
        'Be more specific',
      ]);
    });

    it('should not extract suggestions when array is incomplete', () => {
      const json = '{"suggestions": ["Add more context", "Use soft';
      const result = parseProgressiveJson(json, 'outbound');
      expect(result).not.toHaveProperty('suggestions');
    });

    it('should extract optimizedMessage when complete', () => {
      const json = `{
        "originalAnalysis": "Test",
        "suggestions": ["Tip 1", "Tip 2", "Tip 3"],
        "optimizedMessage": "I would greatly appreciate your help with this matter.",`;
      const result = parseProgressiveJson(json, 'outbound');
      expect(result).toHaveProperty('optimizedMessage', 'I would greatly appreciate your help with this matter.');
    });

    it('should extract all outbound fields from complete JSON', () => {
      const json = `{
        "originalAnalysis": "The receiver will perceive this message as direct",
        "suggestions": ["Add context", "Soften tone", "Be specific"],
        "optimizedMessage": "I would appreciate your help.",
        "emotions": [
          {"name": "Urgency", "senderScore": 7, "explanation": "Time pressure"}
        ]
      }`;
      const result = parseProgressiveJson(json, 'outbound');
      expect(result).toHaveProperty('originalAnalysis');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('optimizedMessage');
      expect(result).toHaveProperty('emotions');
    });
  });

  describe('edge cases', () => {
    it('should handle newlines in string values', () => {
      const json = '{"bottomLine": "Line one.\\nLine two.",';
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).toHaveProperty('bottomLine', 'Line one.\nLine two.');
    });

    it('should handle unicode characters', () => {
      const json = '{"bottomLine": "Japanese: \\u65e5\\u672c\\u8a9e",';
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).toHaveProperty('bottomLine');
    });

    it('should handle whitespace variations in JSON', () => {
      const json = '{"bottomLine"  :   "Test value"  ,';
      const result = parseProgressiveJson(json, 'inbound');
      expect(result).toHaveProperty('bottomLine', 'Test value');
    });

    it('should return empty object for null/undefined-like values', () => {
      const result = parseProgressiveJson('   ', 'inbound');
      expect(result).toEqual({});
    });
  });
});
