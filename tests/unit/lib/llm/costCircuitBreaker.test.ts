import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkCostBudget,
  trackCost,
} from '@/lib/llm/costCircuitBreaker';
import { kv } from '@/lib/kv/client';

// Mock KV client
vi.mock('@/lib/kv/client', () => ({
  kv: {
    get: vi.fn(),
    incrbyfloat: vi.fn(),
    expire: vi.fn(),
    keys: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

describe('checkCostBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow request when all cost limits are within budget', async () => {
    // Mock all costs as low (within limits)
    // Daily: $5 < $50, Hourly: $1 < $5, User: $0.5 < $1
    vi.mocked(kv.get).mockImplementation((key: string) => {
      if (typeof key === 'string' && key.startsWith('cost:daily')) {
        return Promise.resolve('5.0'); // Within daily limit
      }
      if (typeof key === 'string' && key.startsWith('cost:hourly')) {
        return Promise.resolve('1.0'); // Within hourly limit
      }
      if (typeof key === 'string' && key.startsWith('cost:user')) {
        return Promise.resolve('0.5'); // Within user limit
      }
      return Promise.resolve('0');
    });

    const result = await checkCostBudget('user-123');

    expect(result.allowed).toBe(true);
    expect(result.layer).toBeUndefined();
    expect(result.reason).toBeUndefined();
  });

  it('should block request when daily cost limit exceeded', async () => {
    // Mock daily cost exceeding $50 limit
    vi.mocked(kv.get).mockResolvedValue('55.0');

    const result = await checkCostBudget('user-123');

    expect(result.allowed).toBe(false);
    expect(result.layer).toBe('daily');
    expect(result.reason).toContain('Daily cost limit exceeded');
    expect(result.currentCost).toBe(55.0);
    expect(result.limit).toBe(50);
  });

  it('should block request when hourly cost limit exceeded', async () => {
    // Mock costs: daily within limit, hourly exceeds $5 limit
    vi.mocked(kv.get).mockImplementation((key: string) => {
      if (typeof key === 'string' && key.startsWith('cost:daily')) {
        return Promise.resolve('10.0'); // Within daily limit
      }
      if (typeof key === 'string' && key.startsWith('cost:hourly')) {
        return Promise.resolve('6.0'); // Hourly cost: $6 > $5 limit
      }
      return Promise.resolve('0');
    });

    const result = await checkCostBudget('user-123');

    expect(result.allowed).toBe(false);
    expect(result.layer).toBe('hourly');
    expect(result.reason).toContain('Hourly cost limit exceeded');
    expect(result.currentCost).toBe(6.0);
    expect(result.limit).toBe(5);
  });

  it('should block request when per-user daily cost limit exceeded', async () => {
    // Mock costs: daily & hourly within limits, user exceeds $1 limit
    vi.mocked(kv.get).mockImplementation((key: string) => {
      if (typeof key === 'string' && key.startsWith('cost:daily')) {
        return Promise.resolve('10.0'); // Within daily limit
      }
      if (typeof key === 'string' && key.startsWith('cost:hourly')) {
        return Promise.resolve('1.0'); // Within hourly limit
      }
      if (typeof key === 'string' && key.startsWith('cost:user')) {
        return Promise.resolve('1.5'); // User cost: $1.5 > $1 limit
      }
      return Promise.resolve('0');
    });

    const result = await checkCostBudget('user-123');

    expect(result.allowed).toBe(false);
    expect(result.layer).toBe('user');
    expect(result.reason).toContain('User daily cost limit exceeded');
    expect(result.currentCost).toBe(1.5);
    expect(result.limit).toBe(1);
  });

  it('should fail open (allow request) when Redis is unavailable', async () => {
    // Mock Redis connection failure
    vi.mocked(kv.get).mockRejectedValue(new Error('Redis connection failed'));

    const result = await checkCostBudget('user-123');

    // Should fail open - allow request even when Redis is down
    expect(result.allowed).toBe(true);
  });

  it('should return null cost when no costs exist yet', async () => {
    // Mock all costs as null (no keys exist yet)
    vi.mocked(kv.get).mockResolvedValue(null);

    const result = await checkCostBudget('user-123');

    // Should allow request when no costs tracked yet
    expect(result.allowed).toBe(true);
  });
});

describe('trackCost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should increment daily, hourly, and per-user cost counters', async () => {
    await trackCost('user-123', 0.02);

    // Verify incrbyfloat called 3 times (daily, hourly, per-user)
    expect(vi.mocked(kv.incrbyfloat)).toHaveBeenCalledTimes(3);

    // Verify daily cost incremented
    expect(vi.mocked(kv.incrbyfloat)).toHaveBeenCalledWith(
      expect.stringContaining('cost:daily'),
      0.02
    );

    // Verify hourly cost incremented
    expect(vi.mocked(kv.incrbyfloat)).toHaveBeenCalledWith(
      expect.stringContaining('cost:hourly'),
      0.02
    );

    // Verify per-user cost incremented
    expect(vi.mocked(kv.incrbyfloat)).toHaveBeenCalledWith(
      expect.stringContaining('cost:user:user-123'),
      0.02
    );
  });

  it('should set TTL on all cost counters', async () => {
    await trackCost('user-123', 0.02);

    // Verify expire called 3 times (daily, hourly, per-user)
    expect(vi.mocked(kv.expire)).toHaveBeenCalledTimes(3);

    // Verify daily cost TTL = 24 hours (86400 seconds)
    expect(vi.mocked(kv.expire)).toHaveBeenCalledWith(
      expect.stringContaining('cost:daily'),
      86400
    );

    // Verify hourly cost TTL = 1 hour (3600 seconds)
    expect(vi.mocked(kv.expire)).toHaveBeenCalledWith(
      expect.stringContaining('cost:hourly'),
      3600
    );

    // Verify per-user cost TTL = 24 hours (86400 seconds)
    expect(vi.mocked(kv.expire)).toHaveBeenCalledWith(
      expect.stringContaining('cost:user'),
      86400
    );
  });

  it('should fail gracefully when Redis is unavailable', async () => {
    // Mock Redis connection failure
    vi.mocked(kv.incrbyfloat).mockRejectedValue(
      new Error('Redis connection failed')
    );

    // Should not throw error - fails gracefully
    await expect(trackCost('user-123', 0.02)).resolves.toBeUndefined();
  });
});
