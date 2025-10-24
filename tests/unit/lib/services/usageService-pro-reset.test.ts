/**
 * Unit Tests for Pro Tier Monthly Reset Logic
 *
 * Tests the automatic monthly usage reset for Pro tier users.
 * Validates that Pro users' usage is reset when messages_reset_date is reached.
 *
 * @see lib/services/usageService.ts
 * @see lib/db/repositories/userRepository.ts
 * @see docs/stories/3.1.story.md#task-9
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

describe('usageService - Pro Tier Monthly Reset Logic', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('checkUsageLimit - Pro Automatic Reset', () => {
    it('should allow interpretation when Pro user has not reached reset date', async () => {
      // Arrange: Pro user with reset date in the future (tomorrow)
      const now = new Date('2025-10-22T12:00:00Z');
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 50,
        messages_reset_date: tomorrow,
        trial_start_date: new Date('2025-01-01T00:00:00Z'),
        is_admin: false,
        created_at: new Date('2025-01-01T00:00:00Z'),
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: Should be allowed (50/100 messages used, reset date not reached)
      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(50); // 100 - 50 = 50 remaining
      expect(result.error).toBeUndefined();

      // Verify reset was NOT called
      expect(userRepository.resetProUserUsage).not.toHaveBeenCalled();
    });

    it('should automatically reset usage when Pro user has reached reset date', async () => {
      // Arrange: Pro user with reset date in the past (yesterday)
      const now = new Date('2025-10-22T12:00:00Z');
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 50,
        messages_reset_date: yesterday,
        trial_start_date: new Date('2025-01-01T00:00:00Z'),
        is_admin: false,
        created_at: new Date('2025-01-01T00:00:00Z'),
      });

      // Mock the resetProUserUsage function
      vi.mocked(userRepository.resetProUserUsage).mockResolvedValue({
        id: 'user-123',
        tier: 'pro',
        messages_used_count: 0,
        messages_reset_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: Should be allowed after automatic reset
      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(100); // Full quota after reset

      // Verify reset was called
      expect(userRepository.resetProUserUsage).toHaveBeenCalledWith('user-123');
      expect(userRepository.resetProUserUsage).toHaveBeenCalledTimes(1);
    });

    it('should block Pro user at limit when reset date not yet reached', async () => {
      // Arrange: Pro user at limit (100/100) with reset date in future
      const now = new Date('2025-10-22T12:00:00Z');
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 100,
        messages_reset_date: tomorrow,
        trial_start_date: new Date('2025-01-01T00:00:00Z'),
        is_admin: false,
        created_at: new Date('2025-01-01T00:00:00Z'),
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: Should be blocked (limit reached, reset date not reached)
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('LIMIT_EXCEEDED');
      expect(result.message).toContain('Monthly limit reached (100 messages)');
      expect(result.tier).toBe('pro');
      expect(result.messagesUsed).toBe(100);
      expect(result.messagesLimit).toBe(100);
      expect(result.resetDate).toBe(tomorrow.toISOString());

      // Verify reset was NOT called (date not reached)
      expect(userRepository.resetProUserUsage).not.toHaveBeenCalled();
    });

    it('should reset Pro user at limit when reset date has been reached', async () => {
      // Arrange: Pro user at limit (100/100) with reset date in past
      const now = new Date('2025-10-22T12:00:00Z');
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 100,
        messages_reset_date: yesterday,
        trial_start_date: new Date('2025-01-01T00:00:00Z'),
        is_admin: false,
        created_at: new Date('2025-01-01T00:00:00Z'),
      });

      const nextResetDate = new Date(now);
      nextResetDate.setDate(nextResetDate.getDate() + 30);

      vi.mocked(userRepository.resetProUserUsage).mockResolvedValue({
        id: 'user-123',
        tier: 'pro',
        messages_used_count: 0,
        messages_reset_date: nextResetDate,
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: Should be allowed after automatic reset
      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(100); // Full quota after reset

      // Verify reset was called
      expect(userRepository.resetProUserUsage).toHaveBeenCalledWith('user-123');
    });

    it('should NOT reset trial tier users (reset logic only for Pro)', async () => {
      // Arrange: Trial user (should not have reset logic applied)
      const now = new Date('2025-10-22T12:00:00Z');
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'trial@example.com',
        name: 'Trial User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: yesterday, // Should be ignored for trial users
        trial_start_date: new Date('2025-10-20T00:00:00Z'),
        is_admin: false,
        created_at: new Date('2025-10-20T00:00:00Z'),
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: Trial user should be allowed (5/10 messages)
      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(5);

      // Verify reset was NOT called (trial users don't reset)
      expect(userRepository.resetProUserUsage).not.toHaveBeenCalled();
    });

    it('should NOT reset PAYG tier users (reset logic only for Pro)', async () => {
      // Arrange: PAYG user (should not have reset logic applied)
      const now = new Date('2025-10-22T12:00:00Z');
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'payg@example.com',
        name: 'PAYG User',
        tier: 'payg',
        messages_used_count: 1000,
        messages_reset_date: yesterday, // Should be ignored for PAYG users
        trial_start_date: new Date('2025-01-01T00:00:00Z'),
        is_admin: false,
        created_at: new Date('2025-01-01T00:00:00Z'),
      });

      // Act
      const result = await checkUsageLimit('user-123');

      // Assert: PAYG user should be allowed (unlimited)
      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBeUndefined(); // No limit

      // Verify reset was NOT called (PAYG users don't have limits)
      expect(userRepository.resetProUserUsage).not.toHaveBeenCalled();
    });
  });
});
