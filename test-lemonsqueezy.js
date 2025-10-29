// Test script to debug Lemon Squeezy checkout creation
const { createCheckout, lemonSqueezySetup } = require('@lemonsqueezy/lemonsqueezy.js');

// Load environment variables
require('dotenv').config({ path: '.env' });

async function testCheckout() {
  try {
    // Configure Lemon Squeezy
    const apiKey = process.env.LEMONSQUEEZY_API_KEY_TEST;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID_TEST;
    const variantId = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;

    console.log('Configuration:');
    console.log('- API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET');
    console.log('- Store ID:', storeId);
    console.log('- Variant ID:', variantId);
    console.log('');

    if (!apiKey) {
      console.error('ERROR: LEMONSQUEEZY_API_KEY_TEST is not set');
      return;
    }

    lemonSqueezySetup({ apiKey });

    console.log('Calling createCheckout...');
    const result = await createCheckout(storeId, variantId, {
      checkoutData: {
        email: 'test@example.com',
        custom: {
          user_id: 'test-user-123'
        }
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true,
      },
      testMode: true
    });

    console.log('\n=== SUCCESS ===');
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.log('\n=== ERROR CAUGHT ===');
    console.log('Error message:', error.message);
    console.log('Error name:', error.name);
    console.log('');

    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }

    console.log('\nFull error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  }
}

testCheckout();
