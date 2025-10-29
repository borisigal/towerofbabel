/**
 * Unit Tests for Trial Expiration Logic
 *
 * Tests the trial expiration check (14 days) in usageService.
 * Validates that trial users are blocked when either:
 * 1. Message limit reached (10 messages)
 * 2. Time limit reached (14 days)
 *
 * @see lib/services/usageService.ts
 * @see docs/stories/3.1.story.md#task-8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUsageLimit } from '@/lib/services/usageService';
import * as userRepository from '@/lib/db/repositories/userRepository';

// Mock the userRepository module
vi.mock('@/lib/db/repositories/userRepository');

// Mock logger to prevent console output during tests
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('usageService - Trial Expiration Logic', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('checkUsageLimit - Trial Time-Based Expiration', () => {
    it('should allow interpretation when trial user is 5 days old with 5 messages used', async () => {
      // Arrange: Trial user created 5 days ago
      const now = new Date('2025-10-22T12:00:00Z');
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: fiveDaysAgo,
        is_admin: false,
        created_at: fiveDaysAgo,
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(5); // 10 - 5 = 5 remaining
      expect(result.error).toBeUndefined();
    });

    it('should allow interpretation when trial user is exactly 14 days old (edge case)', async () => {
      // Arrange: Trial user created exactly 14 days ago
      const now = new Date('2025-10-22T12:00:00Z');
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: fourteenDaysAgo,
        is_admin: false,
        created_at: fourteenDaysAgo,
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: Should be allowed (14 days is NOT expired, only > 14 days)
      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should block interpretation when trial user is 15 days old (TRIAL_EXPIRED)', async () => {
      // Arrange: Trial user created 15 days ago
      const now = new Date('2025-10-22T12:00:00Z');
      const fifteenDaysAgo = new Date(now);
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: null,
        trial_start_date: fifteenDaysAgo,
        is_admin: false,
        created_at: fifteenDaysAgo,
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('TRIAL_EXPIRED');
      expect(result.message).toContain('Trial period expired');
      expect(result.tier).toBe('trial');
      expect(result.daysElapsed).toBe(15);
      expect(result.trialEndDate).toBeDefined();
    });

    it('should block interpretation when trial user has 10 messages used (LIMIT_EXCEEDED)', async () => {
      // Arrange: Trial user with 10 messages (message limit reached)
      const now = new Date('2025-10-22T12:00:00Z');
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 10,
        messages_reset_date: null,
        trial_start_date: fiveDaysAgo,
        is_admin: false,
        created_at: fiveDaysAgo,
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('TRIAL_LIMIT_EXCEEDED');
      expect(result.message).toContain('Trial limit of 10 messages exceeded');
      expect(result.tier).toBe('trial');
      expect(result.messagesUsed).toBe(10);
      expect(result.messagesLimit).toBe(10);
    });

    it('should block with TRIAL_EXPIRED when both time (15 days) and message (10) limits reached', async () => {
      // Arrange: Trial user 15 days old AND 10 messages used
      // TRIAL_EXPIRED should take precedence (checked first)
      const now = new Date('2025-10-22T12:00:00Z');
      const fifteenDaysAgo = new Date(now);
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 10,
        messages_reset_date: null,
        trial_start_date: fifteenDaysAgo,
        is_admin: false,
        created_at: fifteenDaysAgo,
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: TRIAL_EXPIRED should be returned (time check comes first)
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('TRIAL_EXPIRED');
      expect(result.message).toContain('Trial period expired');
      expect(result.tier).toBe('trial');
      expect(result.daysElapsed).toBe(15);
    });

    it('should block with LIMIT_EXCEEDED when 10 messages used but only 5 days elapsed', async () => {
      // Arrange: Trial user with 10 messages but only 5 days old
      // Message limit reached but time limit not reached
      const now = new Date('2025-10-22T12:00:00Z');
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'trial',
        messages_used_count: 10,
        messages_reset_date: null,
        trial_start_date: fiveDaysAgo,
        is_admin: false,
        created_at: fiveDaysAgo,
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: LIMIT_EXCEEDED should be returned (message limit hit)
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('TRIAL_LIMIT_EXCEEDED');
      expect(result.message).toContain('Trial limit of 10 messages exceeded');
      expect(result.tier).toBe('trial');
      expect(result.messagesUsed).toBe(10);
      expect(result.messagesLimit).toBe(10);
    });
  });
});
