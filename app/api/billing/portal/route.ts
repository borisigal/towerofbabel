import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { findUserWithBilling } from '@/lib/db/repositories/userRepository';
import { getCustomerPortalUrl } from '@/lib/lemonsqueezy/client';
import { checkRateLimit } from '@/lib/middleware/rateLimit';
import { log } from '@/lib/observability/logger';

/**
 * POST /api/billing/portal
 *
 * Generates Lemon Squeezy Customer Portal URL for authenticated user.
 * Allows users to manage billing, view invoices, update payment method, cancel subscription.
 *
 * **Authentication:** Required (Supabase Auth)
 * **Authorization:** User must have lemonsqueezy_customer_id (no portal access for trial users)
 * **Rate Limiting:** 10 requests per minute per user
 *
 * @returns { success: true, portalUrl: string } - Portal URL (expires in 24h)
 * @returns { success: false, error: { code, message } } - Error response
 *
 * @example
 * ```typescript
 * // Client-side usage
 * const response = await fetch('/api/billing/portal', { method: 'POST' });
 * const { portalUrl } = await response.json();
 * window.location.href = portalUrl; // Redirect to portal
 * ```
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // 1. AUTHENTICATION (Supabase Auth)
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // 2. RATE LIMITING (10 requests per minute per IP)
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await checkRateLimit(ip, 10);

    if (!rateLimitResult.allowed) {
      log.warn('Portal access rate limited', {
        userId: user.id,
        ip,
        remaining: rateLimitResult.remaining,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // 3. AUTHORIZATION - Query database for customer_id (database-as-source-of-truth)
    const userRecord = await findUserWithBilling(user.id);

    if (!userRecord) {
      log.error('User not found in database', { userId: user.id });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User record not found',
          },
        },
        { status: 404 }
      );
    }

    // 4. CHECK BILLING INFO - Trial users cannot access portal
    if (!userRecord.lemonsqueezy_customer_id) {
      log.warn('Portal access denied - no customer ID', {
        userId: user.id,
        tier: userRecord.tier,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_BILLING_INFO',
            message:
              'No billing information yet. Please upgrade to Pro to access billing portal.',
          },
        },
        { status: 403 }
      );
    }

    // 5. GENERATE PORTAL URL
    const portalUrl = await getCustomerPortalUrl(
      userRecord.lemonsqueezy_customer_id
    );

    // 6. LOGGING (structured)
    log.info('Portal URL generated', {
      userId: user.id,
      customerId: userRecord.lemonsqueezy_customer_id,
      tier: userRecord.tier,
      responseTimeMs: Date.now() - startTime,
    });

    // 7. RESPONSE
    return NextResponse.json(
      {
        success: true,
        portalUrl: portalUrl,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  } catch (error) {
    // 8. ERROR HANDLING
    log.error('Portal URL generation failed', {
      error,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PORTAL_ERROR',
          message: 'Failed to generate billing portal. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}
