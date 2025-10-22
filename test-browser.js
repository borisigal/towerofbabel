/**
 * Browser Console Test Script for /api/interpret
 *
 * INSTRUCTIONS:
 * 1. Sign in to your app at http://localhost:3000
 * 2. Open DevTools Console (F12 or Cmd+Option+I)
 * 3. Copy and paste this entire script
 * 4. Run: await runAllTests()
 */

const API_URL = 'http://localhost:3000/api/interpret';

// Helper function to make API calls
async function testAPI(testName, payload, expectedStatus) {
  console.log(`\n🧪 ${testName}`);
  console.log('─'.repeat(50));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include' // Important: includes auth cookies
    });

    const data = await response.json();
    const status = response.status;

    const passed = expectedStatus ? status === expectedStatus : status >= 200 && status < 300;
    console.log(passed ? '✅ PASS' : '❌ FAIL');
    console.log(`Status: ${status} ${expectedStatus ? `(expected ${expectedStatus})` : ''}`);
    console.log('Response:', data);

    return { passed, status, data, response };
  } catch (error) {
    console.log('❌ ERROR');
    console.error(error);
    return { passed: false, error };
  }
}

// Test Suite
async function runAllTests() {
  console.clear();
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Story 2.3: /api/interpret Manual Test Suite    ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const results = [];

  // Test 1: Valid Request (should succeed)
  results.push(await testAPI(
    'Test 1: Valid Interpretation Request',
    {
      message: 'Thank you for your help!',
      sender_culture: 'american',
      receiver_culture: 'japanese',
      mode: 'inbound'
    },
    200
  ));

  // Test 2: Same Culture Interpretation
  results.push(await testAPI(
    'Test 2: Same-Culture Interpretation (American → American)',
    {
      message: 'Great job on the project!',
      sender_culture: 'american',
      receiver_culture: 'american',
      mode: 'inbound'
    },
    200
  ));

  // Test 3: Missing Message Field
  results.push(await testAPI(
    'Test 3: Missing Required Field (message)',
    {
      sender_culture: 'american',
      receiver_culture: 'japanese',
      mode: 'inbound'
    },
    400
  ));

  // Test 4: Invalid Culture Code
  results.push(await testAPI(
    'Test 4: Invalid Culture Code',
    {
      message: 'Test message',
      sender_culture: 'klingon',  // Invalid culture
      receiver_culture: 'japanese',
      mode: 'inbound'
    },
    400
  ));

  // Test 5: Message Too Long
  results.push(await testAPI(
    'Test 5: Message Exceeds 2000 Characters',
    {
      message: 'a'.repeat(2001),  // 2001 characters
      sender_culture: 'american',
      receiver_culture: 'japanese',
      mode: 'inbound'
    },
    400
  ));

  // Test 6: Invalid Mode
  results.push(await testAPI(
    'Test 6: Invalid Mode',
    {
      message: 'Test message',
      sender_culture: 'american',
      receiver_culture: 'japanese',
      mode: 'invalid_mode'  // Should be 'inbound' or 'outbound'
    },
    400
  ));

  // Summary
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed - review results above');
  }

  return results;
}

// Quick single test function
async function quickTest(message = 'Thank you!') {
  return await testAPI(
    'Quick Test',
    {
      message,
      sender_culture: 'american',
      receiver_culture: 'japanese',
      mode: 'inbound'
    }
  );
}

console.log('📋 Test script loaded!');
console.log('');
console.log('Quick commands:');
console.log('  await runAllTests()     - Run full test suite');
console.log('  await quickTest()       - Run single quick test');
console.log('  await quickTest("msg")  - Test with custom message');
console.log('');
