/**
 * Add Sample Costs for Admin Dashboard Testing
 *
 * Adds realistic sample costs without triggering circuit breaker limits.
 * Run with: npx tsx scripts/add-sample-costs.ts
 */

import { trackCost } from '../lib/llm/costCircuitBreaker';

async function addSampleCosts() {
  console.log('📊 Adding sample costs for testing...\n');

  try {
    // Add costs for 5 different users (simulate realistic usage)
    // Total: $0.02 x 50 calls = $1.00 (well within limits)
    const users = ['user-alice', 'user-bob', 'user-carol', 'user-dave', 'user-eve'];

    for (let i = 0; i < 10; i++) {
      for (const userId of users) {
        await trackCost(userId, 0.02); // $0.02 per interpretation
      }
    }

    console.log('✅ Added sample costs:');
    console.log('   - 5 users x 10 interpretations = 50 total');
    console.log('   - Cost per interpretation: $0.02');
    console.log('   - Total daily cost: $1.00');
    console.log('   - Total hourly cost: $1.00');
    console.log('   - Per-user cost: $0.20 each');
    console.log('\nNow visit: http://localhost:3000/api/admin/cost-metrics');

  } catch (error) {
    console.error('❌ Failed to add sample costs:', error);
    throw error;
  }
}

addSampleCosts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
