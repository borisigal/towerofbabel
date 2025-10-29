// Check user tier after checkout
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserTier() {
  try {
    const user = await prisma.user.findFirst({
      orderBy: {
        created_at: 'desc'
      },
      include: {
        subscription: true
      }
    });

    if (!user) {
      console.log('No users found in database');
      return;
    }

    console.log('\n=== USER STATUS ===');
    console.log('Email:', user.email);
    console.log('Tier:', user.tier);
    console.log('Lemon Squeezy Customer ID:', user.lemonsqueezy_customer_id || 'Not set');
    console.log('\n=== SUBSCRIPTION ===');
    if (user.subscription) {
      console.log('Status:', user.subscription.status);
      console.log('LS Subscription ID:', user.subscription.lemonsqueezy_subscription_id);
      console.log('LS Subscription Item ID:', user.subscription.lemonsqueezy_subscription_item_id || 'NOT SET');
      console.log('LS Order ID:', user.subscription.lemonsqueezy_order_id);
      console.log('Current Period End:', user.subscription.current_period_end);
    } else {
      console.log('No subscription record found');
    }

  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserTier();
