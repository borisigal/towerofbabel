import { describe, it, expect } from 'vitest';
import { SUCCESS_MESSAGES } from '@/lib/constants/successMessages';

describe('SUCCESS_MESSAGES', () => {
  it('should have all required message keys', () => {
    expect(SUCCESS_MESSAGES).toHaveProperty('SIGN_IN');
    expect(SUCCESS_MESSAGES).toHaveProperty('SIGN_UP');
    expect(SUCCESS_MESSAGES).toHaveProperty('SUBSCRIPTION_SUCCESS');
    expect(SUCCESS_MESSAGES).toHaveProperty('FEEDBACK_SUBMITTED');
    expect(SUCCESS_MESSAGES).toHaveProperty('INTERPRETATION_SAVED');
  });

  it('should have title and description for each message', () => {
    Object.entries(SUCCESS_MESSAGES).forEach(([key, value]) => {
      expect(value).toHaveProperty('title');
      expect(value).toHaveProperty('description');
      expect(typeof value.title).toBe('string');
      expect(typeof value.description).toBe('string');
      expect(value.title.length).toBeGreaterThan(0);
      expect(value.description.length).toBeGreaterThan(0);
    });
  });

  it('should have user-friendly messages without technical jargon', () => {
    Object.values(SUCCESS_MESSAGES).forEach((message) => {
      // Check that messages don't contain technical terms
      const technicalTerms = ['error', 'null', 'undefined', 'exception', 'stack'];
      const text = `${message.title} ${message.description}`.toLowerCase();

      technicalTerms.forEach((term) => {
        expect(text).not.toContain(term);
      });
    });
  });

  it('should have SIGN_IN message', () => {
    expect(SUCCESS_MESSAGES.SIGN_IN.title).toBe('Signed in successfully');
    expect(SUCCESS_MESSAGES.SIGN_IN.description).toContain('Welcome back');
  });

  it('should have SUBSCRIPTION_SUCCESS message', () => {
    expect(SUCCESS_MESSAGES.SUBSCRIPTION_SUCCESS.title).toContain('Pro');
    expect(SUCCESS_MESSAGES.SUBSCRIPTION_SUCCESS.description).toContain('unlimited');
  });

  it('should have FEEDBACK_SUBMITTED message', () => {
    expect(SUCCESS_MESSAGES.FEEDBACK_SUBMITTED.title).toContain('feedback');
    expect(SUCCESS_MESSAGES.FEEDBACK_SUBMITTED.description).toContain('improve');
  });
});
