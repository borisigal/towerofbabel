import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { configureLemonSqueezy, getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';

/**
 * Creates a Lemon Squeezy checkout session for Pro tier subscription.
 *
 * CRITICAL: Must authenticate user before creating checkout session to prevent
 * unauthorized checkout creation.
 *
 * @param req - Next.js request object
 * @returns JSON response with checkout URL or error
 *
 * @example
 * ```typescript
 * // POST /api/checkout/pro
 * // Returns: { success: true, checkoutUrl: "https://checkout.lemonsqueezy.com/..." }
 * ```
 */
export async function POST(_req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authentication - Supabase Auth
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      log.warn(
        'Unauthorized checkout attempt - authentication failed',
        { endpoint: '/api/checkout/pro', error: error?.message }
      );
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }},
        { status: 401 }
      );
    }

    // 2. Configure Lemon Squeezy
    configureLemonSqueezy();
    const config = getLemonSqueezyConfig();

    // Validate configuration values are not empty/null/whitespace
    if (!config.storeId || !config.storeId.trim() ||
        !config.proVariantId || !config.proVariantId.trim()) {
      log.error(
        'Invalid Lemon Squeezy configuration',
        { endpoint: '/api/checkout/pro', config }
      );
      return NextResponse.json(
        { success: false, error: { code: 'CONFIGURATION_ERROR', message: 'Lemon Squeezy configuration is invalid' }},
        { status: 500 }
      );
    }

    // 3. Get user record and check for existing subscription
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: true }
    });

    if (!userRecord) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'User record not found' }},
        { status: 404 }
      );
    }

    // 4. Check for duplicate Pro subscription
    if (userRecord.subscription && userRecord.subscription.tier === 'pro' && userRecord.subscription.status === 'active') {
      log.warn(
        'User attempted to create duplicate Pro subscription',
        { userId: user.id, subscriptionId: userRecord.subscription.lemonsqueezy_subscription_id }
      );
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_SUBSCRIPTION', message: 'User already has an active Pro subscription' }},
        { status: 400 }
      );
    }

    // 5. Create checkout session
    const successUrl = `${process.env.NEXT_PUBLIC_URL}/checkout/success?upgrade=success`;

    let checkout;
    try {
      log.info(
        'Creating Pro checkout session',
        { userId: user.id, email: userRecord.email, tier: 'pro' }
      );

      checkout = await createCheckout(config.storeId!, config.proVariantId!, {
        checkoutData: {
          email: userRecord.email,
          custom: {
            user_id: user.id  // Pass user_id to webhook for processing
          }
        },
        checkoutOptions: {
          embed: false,  // Redirect to Lemon Squeezy hosted checkout
          media: true,    // Show product images
          logo: true     // Show store logo
        },
        productOptions: {
          redirectUrl: successUrl  // Redirect URL after successful checkout
        },
        expiresAt: null,  // No expiration
        testMode: config.isTestMode
      });
    } catch (checkoutError) {
      const error = checkoutError as Error & {
        response?: {
          data?: unknown;
          status?: number;
        };
      };

      log.error(
        'Lemon Squeezy checkout API error',
        {
          userId: user.id,
          error: error.message,
          responseData: error.response?.data,
          responseStatus: error.response?.status
        }
      );

      // Return the actual error to help debug
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHECKOUT_API_ERROR',
            message: error.message || 'Unknown error from Lemon Squeezy',
            details: {
              error: String(error),
              stack: error.stack,
              responseData: error.response?.data,
              responseStatus: error.response?.status,
              responseErrors: (error.response?.data as { errors?: unknown })?.errors
            }
          }
        },
        { status: 500 }
      );
    }

    if (checkout.error) {
      log.error(
        'Lemon Squeezy checkout creation failed',
        { userId: user.id, error: checkout.error }
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHECKOUT_CREATION_FAILED',
            message: 'Failed to create checkout session. Please try again.',
            lsError: checkout.error
          }
        },
        { status: 500 }
      );
    }

    // 6. Validate and return checkout URL
    const checkoutUrl = checkout.data?.data?.attributes?.url;

    if (!checkoutUrl) {
      log.error(
        'Lemon Squeezy checkout response missing URL',
        { userId: user.id, checkoutResponse: checkout }
      );
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHECKOUT_URL_MISSING',
            message: 'Checkout session created but URL is missing'
          }
        },
        { status: 500 }
      );
    }

    log.info(
      'Pro checkout session created successfully',
      { userId: user.id, checkoutUrl }
    );

    return NextResponse.json({
      success: true,
      checkoutUrl
    });

  } catch (error) {
    log.error(
      'Checkout endpoint error',
      {
        endpoint: '/api/checkout/pro',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    );

    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating your checkout session. Please try again.',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}