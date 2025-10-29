// Test script to simulate Lemon Squeezy PAYG subscription_created webhook
const { createHmac } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load environment variables
require('dotenv').config({ path: '.env' });

async function testPaygWebhook() {
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

    const paygVariantId = process.env.LEMONSQUEEZY_PAYG_VARIANT_ID;

    if (!webhookSecret) {
      console.error('LEMONSQUEEZY_WEBHOOK_SECRET_TEST not configured');
      return;
    }

    console.log('Webhook secret:', webhookSecret);
    console.log('PAYG variant ID:', paygVariantId);
    console.log('');

    // 3. Create webhook payload for PAYG subscription (matches Lemon Squeezy structure)
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
        id: '789012',  // Different from Pro subscription
        attributes: {
          store_id: parseInt(process.env.LEMONSQUEEZY_STORE_ID_TEST),
          customer_id: 654321,
          order_id: 999888,
          product_id: 222222,
          variant_id: parseInt(paygVariantId),  // PAYG variant ID
          product_name: 'Tower of Babel Pay-As-You-Go',
          variant_name: 'PAYG Subscription',
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
            id: 2,
            subscription_id: 789012,
            price_id: 333333,
            quantity: 1,
            is_usage_based: true,  // PAYG is usage-based
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
              related: 'https://api.lemonsqueezy.com/v1/subscriptions/789012/store',
              self: 'https://api.lemonsqueezy.com/v1/subscriptions/789012/relationships/store'
            }
          }
        },
        links: {
          self: 'https://api.lemonsqueezy.com/v1/subscriptions/789012'
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
    console.log('Sending PAYG webhook to http://localhost:3000/api/webhooks/lemonsqueezy...\n');

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

      if (updatedUser.subscription) {
        console.log('\n=== SUBSCRIPTION ===');
        console.log('Status:', updatedUser.subscription.status);
        console.log('Tier:', updatedUser.subscription.tier);
        console.log('LS Subscription ID:', updatedUser.subscription.lemonsqueezy_subscription_id);
        console.log('Renews at:', updatedUser.subscription.renews_at);
      } else {
        console.log('\nNo subscription record found!');
      }

      if (updatedUser.tier === 'payg') {
        console.log('\n✅ SUCCESS! User upgraded to PAYG tier');
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

testPaygWebhook();
