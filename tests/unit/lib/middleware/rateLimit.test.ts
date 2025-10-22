/**
 * Unit Tests for Rate Limiting Middleware
 *
 * Tests IP-based rate limiting with Redis (Vercel KV) backend.
 * Default: 50 requests per hour per IP address.
 *
 * Story 2.3 - Task 16
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, getRateLimitStatus } from '@/lib/middleware/rateLimit';
import { kv } from '@/lib/kv/client';

// Mock KV client
vi.mock('@/lib/kv/client', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('First Request from IP', () => {
    it('should allow first request from new IP address', async () => {
      // Mock: Key doesn't exist (first request)
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue('OK');

      const result = await checkRateLimit('192.168.1.100');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(49); // 50 - 1 = 49
      expect(result.reset).toBeGreaterThan(0);

      // Verify key was set with TTL
      expect(kv.set).toHaveBeenCalledWith(
        'ratelimit:ip:192.168.1.100',
        1,
        { ex: 3600 } // 1 hour TTL
      );
    });
  });

  describe('Within Rate Limit', () => {
    it('should allow request when under limit', async () => {
      // Mock: 25 requests already made (within 50 limit)
      vi.mocked(kv.get).mockResolvedValue(25);
      vi.mocked(kv.incr).mockResolvedValue(26);
      vi.mocked(kv.expire).mockResolvedValue(1);

      const result = await checkRateLimit('192.168.1.100');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(24); // 50 - 26 = 24
      expect(result.reset).toBeGreaterThan(0);

      // Verify counter was incremented
      expect(kv.incr).toHaveBeenCalledWith('ratelimit:ip:192.168.1.100');
      expect(kv.expire).toHaveBeenCalledWith('ratelimit:ip:192.168.1.100', 3600);
    });

    it('should allow 50th request (at limit)', async () => {
      // Mock: 49 requests already made
      vi.mocked(kv.get).mockResolvedValue(49);
      vi.mocked(kv.incr).mockResolvedValue(50);
      vi.mocked(kv.expire).mockResolvedValue(1);

      const result = await checkRateLimit('192.168.1.100');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(0); // 50 - 50 = 0
      expect(result.reset).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Exceeded', () => {
    it('should block 51st request from same IP within hour', async () => {
      // Mock: 50 requests already made (at limit)
      vi.mocked(kv.get).mockResolvedValue(50);

      const result = await checkRateLimit('192.168.1.100');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeGreaterThan(0);

      // Verify counter was NOT incremented (request blocked)
      expect(kv.incr).not.toHaveBeenCalled();
    });

    it('should block request when well over limit', async () => {
      // Mock: 100 requests already made (way over limit)
      vi.mocked(kv.get).mockResolvedValue(100);

      const result = await checkRateLimit('192.168.1.100');

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeGreaterThan(0);

      // Verify counter was NOT incremented
      expect(kv.incr).not.toHaveBeenCalled();
    });
  });

  describe('Custom Rate Limits', () => {
    it('should respect custom limit parameter', async () => {
      // Mock: 15 requests already made
      vi.mocked(kv.get).mockResolvedValue(15);
      vi.mocked(kv.incr).mockResolvedValue(16);
      vi.mocked(kv.expire).mockResolvedValue(1);

      // Custom limit of 20 (instead of default 50)
      const result = await checkRateLimit('192.168.1.100', 20);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(20);
      expect(result.remaining).toBe(4); // 20 - 16 = 4
    });

    it('should block request with custom limit when exceeded', async () => {
      // Mock: 20 requests already made
      vi.mocked(kv.get).mockResolvedValue(20);

      // Custom limit of 20
      const result = await checkRateLimit('192.168.1.100', 20);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(20);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Different IP Addresses', () => {
    it('should track rate limits independently per IP', async () => {
      // IP 1: First request
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue('OK');

      const result1 = await checkRateLimit('192.168.1.100');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(49);

      // IP 2: 40 requests already made
      vi.mocked(kv.get).mockResolvedValue(40);
      vi.mocked(kv.incr).mockResolvedValue(41);
      vi.mocked(kv.expire).mockResolvedValue(1);

      const result2 = await checkRateLimit('192.168.1.200');
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(9); // 50 - 41 = 9

      // Verify different keys used
      expect(kv.set).toHaveBeenCalledWith(
        'ratelimit:ip:192.168.1.100',
        1,
        { ex: 3600 }
      );
      expect(kv.incr).toHaveBeenCalledWith('ratelimit:ip:192.168.1.200');
    });
  });

  describe('Error Handling - Fail Open', () => {
    it('should allow request when Redis connection fails (fail open)', async () => {
      // Mock: Redis error
      vi.mocked(kv.get).mockRejectedValue(new Error('Redis connection failed'));

      const result = await checkRateLimit('192.168.1.100');

      // Fail open: Allow request even if Redis is down
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(50);
      expect(result.reset).toBeGreaterThan(0);
    });

    it('should allow request when Redis incr fails', async () => {
      // Mock: Get succeeds, but incr fails
      vi.mocked(kv.get).mockResolvedValue(25);
      vi.mocked(kv.incr).mockRejectedValue(new Error('Redis incr failed'));

      const result = await checkRateLimit('192.168.1.100');

      // Fail open: Allow request
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
    });
  });

  describe('Reset Time Calculation', () => {
    it('should set reset time to 1 hour from now', async () => {
      vi.mocked(kv.get).mockResolvedValue(null);
      vi.mocked(kv.set).mockResolvedValue('OK');

      const beforeTest = Math.floor(Date.now() / 1000);
      const result = await checkRateLimit('192.168.1.100');
      const afterTest = Math.floor(Date.now() / 1000);

      // Reset should be ~3600 seconds from now
      expect(result.reset).toBeGreaterThanOrEqual(beforeTest + 3600);
      expect(result.reset).toBeLessThanOrEqual(afterTest + 3600 + 1); // Allow 1 second tolerance
    });
  });
});

describe('getRateLimitStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return status without incrementing counter', async () => {
    // Mock: 30 requests already made
    vi.mocked(kv.get).mockResolvedValue(30);

    const result = await getRateLimitStatus('192.168.1.100');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(20); // 50 - 30 = 20

    // Verify counter was NOT incremented (read-only)
    expect(kv.incr).not.toHaveBeenCalled();
    expect(kv.set).not.toHaveBeenCalled();
  });

  it('should return blocked status when over limit', async () => {
    // Mock: 60 requests already made (over limit)
    vi.mocked(kv.get).mockResolvedValue(60);

    const result = await getRateLimitStatus('192.168.1.100');

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(0);

    // Verify counter was NOT incremented
    expect(kv.incr).not.toHaveBeenCalled();
  });

  it('should handle Redis errors gracefully', async () => {
    // Mock: Redis error
    vi.mocked(kv.get).mockRejectedValue(new Error('Redis connection failed'));

    const result = await getRateLimitStatus('192.168.1.100');

    // Fail open: Return allowed status
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(50);
  });
});
