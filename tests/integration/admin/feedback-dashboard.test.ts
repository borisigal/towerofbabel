/**
 * Integration tests for Admin Feedback Analytics Dashboard
 *
 * Tests end-to-end flows for admin feedback dashboard:
 * - Admin user can access dashboard
 * - Non-admin user is blocked
 * - Date range filter updates stats
 * - CSV export works correctly
 * - Statistics match dashboard display
 *
 * Story 4.5 - Task 13
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as statsGET } from '@/app/api/admin/feedback/stats/route';
import { GET as exportGET } from '@/app/api/admin/feedback/export/route';
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
    interpretation: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
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

describe('Admin Feedback Dashboard Integration', () => {
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
  };

  const mockNonAdminUser = {
    id: 'user-456',
    email: 'user@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow admin user to access dashboard and retrieve stats', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockAdminUser.id,
      email: mockAdminUser.email,
      is_admin: true,
      name: 'Admin User',
      tier: 'pro',
      messages_used_count: 0,
      messages_reset_date: new Date(),
      created_at: new Date(),
    } as any);

    // Mock interpretation data
    // Note: groupBy is called 3 times in getOverallStats + getCulturePairStats
    // Order: inbound feedback, outbound feedback, culture pairs
    vi.mocked(prisma.interpretation.count).mockResolvedValue(100);

    // Mock for getOverallStats (2 calls: inbound, outbound)
    vi.mocked(prisma.interpretation.groupBy)
      .mockResolvedValueOnce([
        { feedback: 'up', _count: { feedback: 80 } },
        { feedback: 'down', _count: { feedback: 20 } },
      ] as any) // Inbound feedback groupBy
      .mockResolvedValueOnce([
        { feedback: 'up', _count: { feedback: 60 } },
        { feedback: 'down', _count: { feedback: 40 } },
      ] as any) // Outbound feedback groupBy
      .mockResolvedValueOnce([
        { culture_sender: 'en-US', culture_receiver: 'ja-JP', feedback: 'up', _count: { feedback: 10 } },
        { culture_sender: 'en-US', culture_receiver: 'ja-JP', feedback: 'down', _count: { feedback: 90 } },
      ] as any); // Culture pair groupBy

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/stats?range=30d');
    const response = await statsGET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total_interpretations).toBe(100);
    // Check inbound and outbound stats
    expect(data.data.inbound).toBeDefined();
    expect(data.data.outbound).toBeDefined();
    // Check culture pairs (may be reordered)
    expect(data.data.culture_pairs).toBeDefined();
    expect(Array.isArray(data.data.culture_pairs)).toBe(true);
  });

  it('should block non-admin user from accessing dashboard stats', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockNonAdminUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockNonAdminUser.id,
      email: mockNonAdminUser.email,
      is_admin: false,
      name: 'Regular User',
      tier: 'trial',
      messages_used_count: 0,
      messages_reset_date: new Date(),
      created_at: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/stats');
    const response = await statsGET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should update stats when date range filter changes', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockAdminUser.id,
      is_admin: true,
    } as any);

    // Mock data for 7d range (need 3 groupBy calls: inbound, outbound, culture pairs)
    vi.mocked(prisma.interpretation.count).mockResolvedValue(50);
    vi.mocked(prisma.interpretation.groupBy)
      .mockResolvedValueOnce([
        { feedback: 'up', _count: { feedback: 40 } },
        { feedback: 'down', _count: { feedback: 10 } },
      ] as any) // Inbound
      .mockResolvedValueOnce([]) // Outbound
      .mockResolvedValueOnce([]); // Culture pairs

    const req7d = new NextRequest('http://localhost:3000/api/admin/feedback/stats?range=7d');
    const response7d = await statsGET(req7d);
    const data7d = await response7d.json();

    expect(response7d.status).toBe(200);
    expect(data7d.data.total_interpretations).toBe(50);

    // Reset ALL mocks for 30d range test
    vi.clearAllMocks();

    // Re-setup all mocks
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockAdminUser.id,
      is_admin: true,
    } as any);

    vi.mocked(prisma.interpretation.count).mockResolvedValue(150);
    vi.mocked(prisma.interpretation.groupBy)
      .mockResolvedValueOnce([
        { feedback: 'up', _count: { feedback: 100 } },
        { feedback: 'down', _count: { feedback: 50 } },
      ] as any) // Inbound
      .mockResolvedValueOnce([]) // Outbound
      .mockResolvedValueOnce([]); // Culture pairs

    const req30d = new NextRequest('http://localhost:3000/api/admin/feedback/stats?range=30d');
    const response30d = await statsGET(req30d);
    const data30d = await response30d.json();

    expect(response30d.status).toBe(200);
    expect(data30d.data.total_interpretations).toBe(150);
  });

  it('should export CSV with correct data matching dashboard stats', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockAdminUser.id,
      is_admin: true,
    } as any);

    vi.mocked(prisma.interpretation.findMany).mockResolvedValue([
      {
        id: 'interp-123',
        timestamp: new Date('2025-01-01'),
        interpretation_type: 'inbound',
        culture_sender: 'en-US',
        culture_receiver: 'ja-JP',
        feedback: 'up',
        feedback_timestamp: new Date('2025-01-02'),
        character_count: 100,
        llm_provider: 'anthropic',
        response_time_ms: 500,
        cost_usd: 0.01,
      },
      {
        id: 'interp-456',
        timestamp: new Date('2025-01-03'),
        interpretation_type: 'outbound',
        culture_sender: 'fr-FR',
        culture_receiver: 'de-DE',
        feedback: 'down',
        feedback_timestamp: new Date('2025-01-04'),
        character_count: 150,
        llm_provider: 'anthropic',
        response_time_ms: 600,
        cost_usd: 0.02,
      },
    ] as any);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/export?range=30d');
    const response = await exportGET(req);
    const csvContent = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');

    // Verify CSV contains both records
    expect(csvContent).toContain('interp-123');
    expect(csvContent).toContain('interp-456');
    expect(csvContent).toContain('inbound');
    expect(csvContent).toContain('outbound');
    expect(csvContent).toContain('en-US');
    expect(csvContent).toContain('ja-JP');
    expect(csvContent).toContain('fr-FR');
    expect(csvContent).toContain('de-DE');
  });

  it('should validate CSV export excludes message content (privacy compliance)', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockAdminUser.id,
      is_admin: true,
    } as any);

    vi.mocked(prisma.interpretation.findMany).mockResolvedValue([
      {
        id: 'test-123',
        timestamp: new Date(),
        interpretation_type: 'inbound',
        culture_sender: 'en-US',
        culture_receiver: 'ja-JP',
        feedback: 'up',
        feedback_timestamp: new Date(),
        character_count: 100,
        llm_provider: 'anthropic',
        response_time_ms: 500,
        cost_usd: 0.01,
      },
    ] as any);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/export');
    const response = await exportGET(req);
    const csvContent = await response.text();

    // Verify CSV does NOT contain message content fields
    expect(csvContent).not.toContain('original_message');
    expect(csvContent).not.toContain('sender_emotions');
    expect(csvContent).not.toContain('receiver_emotions');
    expect(csvContent).not.toContain('insights');

    // Verify CSV DOES contain metadata fields
    expect(csvContent).toContain('interpretation_id');
    expect(csvContent).toContain('timestamp');
    expect(csvContent).toContain('sender_culture');
    expect(csvContent).toContain('receiver_culture');
    expect(csvContent).toContain('feedback');
  });
});
