/**
 * Unit tests for GET /api/admin/feedback/stats endpoint
 *
 * Tests admin feedback statistics API including:
 * - Authentication and authorization (admin only)
 * - Query parameter validation (date range)
 * - Response data format
 * - Error handling
 *
 * Story 4.5 - Task 12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/admin/feedback/stats/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth/supabaseServer', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

vi.mock('@/lib/db/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/feedbackAnalyticsService', () => ({
  getOverallStats: vi.fn(),
  getCulturePairStats: vi.fn(),
}));

vi.mock('@/lib/observability/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { createClient } from '@/lib/auth/supabaseServer';
import prisma from '@/lib/db/prisma';
import {
  getOverallStats,
  getCulturePairStats,
} from '@/lib/services/feedbackAnalyticsService';

describe('GET /api/admin/feedback/stats', () => {
  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 for unauthenticated user', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        }),
      },
    } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/stats');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 403 for authenticated non-admin user', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      is_admin: false,
      name: 'Test User',
      tier: 'trial',
      messages_used_count: 0,
      messages_reset_date: new Date(),
      created_at: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/stats');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should return 200 with correct data for admin user', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      is_admin: true,
      name: 'Admin User',
      tier: 'pro',
      messages_used_count: 0,
      messages_reset_date: new Date(),
      created_at: new Date(),
    } as any);

    const mockOverallStats = {
      total_interpretations: 100,
      inbound: {
        total_with_feedback: 50,
        thumbs_up: 40,
        thumbs_down: 10,
        positive_rate: 80.0,
      },
      outbound: {
        total_with_feedback: 30,
        thumbs_up: 20,
        thumbs_down: 10,
        positive_rate: 66.67,
      },
    };

    const mockCulturePairStats = [
      {
        sender: 'en-US',
        receiver: 'ja-JP',
        total: 20,
        thumbs_up: 5,
        thumbs_down: 15,
        positive_rate: 25.0,
      },
    ];

    vi.mocked(getOverallStats).mockResolvedValue(mockOverallStats);
    vi.mocked(getCulturePairStats).mockResolvedValue(mockCulturePairStats);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/stats?range=30d');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total_interpretations).toBe(100);
    expect(data.data.inbound).toEqual(mockOverallStats.inbound);
    expect(data.data.outbound).toEqual(mockOverallStats.outbound);
    expect(data.data.culture_pairs).toEqual(mockCulturePairStats);
  });

  it('should handle date range query param correctly', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUser.id,
      is_admin: true,
    } as any);

    vi.mocked(getOverallStats).mockResolvedValue({
      total_interpretations: 0,
      inbound: { total_with_feedback: 0, thumbs_up: 0, thumbs_down: 0, positive_rate: 0 },
      outbound: { total_with_feedback: 0, thumbs_up: 0, thumbs_down: 0, positive_rate: 0 },
    });
    vi.mocked(getCulturePairStats).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/stats?range=7d');

    await GET(req);

    expect(getOverallStats).toHaveBeenCalledWith('7d');
    expect(getCulturePairStats).toHaveBeenCalledWith('7d');
  });

  it('should return empty stats gracefully (no interpretations)', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUser.id,
      is_admin: true,
    } as any);

    const emptyStats = {
      total_interpretations: 0,
      inbound: {
        total_with_feedback: 0,
        thumbs_up: 0,
        thumbs_down: 0,
        positive_rate: 0,
      },
      outbound: {
        total_with_feedback: 0,
        thumbs_up: 0,
        thumbs_down: 0,
        positive_rate: 0,
      },
    };

    vi.mocked(getOverallStats).mockResolvedValue(emptyStats);
    vi.mocked(getCulturePairStats).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/stats');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total_interpretations).toBe(0);
    expect(data.data.culture_pairs).toEqual([]);
  });

  it('should handle error for database failures', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUser.id,
      is_admin: true,
    } as any);

    vi.mocked(getOverallStats).mockRejectedValue(new Error('Database connection failed'));

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/stats');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('SERVER_ERROR');
  });
});
