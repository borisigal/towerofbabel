/**
 * Unit tests for GET /api/admin/feedback/export endpoint
 *
 * Tests admin feedback CSV export API including:
 * - Authentication and authorization (admin only)
 * - CSV format and headers
 * - Privacy compliance (metadata only, no message content)
 * - Date range filtering
 * - Error handling
 *
 * Story 4.5 - Task 12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/admin/feedback/export/route';
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
  exportFeedbackData: vi.fn(),
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
import { exportFeedbackData } from '@/lib/services/feedbackAnalyticsService';

describe('GET /api/admin/feedback/export', () => {
  const mockUser = {
    id: 'user-123',
    email: 'admin@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 for non-admin user', async () => {
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

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/export');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should return CSV file for admin user', async () => {
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

    const mockExportData = [
      {
        interpretation_id: '123',
        timestamp: new Date('2025-01-01'),
        type: 'inbound',
        sender_culture: 'en-US',
        receiver_culture: 'ja-JP',
        feedback: 'up',
        feedback_timestamp: new Date('2025-01-02'),
        character_count: 100,
        llm_provider: 'anthropic',
        response_time_ms: 500,
        cost_usd: 0.01,
      },
    ];

    vi.mocked(exportFeedbackData).mockResolvedValue(mockExportData);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/export?range=30d');

    const response = await GET(req);
    const csvContent = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(csvContent).toContain('interpretation_id');
    expect(csvContent).toContain('timestamp');
    expect(csvContent).toContain('123');
  });

  it('should have correct CSV headers', async () => {
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

    vi.mocked(exportFeedbackData).mockResolvedValue([
      {
        interpretation_id: '123',
        timestamp: new Date(),
        type: 'inbound',
        sender_culture: 'en-US',
        receiver_culture: 'ja-JP',
        feedback: 'up',
        feedback_timestamp: new Date(),
        character_count: 100,
        llm_provider: 'anthropic',
        response_time_ms: 500,
        cost_usd: 0.01,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/export');

    const response = await GET(req);
    const csvContent = await response.text();

    const headers = csvContent.split('\n')[0];
    expect(headers).toContain('interpretation_id');
    expect(headers).toContain('timestamp');
    expect(headers).toContain('type');
    expect(headers).toContain('sender_culture');
    expect(headers).toContain('receiver_culture');
    expect(headers).toContain('feedback');
    expect(headers).toContain('character_count');
    expect(headers).toContain('llm_provider');
    expect(headers).toContain('cost_usd');
  });

  it('should contain correct data (metadata only, no message content)', async () => {
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

    vi.mocked(exportFeedbackData).mockResolvedValue([
      {
        interpretation_id: 'test-123',
        timestamp: new Date('2025-01-01'),
        type: 'inbound',
        sender_culture: 'en-US',
        receiver_culture: 'ja-JP',
        feedback: 'up',
        feedback_timestamp: new Date('2025-01-02'),
        character_count: 100,
        llm_provider: 'anthropic',
        response_time_ms: 500,
        cost_usd: 0.01,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/export');

    const response = await GET(req);
    const csvContent = await response.text();

    // Verify metadata is present
    expect(csvContent).toContain('test-123');
    expect(csvContent).toContain('inbound');
    expect(csvContent).toContain('en-US');
    expect(csvContent).toContain('ja-JP');

    // Verify message content fields are NOT present (privacy compliance)
    expect(csvContent).not.toContain('original_message');
    expect(csvContent).not.toContain('sender_emotions');
    expect(csvContent).not.toContain('receiver_emotions');
    expect(csvContent).not.toContain('insights');
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

    vi.mocked(exportFeedbackData).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/export?range=7d');

    await GET(req);

    expect(exportFeedbackData).toHaveBeenCalledWith('7d');
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

    vi.mocked(exportFeedbackData).mockRejectedValue(new Error('Database connection failed'));

    const req = new NextRequest('http://localhost:3000/api/admin/feedback/export');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('SERVER_ERROR');
  });
});
