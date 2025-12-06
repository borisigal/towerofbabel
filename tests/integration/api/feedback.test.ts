/**
 * Integration tests for /api/feedback route
 *
 * Tests API validation, sanitization, and database persistence for feedback feature.
 * Includes tests for optional text feedback (Story 7.2).
 *
 * @see app/api/feedback/route.ts
 * @see docs/stories/4.4.story.md
 * @see docs/stories/7.2.story.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/feedback/route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createClient } from '@/lib/auth/supabaseServer';

// Mock Supabase client
vi.mock('@/lib/auth/supabaseServer', () => ({
  createClient: vi.fn(),
}));

// Mock Prisma client
vi.mock('@/lib/db/prisma', () => ({
  default: {
    interpretation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('/api/feedback - POST', () => {
  const mockUserId = 'test-user-123';
  const mockInterpretationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful authentication
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
    });

    // Mock interpretation exists and belongs to user
    (prisma.interpretation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockInterpretationId,
      user_id: mockUserId,
      feedback: null,
      feedback_timestamp: null,
    });

    // Mock successful update
    (prisma.interpretation.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockInterpretationId,
      feedback: 'up',
      feedback_text: null,
      feedback_timestamp: new Date(),
    });
  });

  it('should accept feedback with text under 500 characters', async () => {
    const feedbackText = 'This interpretation was very helpful and accurate!';

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
        feedback_text: feedbackText,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.interpretation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockInterpretationId },
        data: expect.objectContaining({
          feedback: 'up',
          feedback_text: feedbackText,
        }),
      })
    );
  });

  it('should reject feedback with text over 500 characters', async () => {
    const longText = 'a'.repeat(501);

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
        feedback_text: longText,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_INPUT');
    expect(data.error.message).toContain('500 characters');
  });

  it('should sanitize HTML in feedback text', async () => {
    const maliciousText = '<script>alert("XSS")</script>Helpful feedback';

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
        feedback_text: maliciousText,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify HTML tags were stripped
    const updateCall = (prisma.interpretation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.feedback_text).toBe('alert("XSS")Helpful feedback');
    expect(updateCall.data.feedback_text).not.toContain('<script>');
  });

  it('should treat empty string as NULL', async () => {
    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
        feedback_text: '   ',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify empty/whitespace string converted to null
    const updateCall = (prisma.interpretation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.feedback_text).toBeNull();
  });

  it('should accept feedback without text (backward compatibility)', async () => {
    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'down',
        // No feedback_text field
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify update called with null for feedback_text
    const updateCall = (prisma.interpretation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.feedback).toBe('down');
    expect(updateCall.data.feedback_text).toBeNull();
  });

  it('should strip HTML tags including complex nested tags', async () => {
    const complexHtml = '<div><p>Good <strong>feedback</strong></p><img src="x" onerror="alert(1)"></div>';

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
        feedback_text: complexHtml,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify all HTML tags stripped
    const updateCall = (prisma.interpretation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.feedback_text).toBe('Good feedback');
    expect(updateCall.data.feedback_text).not.toContain('<');
    expect(updateCall.data.feedback_text).not.toContain('>');
  });

  it('should trim whitespace from feedback text', async () => {
    const textWithWhitespace = '  \n  Helpful feedback  \n\n  ';

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
        feedback_text: textWithWhitespace,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify whitespace trimmed
    const updateCall = (prisma.interpretation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.feedback_text).toBe('Helpful feedback');
  });

  it('should handle special characters correctly', async () => {
    const specialChars = 'Feedback with "quotes" & <brackets> and symbols: @#$%';

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'up',
        feedback_text: specialChars,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify special characters preserved (except HTML tags)
    const updateCall = (prisma.interpretation.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.feedback_text).toContain('Feedback with "quotes" &');
    expect(updateCall.data.feedback_text).not.toContain('<brackets>');
  });

  it('should validate interpretationId as UUID', async () => {
    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: 'not-a-valid-uuid',
        feedback: 'up',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('should reject invalid feedback value', async () => {
    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: 'invalid',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('should accept null feedback with text (text-only feedback)', async () => {
    const feedbackText = 'Just wanted to share my thoughts';

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        interpretationId: mockInterpretationId,
        feedback: null,
        feedback_text: feedbackText,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.interpretation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockInterpretationId },
        data: expect.objectContaining({
          feedback: null,
          feedback_text: feedbackText,
        }),
      })
    );
  });
});
