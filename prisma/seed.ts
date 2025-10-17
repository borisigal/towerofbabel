/**
 * Database Seed Script
 *
 * Creates test users for local development and testing.
 * Run with: npm run db:seed
 *
 * IMPORTANT: This script is for LOCAL DEVELOPMENT ONLY.
 * Never run in production. Production users are created via sign-up flow.
 *
 * Test Users Created:
 * 1. trial1@test.local - Trial tier, 0/10 messages used
 * 2. trial2@test.local - Trial tier, 10/10 messages exhausted
 * 3. pro1@test.local - Pro tier, 5/100 messages used
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Test User 1: Trial tier with messages available
  const trial1 = await prisma.user.upsert({
    where: { email: 'trial1@test.local' },
    update: {}, // Don't overwrite if exists
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'trial1@test.local',
      name: 'Trial User 1',
      tier: 'trial',
      messages_used_count: 0,
      messages_reset_date: new Date(),
    },
  });
  console.log('✅ Created trial user 1:', trial1.email, `(${trial1.messages_used_count}/10 messages used)`);

  // Test User 2: Trial tier exhausted
  const trial2 = await prisma.user.upsert({
    where: { email: 'trial2@test.local' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'trial2@test.local',
      name: 'Trial User 2 (Exhausted)',
      tier: 'trial',
      messages_used_count: 10,
      messages_reset_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
  });
  console.log('✅ Created trial user 2 (exhausted):', trial2.email, `(${trial2.messages_used_count}/10 messages used)`);

  // Test User 3: Pro tier with some usage
  const pro1 = await prisma.user.upsert({
    where: { email: 'pro1@test.local' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'pro1@test.local',
      name: 'Pro User 1',
      tier: 'pro',
      messages_used_count: 5,
      messages_reset_date: new Date(),
      lemonsqueezy_customer_id: 'cust_test_pro1',
    },
  });
  console.log('✅ Created pro user 1:', pro1.email, `(${pro1.messages_used_count}/100 messages used)`);

  // Create sample interpretation for pro user (to test relationships)
  const interpretation = await prisma.interpretation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      user_id: pro1.id,
      culture_sender: 'american',
      culture_receiver: 'japanese',
      character_count: 150,
      interpretation_type: 'both',
      cost_usd: 0.0025,
      llm_provider: 'anthropic',
      response_time_ms: 1250,
      timestamp: new Date(),
    },
  });
  console.log('✅ Created sample interpretation for pro user');

  console.log('');
  console.log('🎉 Seeding completed!');
  console.log('');
  console.log('Test User Credentials:');
  console.log('─'.repeat(60));
  console.log('Email                 | Tier  | Messages Used | Status');
  console.log('─'.repeat(60));
  console.log('trial1@test.local     | trial | 0/10          | Available');
  console.log('trial2@test.local     | trial | 10/10         | Exhausted');
  console.log('pro1@test.local       | pro   | 5/100         | Active');
  console.log('─'.repeat(60));
  console.log('');
  console.log('⚠️  Note: These test users do NOT have Supabase Auth accounts.');
  console.log('   For testing with authentication, create users via Supabase Auth UI');
  console.log('   and they will automatically be added to the users table.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
