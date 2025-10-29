import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabaseServer';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { configureLemonSqueezy, getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import prisma from '@/lib/db/prisma';
import { log } from '@/lib/observability/logger';
import { Prisma } from '@prisma/client';

/**
 * Creates a Lemon Squeezy subscription for PAYG tier (metered billing).
 *
 * CRITICAL: PAYG subscriptions are created immediately without checkout flow.
 * User agrees to pay-as-you-go terms when clicking "Start Pay-As-You-Go" button.
 *
 * Prevents duplicate PAYG subscriptions for same user.
 *
 * @param req - Next.js request object
 * @returns JSON response with subscription details or error
 */
export async function POST(_req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authentication - Supabase Auth
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      log.warn('PAYG subscription attempt without authentication', {
        error: error?.message,
        endpoint: '/api/subscription/payg/create'
      });
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }},
        { status: 401 }
      );
    }

    log.info('PAYG subscription creation started', {
      userId: user.id,
      email: user.email
    });

    // 2. Get user record and check for existing subscription
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subscription: true
      }
    });

    if (!userRecord) {
      log.error('User record not found for PAYG subscription', {
        userId: user.id,
        email: user.email
      });
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'User record not found' }},
        { status: 404 }
      );
    }

    // 3. Check for existing active PAYG subscription (prevent duplicates)
    if (userRecord.subscription && userRecord.subscription.status === 'active' && userRecord.subscription.tier === 'payg') {
      log.warn('Duplicate PAYG subscription attempt', {
        userId: user.id,
        email: userRecord.email,
        existingSubscriptionId: userRecord.subscription.lemonsqueezy_subscription_id,
        subscriptionStatus: userRecord.subscription.status
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_SUBSCRIPTION',
            message: 'User already has active PAYG subscription'
          }
        },
        { status: 400 }
      );
    }

    // 4. Configure Lemon Squeezy
    try {
      configureLemonSqueezy();
    } catch (configError) {
      log.error('Lemon Squeezy configuration error', {
        userId: user.id,
        error: configError instanceof Error ? configError.message : 'Unknown error',
        endpoint: '/api/subscription/payg/create'
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'Payment system configuration error. Please contact support.'
          }
        },
        { status: 500 }
      );
    }

    const config = getLemonSqueezyConfig();

    // Validate required environment variables
    if (!config.storeId || !config.paygVariantId) {
      log.error('Missing required Lemon Squeezy configuration', {
        userId: user.id,
        hasStoreId: !!config.storeId,
        hasPaygVariantId: !!config.paygVariantId,
        testMode: config.isTestMode
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'Payment system not properly configured. Please contact support.'
          }
        },
        { status: 500 }
      );
    }

    // 5. Create PAYG subscription checkout (no upfront payment, immediate activation)
    log.info('Creating PAYG subscription with Lemon Squeezy', {
      userId: user.id,
      email: userRecord.email,
      storeId: config.storeId,
      variantId: config.paygVariantId,
      testMode: config.isTestMode
    });

    const subscription = await createCheckout(config.storeId, config.paygVariantId, {
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true
      },
      checkoutData: {
        email: userRecord.email,
        name: userRecord.name || undefined,
        custom: {
          user_id: user.id  // Pass user_id to webhook for processing
        }
      },
      productOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard`
      },
      expiresAt: null,
      testMode: config.isTestMode
    });

    if (subscription.error) {
      log.error('Lemon Squeezy PAYG subscription creation failed', {
        userId: user.id,
        email: userRecord.email,
        error: subscription.error,
        errorMessage: subscription.error.message || 'Unknown error',
        storeId: config.storeId,
        variantId: config.paygVariantId
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUBSCRIPTION_CREATION_FAILED',
            message: 'Failed to create PAYG subscription. Please try again.'
          }
        },
        { status: 500 }
      );
    }

    // 6. Update user tier to PAYG immediately
    // Note: Webhook will create the full subscription record and set customer_id
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          tier: 'payg',
          // Keep existing customer ID if present, webhook will set it if not
          lemonsqueezy_customer_id: userRecord.lemonsqueezy_customer_id || undefined
        }
      });

      log.info('PAYG subscription created successfully', {
        userId: user.id,
        email: userRecord.email,
        subscriptionId: subscription.data?.data.id,
        checkoutUrl: subscription.data?.data.attributes.url,
        tier: 'payg'
      });
    } catch (dbError) {
      log.error('Database error updating user tier to PAYG', {
        userId: user.id,
        email: userRecord.email,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        subscriptionId: subscription.data?.data.id
      });

      // Handle specific Prisma errors
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        if (dbError.code === 'P2025') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'USER_NOT_FOUND',
                message: 'User record not found'
              }
            },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to update user subscription. Please contact support.'
          }
        },
        { status: 500 }
      );
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.data?.data.id,
        status: 'pending',  // Checkout created, subscription will be activated by webhook
        tier: 'payg',
        checkoutUrl: subscription.data?.data.attributes.url,
        message: 'Pay-As-You-Go subscription activated. You will be billed monthly for your usage.'
      }
    });

  } catch (error) {
    log.error('PAYG subscription endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: '/api/subscription/payg/create'
    });

    // Return user-friendly error message
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating your subscription. Please try again.'
        }
      },
      { status: 500 }
    );
  }
}