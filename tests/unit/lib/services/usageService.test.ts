/**
 * Unit Tests for Usage Service
 *
 * Tests usage limit checking logic for all three user tiers:
 * - Trial: 10 messages total (lifetime)
 * - Pro: 100 messages per month
 * - PAYG: Unlimited
 *
 * Story 2.3 - Task 15
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkUsageLimit } from '@/lib/services/usageService';
import * as userRepository from '@/lib/db/repositories/userRepository';

// Mock user repository
vi.mock('@/lib/db/repositories/userRepository', () => ({
  findUserById: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('checkUsageLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trial Users', () => {
    it('should allow interpretation when trial user has messages remaining', async () => {
      // Mock trial user with 5 messages used (5/10)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'trial@example.com',
        name: 'Trial User',
        tier: 'trial',
        messages_used_count: 5,
        messages_reset_date: new Date(),
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(5); // 10 - 5 = 5 remaining
      expect(result.error).toBeUndefined();
    });

    it('should allow interpretation when trial user has 1 message remaining', async () => {
      // Mock trial user with 9 messages used (9/10)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'trial@example.com',
        name: 'Trial User',
        tier: 'trial',
        messages_used_count: 9,
        messages_reset_date: new Date(),
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(1); // 10 - 9 = 1 remaining
      expect(result.error).toBeUndefined();
    });

    it('should block interpretation when trial user exhausted 10 messages', async () => {
      // Mock trial user with 10 messages used (10/10)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'trial@example.com',
        name: 'Trial User',
        tier: 'trial',
        messages_used_count: 10,
        messages_reset_date: new Date(),
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-123');

      expect(result.allowed).toBe(false);
      expect(result.messagesRemaining).toBe(0);
      expect(result.error).toBe('TRIAL_LIMIT_EXCEEDED');
      expect(result.message).toContain('Trial limit of 10 messages exceeded');
    });

    it('should block interpretation when trial user exceeded limit', async () => {
      // Mock trial user with 15 messages used (15/10)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-123',
        email: 'trial@example.com',
        name: 'Trial User',
        tier: 'trial',
        messages_used_count: 15,
        messages_reset_date: new Date(),
        trial_start_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-123');

      expect(result.allowed).toBe(false);
      expect(result.messagesRemaining).toBe(0);
      expect(result.error).toBe('TRIAL_LIMIT_EXCEEDED');
    });
  });

  describe('Pro Users', () => {
    it('should allow interpretation when pro user has messages remaining', async () => {
      // Mock pro user with 50 messages used (50/100)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-456',
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 50,
        messages_reset_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-456');

      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(50); // 100 - 50 = 50 remaining
      expect(result.error).toBeUndefined();
    });

    it('should allow interpretation when pro user has 1 message remaining', async () => {
      // Mock pro user with 99 messages used (99/100)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-456',
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 99,
        messages_reset_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-456');

      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(1); // 100 - 99 = 1 remaining
      expect(result.error).toBeUndefined();
    });

    it('should block interpretation when pro user exhausted 100 messages', async () => {
      // Mock pro user with 100 messages used (100/100)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-456',
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 100,
        messages_reset_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-456');

      expect(result.allowed).toBe(false);
      expect(result.messagesRemaining).toBe(0);
      expect(result.error).toBe('PRO_LIMIT_EXCEEDED');
      expect(result.message).toContain(
        'Pro monthly limit of 100 messages exceeded'
      );
    });

    it('should block interpretation when pro user exceeded monthly limit', async () => {
      // Mock pro user with 150 messages used (150/100)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-456',
        email: 'pro@example.com',
        name: 'Pro User',
        tier: 'pro',
        messages_used_count: 150,
        messages_reset_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-456');

      expect(result.allowed).toBe(false);
      expect(result.messagesRemaining).toBe(0);
      expect(result.error).toBe('PRO_LIMIT_EXCEEDED');
    });
  });

  describe('PAYG (Pay-As-You-Go) Users', () => {
    it('should allow unlimited interpretations for PAYG users', async () => {
      // Mock PAYG user with 500 messages used (no limit)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-789',
        email: 'payg@example.com',
        name: 'PAYG User',
        tier: 'payg',
        messages_used_count: 500,
        messages_reset_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-789');

      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBeUndefined(); // No limit
      expect(result.error).toBeUndefined();
    });

    it('should allow interpretation for PAYG user with 0 messages used', async () => {
      // Mock PAYG user with 0 messages used
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-789',
        email: 'payg@example.com',
        name: 'PAYG User',
        tier: 'payg',
        messages_used_count: 0,
        messages_reset_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-789');

      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBeUndefined(); // No limit
      expect(result.error).toBeUndefined();
    });

    it('should allow interpretation for PAYG user with 10000 messages used', async () => {
      // Mock PAYG user with high usage (no limit)
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-789',
        email: 'payg@example.com',
        name: 'PAYG User',
        tier: 'payg',
        messages_used_count: 10000,
        messages_reset_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      const result = await checkUsageLimit('user-789');

      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBeUndefined(); // No limit
      expect(result.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when user not found in database', async () => {
      // Mock user not found
      vi.mocked(userRepository.findUserById).mockResolvedValue(null);

      await expect(checkUsageLimit('nonexistent-user')).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error for unknown tier', async () => {
      // Mock user with unknown tier
      vi.mocked(userRepository.findUserById).mockResolvedValue({
        id: 'user-999',
        email: 'unknown@example.com',
        name: 'Unknown Tier User',
        tier: 'unknown_tier', // Invalid tier
        messages_used_count: 5,
        messages_reset_date: new Date(),
        is_admin: false,
        created_at: new Date(),
      });

      await expect(checkUsageLimit('user-999')).rejects.toThrow(
        'Unknown user tier'
      );
    });
  });
});
