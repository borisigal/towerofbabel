// Test script to simulate Lemon Squeezy subscription_created webhook
const { createHmac } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load environment variables
require('dotenv').config({ path: '.env' });

async function testWebhook() {
  try {
    // 1. Get user from database
    console.log('Fetching user from database...');
    const user = await prisma.user.findFirst({
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!user) {
      console.error('No user found in database');
      return;
    }

    console.log(`User found: ${user.email} (ID: ${user.id})`);
    console.log(`Current tier: ${user.tier}\n`);

    // 2. Get configuration
    const webhookSecret = process.env.LEMONSQUEEZY_TEST_MODE === 'true'
      ? process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST
      : process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    const proVariantId = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;

    if (!webhookSecret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET_TEST not configured');
      return;
    }

    console.log('Webhook secret:', webhookSecret);
    console.log('Pro variant ID:', proVariantId);
    console.log('');

    // 3. Create webhook payload (matches Lemon Squeezy subscription_created structure)
    const now = new Date();
    const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const payload = {
      meta: {
        test_mode: true,
        event_name: 'subscription_created',
        custom_data: {
          user_id: user.id
        }
      },
      data: {
        type: 'subscriptions',
        id: '123456',
        attributes: {
          store_id: parseInt(process.env.LEMONSQUEEZY_STORE_ID_TEST),
          customer_id: 654321,
          order_id: 789012,
          product_id: 111111,
          variant_id: parseInt(proVariantId),
          product_name: 'Tower of Babel Pro',
          variant_name: 'Pro Subscription',
          user_name: user.email.split('@')[0],
          user_email: user.email,
          status: 'active',
          status_formatted: 'Active',
          card_brand: 'visa',
          card_last_four: '4242',
          pause: null,
          cancelled: false,
          trial_ends_at: null,
          billing_anchor: 1,
          first_subscription_item: {
            id: 1,
            subscription_id: 123456,
            price_id: 222222,
            quantity: 1,
            is_usage_based: false,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            custom_data: {
              user_id: user.id
            }
          },
          urls: {
            update_payment_method: 'https://example.com/update',
            customer_portal: 'https://example.com/portal'
          },
          renews_at: renewsAt.toISOString(),
          ends_at: null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          test_mode: true
        },
        relationships: {
          store: {
            links: {
              related: 'https://api.lemonsqueezy.com/v1/subscriptions/123456/store',
              self: 'https://api.lemonsqueezy.com/v1/subscriptions/123456/relationships/store'
            }
          }
        },
        links: {
          self: 'https://api.lemonsqueezy.com/v1/subscriptions/123456'
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
    console.log('Sending webhook to http://localhost:3000/api/webhooks/lemonsqueezy...\n');

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
      // 6. Check user tier after webhook
      console.log('Checking user tier after webhook...');
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { subscription: true }
      });

      console.log('\n=== USER AFTER WEBHOOK ===');
      console.log('Email:', updatedUser.email);
      console.log('Tier:', updatedUser.tier);
      console.log('LS Customer ID:', updatedUser.lemonsqueezy_customer_id);
      console.log('Messages used:', updatedUser.messages_used_count);
      console.log('Messages reset date:', updatedUser.messages_reset_date);

      if (updatedUser.subscription) {
        console.log('\n=== SUBSCRIPTION ===');
        console.log('Status:', updatedUser.subscription.status);
        console.log('Tier:', updatedUser.subscription.tier);
        console.log('LS Subscription ID:', updatedUser.subscription.lemonsqueezy_subscription_id);
        console.log('Renews at:', updatedUser.subscription.renews_at);
      } else {
        console.log('\nNo subscription record found!');
      }

      if (updatedUser.tier === 'pro') {
        console.log('\n✅ SUCCESS! User upgraded to Pro tier');
      } else {
        console.log('\n❌ FAILED! User tier is still:', updatedUser.tier);
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

testWebhook();
