// Test script to simulate Lemon Squeezy subscription_cancelled webhook
const { createHmac } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load environment variables
require('dotenv').config({ path: '.env' });

async function testCancellationWebhook() {
  try {
    // 1. Get user from database
    console.log('Fetching user from database...');
    const user = await prisma.user.findFirst({
      orderBy: {
        created_at: 'desc'
      },
      include: {
        subscription: true
      }
    });

    if (!user) {
      console.error('No user found in database');
      return;
    }

    console.log(`User found: ${user.email} (ID: ${user.id})`);
    console.log(`Current tier: ${user.tier}`);

    if (!user.subscription) {
      console.error('User has no subscription to cancel!');
      return;
    }

    console.log(`Current subscription status: ${user.subscription.status}\n`);

    // 2. Get configuration
    const webhookSecret = process.env.LEMONSQUEEZY_TEST_MODE === 'true'
      ? process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST
      : process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET_TEST not configured');
      return;
    }

    console.log('Webhook secret:', webhookSecret);
    console.log('');

    // 3. Create webhook payload for subscription_cancelled event
    const now = new Date();
    const endsAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day from now

    const payload = {
      meta: {
        test_mode: true,
        event_name: 'subscription_cancelled',
        custom_data: {
          user_id: user.id
        }
      },
      data: {
        type: 'subscriptions',
        id: user.subscription.lemonsqueezy_subscription_id,
        attributes: {
          store_id: parseInt(process.env.LEMONSQUEEZY_STORE_ID_TEST),
          customer_id: parseInt(user.lemonsqueezy_customer_id),
          order_id: parseInt(user.subscription.lemonsqueezy_order_id),
          product_id: parseInt(user.subscription.lemonsqueezy_product_id),
          variant_id: parseInt(user.subscription.lemonsqueezy_variant_id),
          product_name: user.subscription.tier === 'pro' ? 'Tower of Babel Pro' : 'Tower of Babel Pay-As-You-Go',
          variant_name: user.subscription.tier === 'pro' ? 'Pro Subscription' : 'PAYG Subscription',
          user_name: user.email.split('@')[0],
          user_email: user.email,
          status: 'cancelled',  // Subscription is cancelled but still active until end
          status_formatted: 'Cancelled',
          card_brand: 'visa',
          card_last_four: '4242',
          pause: null,
          cancelled: true,
          trial_ends_at: null,
          billing_anchor: 1,
          first_subscription_item: {
            id: parseInt(user.subscription.lemonsqueezy_subscription_item_id),
            subscription_id: parseInt(user.subscription.lemonsqueezy_subscription_id),
            price_id: 222222,
            quantity: 1,
            is_usage_based: user.subscription.tier === 'payg',
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          },
          urls: {
            update_payment_method: 'https://example.com/update',
            customer_portal: 'https://example.com/portal'
          },
          renews_at: null,  // No longer renewing
          ends_at: endsAt.toISOString(),  // When subscription actually ends
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          test_mode: true
        },
        relationships: {
          store: {
            links: {
              related: `https://api.lemonsqueezy.com/v1/subscriptions/${user.subscription.lemonsqueezy_subscription_id}/store`,
              self: `https://api.lemonsqueezy.com/v1/subscriptions/${user.subscription.lemonsqueezy_subscription_id}/relationships/store`
            }
          }
        },
        links: {
          self: `https://api.lemonsqueezy.com/v1/subscriptions/${user.subscription.lemonsqueezy_subscription_id}`
        }
      }
    };

    const payloadString = JSON.stringify(payload);

    // 4. Generate HMAC signature
    const signature = createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');

    console.log('Generated signature:', signature);
    console.log('');

    // 5. Send webhook to local server
    console.log('Sending cancellation webhook to http://localhost:3000/api/webhooks/lemonsqueezy...\n');

    const response = await fetch('http://localhost:3000/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      body: payloadString
    });

    const responseData = await response.json();

    console.log('=== WEBHOOK RESPONSE ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('');

    if (response.ok) {
      // 6. Check subscription status after webhook
      console.log('Checking subscription status after webhook...');
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { subscription: true }
      });

      console.log('\n=== USER AFTER CANCELLATION ===');
      console.log('Email:', updatedUser.email);
      console.log('Tier:', updatedUser.tier);

      if (updatedUser.subscription) {
        console.log('\n=== SUBSCRIPTION ===');
        console.log('Status:', updatedUser.subscription.status);
        console.log('Ends at:', updatedUser.subscription.ends_at);
        console.log('Renews at:', updatedUser.subscription.renews_at || 'NULL (cancelled)');
      } else {
        console.log('\nNo subscription record found!');
      }

      if (updatedUser.subscription && updatedUser.subscription.status === 'cancelled') {
        console.log('\n✅ SUCCESS! Subscription marked as cancelled');
        console.log('Note: User tier remains', updatedUser.tier, 'until subscription ends_at date');
      } else {
        console.log('\n❌ FAILED! Subscription status:', updatedUser.subscription?.status);
      }
    } else {
      console.log('\n❌ Webhook request failed');
    }

  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCancellationWebhook();
