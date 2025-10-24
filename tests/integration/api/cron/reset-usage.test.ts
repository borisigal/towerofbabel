/**
 * Integration Tests for Cron Job - Monthly Usage Reset
 *
 * Tests the /api/cron/reset-usage endpoint that runs daily to reset Pro users.
 * Validates authorization, query logic, reset operations, and error handling.
 *
 * @see app/api/cron/reset-usage/route.ts
 * @see docs/stories/3.1.story.md#task-10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/cron/reset-usage/route';
import { NextRequest } from 'next/server';
import * as userRepository from '@/lib/db/repositories/userRepository';
import prisma from '@/lib/db/prisma';

// Mock dependencies
vi.mock('@/lib/db/repositories/userRepository');
vi.mock('@/lib/db/prisma', () => ({
  default: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('POST /api/cron/reset-usage - Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Set test environment variable
    process.env.CRON_SECRET = 'test-secret-123';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Authorization', () => {
    it('should return 401 when Authorization header is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/cron/reset-usage', {
        method: 'POST',
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when Authorization header is invalid', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/cron/reset-usage', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer wrong-secret',
        },
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should accept request with valid Vercel Cron secret', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/cron/reset-usage', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      });

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('Reset Logic', () => {
    it('should reset multiple Pro users who have reached reset date', async () => {
      // Arrange
      const now = new Date('2025-10-22T00:00:00Z');
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const request = new NextRequest('http://localhost:3000/api/cron/reset-usage', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      });

      // Mock 3 Pro users due for reset
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'pro1@example.com',
          messages_used_count: 50,
          messages_reset_date: yesterday,
        },
        {
          id: 'user-2',
          email: 'pro2@example.com',
          messages_used_count: 100,
          messages_reset_date: yesterday,
        },
        {
          id: 'user-3',
          email: 'pro3@example.com',
          messages_used_count: 75,
          messages_reset_date: yesterday,
        },
      ] as any);

      // Mock successful resets
      vi.mocked(userRepository.resetProUserUsage).mockResolvedValue({
        id: 'user-1',
        tier: 'pro',
        messages_used_count: 0,
        messages_reset_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.reset_count).toBe(3);
      expect(body.data.total_found).toBe(3);
      expect(body.data.errors_count).toBe(0);

      // Verify resetProUserUsage was called for each user
      expect(userRepository.resetProUserUsage).toHaveBeenCalledTimes(3);
      expect(userRepository.resetProUserUsage).toHaveBeenCalledWith('user-1');
      expect(userRepository.resetProUserUsage).toHaveBeenCalledWith('user-2');
      expect(userRepository.resetProUserUsage).toHaveBeenCalledWith('user-3');
    });

    it('should skip users not due for reset', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/cron/reset-usage', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      });

      // Mock empty result (no users due for reset)
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.reset_count).toBe(0);
      expect(body.data.total_found).toBe(0);

      // Verify resetProUserUsage was NOT called
      expect(userRepository.resetProUserUsage).not.toHaveBeenCalled();
    });

    it('should return correct reset count and handle partial failures', async () => {
      // Arrange
      const now = new Date('2025-10-22T00:00:00Z');
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const request = new NextRequest('http://localhost:3000/api/cron/reset-usage', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      });

      // Mock 3 Pro users, but one will fail to reset
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'pro1@example.com',
          messages_used_count: 50,
          messages_reset_date: yesterday,
        },
        {
          id: 'user-2',
          email: 'pro2@example.com',
          messages_used_count: 100,
          messages_reset_date: yesterday,
        },
        {
          id: 'user-3',
          email: 'pro3@example.com',
          messages_used_count: 75,
          messages_reset_date: yesterday,
        },
      ] as any);

      // Mock: First and third succeed, second fails
      vi.mocked(userRepository.resetProUserUsage)
        .mockResolvedValueOnce({
          id: 'user-1',
          tier: 'pro',
          messages_used_count: 0,
          messages_reset_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        })
        .mockRejectedValueOnce(new Error('Database connection failed'))
        .mockResolvedValueOnce({
          id: 'user-3',
          tier: 'pro',
          messages_used_count: 0,
          messages_reset_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.reset_count).toBe(2); // Only 2 succeeded
      expect(body.data.total_found).toBe(3);
      expect(body.data.errors_count).toBe(1);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].userId).toBe('user-2');
    });

    it('should query only Pro users with reset_date <= now', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/cron/reset-usage', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      });

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      // Act
      await POST(request);

      // Assert: Verify Prisma query was called with correct filters
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tier: 'pro',
            messages_reset_date: {
              lte: expect.any(Date),
            },
          },
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/cron/reset-usage', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-123',
        },
      });

      // Mock database error
      vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('Database connection timeout'));

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
