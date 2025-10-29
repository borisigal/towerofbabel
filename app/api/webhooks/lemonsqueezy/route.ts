import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import prisma from '@/lib/db/prisma';
import { getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import { log } from '@/lib/observability/logger';
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionCancelled,
  handleSubscriptionResumed,
  handleSubscriptionExpired,
  handleSubscriptionPaused,
  handleSubscriptionUnpaused,
  handleSubscriptionPaymentSuccess,
  handleSubscriptionPaymentFailed,
  handleSubscriptionPaymentRecovered
} from '@/lib/lemonsqueezy/webhookHandlers';

/**
 * Lemon Squeezy webhook endpoint for processing subscription events.
 *
 * CRITICAL SECURITY: Validates webhook signatures using HMAC SHA-256.
 * IDEMPOTENCY: Stores event IDs to prevent duplicate processing.
 *
 * Supported events:
 * - subscription_created: New subscription activated
 * - subscription_updated: Subscription modified
 * - subscription_cancelled: User cancelled subscription
 * - subscription_resumed: Cancelled subscription reactivated
 * - subscription_expired: Subscription ended
 * - subscription_paused: Payment issue, subscription on hold
 * - subscription_unpaused: Payment issue resolved
 * - subscription_payment_success: Recurring payment succeeded
 * - subscription_payment_failed: Recurring payment failed
 * - subscription_payment_recovered: Failed payment recovered
 *
 * @param req - Next.js request object with webhook payload
 * @returns JSON response confirming receipt
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await req.text();

    // 2. Verify webhook signature
    const signature = req.headers.get('x-signature');
    if (!signature) {
      log.error('Webhook missing x-signature header', {
        endpoint: '/api/webhooks/lemonsqueezy'
      });
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const config = getLemonSqueezyConfig();
    const hash = createHmac('sha256', config.webhookSecret!)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      log.error('Webhook signature verification failed', {
        endpoint: '/api/webhooks/lemonsqueezy'
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Parse webhook payload
    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const eventId = payload.meta?.test_mode
      ? `test_${payload.data?.id}_${Date.now()}` // Generate unique ID for test events
      : payload.data?.id;

    if (!eventName || !eventId) {
      log.error('Webhook missing event_name or event_id', {
        endpoint: '/api/webhooks/lemonsqueezy'
      });
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // 4. Check for duplicate event (idempotency)
    const existingEvent = await prisma.lemonSqueezyEvent.findUnique({
      where: { lemonsqueezy_event_id: eventId.toString() }
    });

    if (existingEvent) {
      log.info(`Duplicate webhook event - skipping`, {
        eventId,
        endpoint: '/api/webhooks/lemonsqueezy'
      });
      return NextResponse.json({
        received: true,
        duplicate: true
      });
    }

    // 5. Process webhook in a transaction
    await prisma.$transaction(async (tx) => {
      // Store event for idempotency
      await tx.lemonSqueezyEvent.create({
        data: {
          lemonsqueezy_event_id: eventId.toString(),
          type: eventName,
          data: payload.data,
          processed_at: new Date()
        }
      });

      // Process based on event type
      switch (eventName) {
        case 'subscription_created':
          await handleSubscriptionCreated(payload.data, tx, payload.meta?.custom_data);
          break;

        case 'subscription_updated':
          await handleSubscriptionUpdated(payload.data, tx);
          break;

        case 'subscription_cancelled':
          await handleSubscriptionCancelled(payload.data, tx);
          break;

        case 'subscription_resumed':
          await handleSubscriptionResumed(payload.data, tx);
          break;

        case 'subscription_expired':
          await handleSubscriptionExpired(payload.data, tx, payload.meta?.custom_data);
          break;

        case 'subscription_paused':
          await handleSubscriptionPaused(payload.data, tx);
          break;

        case 'subscription_unpaused':
          await handleSubscriptionUnpaused(payload.data, tx);
          break;

        case 'subscription_payment_success':
          await handleSubscriptionPaymentSuccess(payload.data, tx);
          break;

        case 'subscription_payment_failed':
          await handleSubscriptionPaymentFailed(payload.data, tx);
          break;

        case 'subscription_payment_recovered':
          await handleSubscriptionPaymentRecovered(payload.data, tx);
          break;

        default:
          log.info('Unhandled webhook event', {
            eventName,
            endpoint: '/api/webhooks/lemonsqueezy'
          });
      }
    });

    // 6. Return success response
    return NextResponse.json({
      received: true
    });

  } catch (error) {
    log.error(
      'Webhook processing error - transaction will be rolled back',
      {
        endpoint: '/api/webhooks/lemonsqueezy',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        eventType: 'webhook_processing_error'
      }
    );

    // Return 500 to trigger Lemon Squeezy retry
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}