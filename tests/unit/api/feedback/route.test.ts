/**
 * Unit tests for POST /api/feedback endpoint
 *
 * Tests feedback submission API including:
 * - Authentication and authorization
 * - Input validation
 * - Idempotency
 * - Error handling
 *
 * @see app/api/feedback/route.ts
 * @see docs/stories/4.4.story.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/feedback/route';
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
    interpretation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/observability/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { createClient } from '@/lib/auth/supabaseServer';
import prisma from '@/lib/db/prisma';

describe('POST /api/feedback', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockInterpretationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 for unauthenticated requests', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        }),
      },
    } as any);

    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 for invalid feedback type', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'invalid',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('should return 404 for non-existent interpretation', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.interpretation.findUnique).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should return 401 for interpretation owned by different user', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.interpretation.findUnique).mockResolvedValue({
      id: mockInterpretationId,
      user_id: 'different-user',
      feedback: null,
      feedback_timestamp: null,
    } as any);

    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 for duplicate feedback submission', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.interpretation.findUnique).mockResolvedValue({
      id: mockInterpretationId,
      user_id: mockUser.id,
      feedback: 'up',
      feedback_timestamp: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'down',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('ALREADY_SUBMITTED');
  });

  it('should successfully submit feedback and return 200', async () => {
    const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockCreateClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    vi.mocked(prisma.interpretation.findUnique).mockResolvedValue({
      id: mockInterpretationId,
      user_id: mockUser.id,
      feedback: null,
      feedback_timestamp: null,
    } as any);

    vi.mocked(prisma.interpretation.update).mockResolvedValue({
      id: mockInterpretationId,
      user_id: mockUser.id,
      feedback: 'up',
      feedback_timestamp: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.interpretationId).toBe(mockInterpretationId);
    expect(data.data.feedback).toBe('up');
    expect(data.data.timestamp).toBeDefined();

    expect(prisma.interpretation.update).toHaveBeenCalledWith({
      where: { id: mockInterpretationId },
      data: {
        feedback: 'up',
        feedback_timestamp: expect.any(Date),
      },
    });
  });
});
