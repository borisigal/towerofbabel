/**
 * GET /api/admin/feedback/export - Feedback Export API Route
 *
 * Exports feedback data as CSV file (metadata only, no message content).
 * Privacy-first design ensures user messages remain private.
 *
 * Authentication: Required (Supabase session)
 * Authorization: Admin only (is_admin = true)
 * Query params: ?range=7d|30d|all (default: 30d)
 *
 * @see docs/stories/4.5.story.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';
import {
  exportFeedbackData,
  type DateRangeType,
  type FeedbackExportData,
} from '@/lib/services/feedbackAnalyticsService';

/**
 * Converts feedback data array to CSV format
 * @param data - Feedback export data
 * @returns CSV string
 */
function convertToCSV(data: FeedbackExportData[]): string {
  if (data.length === 0) {
    return 'interpretation_id,timestamp,type,sender_culture,receiver_culture,feedback,feedback_timestamp,character_count,llm_provider,response_time_ms,cost_usd\n';
  }

  // CSV header (safe because we already checked length > 0)
  const firstRow = data[0];
  if (!firstRow) {
    return 'interpretation_id,timestamp,type,sender_culture,receiver_culture,feedback,feedback_timestamp,character_count,llm_provider,response_time_ms,cost_usd\n';
  }

  const headers = Object.keys(firstRow).join(',');

  // CSV rows
  const rows = data.map((row) => {
    return Object.values(row)
      .map((value) => {
        // Handle dates
        if (value instanceof Date) {
          return value.toISOString();
        }
        // Handle strings with commas (escape with quotes)
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * GET /api/admin/feedback/export
 *
 * Exports feedback data as CSV file (metadata only, no message content).
 *
 * Authentication: Required (Supabase session)
 * Authorization: Admin only (is_admin = true)
 * Query params: ?range=7d|30d|all (default: 30d)
 *
 * @param req - Next.js request with query params
 * @returns CSV file download
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // 1. AUTHENTICATION - Check user session
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Feedback export request - Unauthorized', {
        error: authError?.message,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // 2. AUTHORIZATION - Check admin flag from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { is_admin: true },
    });

    if (!dbUser || !dbUser.is_admin) {
      log.warn('Feedback export request - Forbidden (non-admin)', {
        user_id: user.id,
        is_admin: dbUser?.is_admin,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        { status: 403 }
      );
    }

    // 3. PARSE QUERY PARAMS
    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get('range') || '30d';

    // Validate range parameter
    const validRanges: DateRangeType[] = ['7d', '30d', 'all'];
    const dateRange: DateRangeType = validRanges.includes(
      rangeParam as DateRangeType
    )
      ? (rangeParam as DateRangeType)
      : '30d';

    log.info('Exporting feedback data', {
      user_id: user.id,
      dateRange,
    });

    // 4. FETCH EXPORT DATA
    const feedbackData = await exportFeedbackData(dateRange);

    // 5. CONVERT TO CSV
    const csvContent = convertToCSV(feedbackData);

    const responseTimeMs = Date.now() - startTime;

    log.info('Feedback data exported successfully', {
      user_id: user.id,
      dateRange,
      response_time_ms: responseTimeMs,
      record_count: feedbackData.length,
    });

    // 6. RETURN CSV FILE
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `feedback-export-${dateRange}-${today}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    log.error('Feedback export request - Server error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time_ms: responseTimeMs,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}
