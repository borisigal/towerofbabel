// Reset user to trial tier for testing PAYG activation
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetToTrial() {
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
      console.log('No user found');
      return;
    }

    console.log('Current user:', user.email);
    console.log('Current tier:', user.tier);
    console.log('');

    // Delete subscription if exists
    if (user.subscription) {
      await prisma.subscription.delete({
        where: {
          id: user.subscription.id
        }
      });
      console.log('✅ Deleted subscription');
    }

    // Reset user to trial
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tier: 'trial',
        lemonsqueezy_customer_id: null,
        messages_used_count: 0,
        messages_reset_date: null
      }
    });

    console.log('✅ Reset user to trial tier');
    console.log('');

    // Verify
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: true }
    });

    console.log('Updated user:');
    console.log('- Email:', updated.email);
    console.log('- Tier:', updated.tier);
    console.log('- Subscription:', updated.subscription ? 'EXISTS' : 'NONE');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetToTrial();
