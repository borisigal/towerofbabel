/**
 * Manual Test Script: Cost Circuit Breaker
 *
 * This script simulates LLM costs to test the 3-layer circuit breaker.
 * Run with: npx tsx scripts/test-circuit-breaker.ts
 *
 * Tests:
 * 1. Track costs and verify they accumulate correctly
 * 2. Trigger per-user daily limit ($1)
 * 3. Trigger hourly limit ($5)
 * 4. Trigger daily limit ($50)
 * 5. Verify circuit breaker blocks requests when limits exceeded
 */

import { checkCostBudget, trackCost } from '../lib/llm/costCircuitBreaker';
import { kv } from '../lib/kv/client';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCircuitBreaker() {
  console.log('🧪 Cost Circuit Breaker Manual Test\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Initial state (no costs tracked yet)
    console.log('\n📋 Test 1: Check initial state (no costs)');
    const initialCheck = await checkCostBudget('test-user-1');
    console.log('   Result:', JSON.stringify(initialCheck, null, 2));
    console.log('   ✅ Expected: allowed=true');

    // Test 2: Track small cost and verify
    console.log('\n📋 Test 2: Track small cost ($0.02)');
    await trackCost('test-user-1', 0.02);
    await sleep(100);
    const afterSmallCost = await checkCostBudget('test-user-1');
    console.log('   Result:', JSON.stringify(afterSmallCost, null, 2));
    console.log('   ✅ Expected: allowed=true (within limits)');

    // Test 3: Per-user daily limit ($1)
    console.log('\n📋 Test 3: Trigger per-user daily limit ($1)');
    console.log('   Tracking costs for test-user-2: $0.50 x 3 = $1.50');
    await trackCost('test-user-2', 0.50);
    await trackCost('test-user-2', 0.50);
    await trackCost('test-user-2', 0.10); // Total: $1.10 > $1.00 limit
    await sleep(100);
    const userLimitCheck = await checkCostBudget('test-user-2');
    console.log('   Result:', JSON.stringify(userLimitCheck, null, 2));
    console.log('   ✅ Expected: allowed=false, layer=user, currentCost>1.0');

    // Test 4: Hourly limit ($5) - different users to avoid per-user limit
    console.log('\n📋 Test 4: Trigger hourly limit ($5)');
    console.log('   Tracking costs from multiple users: $1.50 x 4 users = $6.00');
    await trackCost('test-user-3', 1.50);
    await trackCost('test-user-4', 1.50);
    await trackCost('test-user-5', 1.50);
    await trackCost('test-user-6', 1.50); // Total hourly: $6.00 > $5.00 limit
    await sleep(100);
    const hourlyLimitCheck = await checkCostBudget('test-user-7'); // New user, within user limit
    console.log('   Result:', JSON.stringify(hourlyLimitCheck, null, 2));
    console.log('   ✅ Expected: allowed=false, layer=hourly, currentCost>5.0');

    // Test 5: Daily limit ($50)
    console.log('\n📋 Test 5: Trigger daily limit ($50)');
    console.log('   WARNING: This will add $45+ to daily costs!');
    console.log('   Tracking large costs to exceed daily limit...');

    // Add costs in chunks to exceed $50 daily limit
    for (let i = 8; i <= 40; i++) {
      await trackCost(`test-user-${i}`, 1.50); // 33 users x $1.50 = $49.50
    }
    await sleep(100);
    const dailyLimitCheck = await checkCostBudget('test-user-41');
    console.log('   Result:', JSON.stringify(dailyLimitCheck, null, 2));
    console.log('   ✅ Expected: allowed=false, layer=daily, currentCost>50.0');

    // Test 6: Verify cost metrics
    console.log('\n📋 Test 6: Check cost metrics');
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours().toString().padStart(2, '0');

    const dailyCost = parseFloat((await kv.get(`cost:daily:${today}`)) || '0');
    const hourlyCost = parseFloat((await kv.get(`cost:hourly:${today}:${currentHour}`)) || '0');
    const user2Cost = parseFloat((await kv.get(`cost:user:test-user-2:${today}`)) || '0');

    console.log('   Daily cost:', `$${dailyCost.toFixed(2)} / $50.00`);
    console.log('   Hourly cost:', `$${hourlyCost.toFixed(2)} / $5.00`);
    console.log('   test-user-2 cost:', `$${user2Cost.toFixed(2)} / $1.00`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All circuit breaker tests completed!');
    console.log('\nNext steps:');
    console.log('1. Visit http://localhost:3000/api/admin/cost-metrics');
    console.log('2. Verify metrics match the tracked costs above');
    console.log('3. Check Sentry dashboard for alerts (if configured)');
    console.log('\nTo reset costs: await kv.flushdb() (via KV test endpoint)');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testCircuitBreaker()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
