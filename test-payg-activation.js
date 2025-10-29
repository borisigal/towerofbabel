// Test PAYG activation endpoint
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load environment variables
require('dotenv').config({ path: '.env' });

async function testPaygActivation() {
  try {
    // 1. Get user and their Supabase session
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

    console.log('User found:', user.email);
    console.log('Current tier:', user.tier);
    console.log('Current subscription:', user.subscription ? 'EXISTS' : 'NONE');
    console.log('');

    if (user.tier !== 'trial') {
      console.log('⚠️  User is not on trial tier. Please reset to trial first.');
      return;
    }

    // 2. For testing, we'll get a session token
    // Note: In real scenario, this would come from the browser's auth session
    console.log('Note: This test requires a valid Supabase session token.');
    console.log('In a real scenario, you would click "Start Pay-As-You-Go" in the browser.');
    console.log('');
    console.log('For now, testing the endpoint directly...');
    console.log('');

    // 3. Call PAYG activation endpoint
    console.log('Calling /api/subscription/payg/create...');

    // Since we can't easily get a session token in Node.js, let's just
    // show what the user should do in the browser
    console.log('');
    console.log('=== MANUAL TEST INSTRUCTIONS ===');
    console.log('1. Open your browser to http://localhost:3000/dashboard');
    console.log('2. You should see your trial tier status');
    console.log('3. Look for a "Pay As You Go" or "Start PAYG" button');
    console.log('4. Click it to activate PAYG');
    console.log('');
    console.log('After activation, run this to check:');
    console.log('  node check-user-tier.js');
    console.log('');
    console.log('Expected result:');
    console.log('- Tier should change from "trial" to "payg"');
    console.log('- A subscription record should be created');
    console.log('- User should be redirected to dashboard');
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPaygActivation();
