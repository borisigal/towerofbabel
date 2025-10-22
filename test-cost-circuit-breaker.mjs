/**
 * Manual test script for Cost Circuit Breaker
 * Run with: node test-cost-circuit-breaker.mjs
 */

import { kv } from '@vercel/kv';

// Load environment variables
const COST_LIMIT_DAILY = parseFloat(process.env.COST_LIMIT_DAILY || '50');
const COST_LIMIT_HOURLY = parseFloat(process.env.COST_LIMIT_HOURLY || '5');
const COST_LIMIT_USER_DAILY = parseFloat(process.env.COST_LIMIT_USER_DAILY || '1');

console.log('🧪 Cost Circuit Breaker Manual Test\n');
console.log('Configuration:');
console.log(`  Daily Limit: $${COST_LIMIT_DAILY}`);
console.log(`  Hourly Limit: $${COST_LIMIT_HOURLY}`);
console.log(`  User Daily Limit: $${COST_LIMIT_USER_DAILY}\n`);

async function checkCostBudget(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours().toString().padStart(2, '0');

    const dailyCost = parseFloat((await kv.get(`cost:daily:${today}`)) || '0');
    const hourlyCost = parseFloat((await kv.get(`cost:hourly:${today}:${currentHour}`)) || '0');
    const userDailyCost = parseFloat((await kv.get(`cost:user:${userId}:${today}`)) || '0');

    console.log(`  Daily: $${dailyCost.toFixed(2)} / $${COST_LIMIT_DAILY}`);
    console.log(`  Hourly: $${hourlyCost.toFixed(2)} / $${COST_LIMIT_HOURLY}`);
    console.log(`  User (${userId}): $${userDailyCost.toFixed(2)} / $${COST_LIMIT_USER_DAILY}`);

    if (dailyCost >= COST_LIMIT_DAILY) {
      return { allowed: false, layer: 'daily', currentCost: dailyCost };
    }
    if (hourlyCost >= COST_LIMIT_HOURLY) {
      return { allowed: false, layer: 'hourly', currentCost: hourlyCost };
    }
    if (userDailyCost >= COST_LIMIT_USER_DAILY) {
      return { allowed: false, layer: 'user', currentCost: userDailyCost };
    }

    return { allowed: true };
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    return { allowed: true, error: true };
  }
}

async function trackCost(userId, costUsd) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours().toString().padStart(2, '0');

    await kv.incrbyfloat(`cost:daily:${today}`, costUsd);
    await kv.expire(`cost:daily:${today}`, 86400);

    await kv.incrbyfloat(`cost:hourly:${today}:${currentHour}`, costUsd);
    await kv.expire(`cost:hourly:${today}:${currentHour}`, 3600);

    await kv.incrbyfloat(`cost:user:${userId}:${today}`, costUsd);
    await kv.expire(`cost:user:${userId}:${today}`, 86400);

    console.log(`  ✅ Tracked $${costUsd.toFixed(2)} for user ${userId}`);
  } catch (error) {
    console.error('  ❌ Error tracking cost:', error.message);
  }
}

async function runTests() {
  try {
    console.log('📊 Test 1: Check initial budget (clean Redis)\n');
    let result = await checkCostBudget('test-user-1');
    console.log(`  Result: ${result.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} ${result.layer ? `(${result.layer} limit)` : ''}\n`);

    console.log('💰 Test 2: Track some costs\n');
    await trackCost('test-user-1', 0.05);
    await trackCost('test-user-1', 0.05);
    await trackCost('test-user-1', 0.05);
    console.log('');

    console.log('📊 Test 3: Check budget after tracking costs\n');
    result = await checkCostBudget('test-user-1');
    console.log(`  Result: ${result.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} ${result.layer ? `(${result.layer} limit)` : ''}\n`);

    console.log('💰 Test 4: Track more costs to exceed user limit ($1)\n');
    await trackCost('test-user-1', 0.50);
    await trackCost('test-user-1', 0.50);
    console.log('');

    console.log('📊 Test 5: Check budget after exceeding user limit\n');
    result = await checkCostBudget('test-user-1');
    console.log(`  Result: ${result.allowed ? '✅ ALLOWED' : `❌ BLOCKED at ${result.layer} layer ($${result.currentCost?.toFixed(2)})`}\n`);

    console.log('🧹 Test 6: View current costs\n');
    await checkCostBudget('test-user-1');
    console.log('');

    console.log('✅ All tests completed!\n');
    console.log('💡 To reset Redis costs, run: await kv.del("cost:*") or wait for TTL expiration');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

runTests();
