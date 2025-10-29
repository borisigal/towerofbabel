#!/usr/bin/env tsx
/**
 * Mark existing interpretations as reported
 *
 * This prevents retroactive charging for interpretations created before
 * the idempotency fix was deployed.
 *
 * Run: npx tsx scripts/mark-existing-interpretations-reported.ts
 */

import prisma from '../lib/db/prisma';

async function main() {
  console.log('🔄 Marking existing interpretations as reported...\n');

  try {
    // Count before
    const before = await prisma.interpretation.count({
      where: { usage_reported: false },
    });

    console.log(`Found ${before} interpretations with usage_reported = false`);

    if (before === 0) {
      console.log('✅ All interpretations already marked as reported. Nothing to do.');
      return;
    }

    // Update all
    const result = await prisma.interpretation.updateMany({
      where: { usage_reported: false },
      data: { usage_reported: true },
    });

    console.log(`✅ Updated ${result.count} interpretations`);

    // Verify
    const after = await prisma.interpretation.count({
      where: { usage_reported: false },
    });

    console.log(`\nVerification:`);
    console.log(`  Before: ${before} not reported`);
    console.log(`  After:  ${after} not reported`);

    if (after === 0) {
      console.log('\n✅ SUCCESS: All existing interpretations marked as reported');
    } else {
      console.log(`\n⚠️  WARNING: ${after} interpretations still not marked`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
