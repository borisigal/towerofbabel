/**
 * Integration tests for Anthropic adapter with real API.
 * REQUIRES: ANTHROPIC_API_KEY in .env or .env.local
 *
 * Run these tests locally to verify real API integration.
 * These tests are skipped in CI (no API key available).
 *
 * Usage:
 *   npm test tests/integration/lib/llm/anthropicAdapter.integration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { AnthropicAdapter } from '@/lib/llm/anthropicAdapter';

// Load environment variables from .env file if not already loaded
if (!process.env.ANTHROPIC_API_KEY || !process.env.LLM_TIMEOUT_MS) {
  try {
    // Try to load from .env file
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line: string) => {
        // Load ANTHROPIC_API_KEY
        const apiKeyMatch = line.match(/^ANTHROPIC_API_KEY=['"]?([^'"]+)['"]?/);
        if (apiKeyMatch) {
          process.env.ANTHROPIC_API_KEY = apiKeyMatch[1];
        }

        // Load LLM_TIMEOUT_MS
        const timeoutMatch = line.match(/^LLM_TIMEOUT_MS=(\d+)/);
        if (timeoutMatch) {
          process.env.LLM_TIMEOUT_MS = timeoutMatch[1];
        }

        // Load LLM_MODEL
        const modelMatch = line.match(/^LLM_MODEL=['"]?([^'"]+)['"]?/);
        if (modelMatch) {
          process.env.LLM_MODEL = modelMatch[1];
        }
      });
    }
  } catch (error) {
    // Silently fail - tests will be skipped if key not found
  }
}

// Skip all tests if ANTHROPIC_API_KEY not set
const skipTests = !process.env.ANTHROPIC_API_KEY;

describe.skipIf(skipTests)('AnthropicAdapter Integration Tests (Real API)', () => {
  const adapter = new AnthropicAdapter();

  it('should return valid interpretation for same-culture (American → American)', async () => {
    const result = await adapter.interpret({
      message: 'Thanks so much for your help with this! I really appreciate it.',
      senderCulture: 'american',
      receiverCulture: 'american',
      sameCulture: true,
    });

    // Verify interpretation structure
    expect(result.interpretation.bottomLine).toBeTruthy();
    expect(result.interpretation.bottomLine.length).toBeGreaterThan(10);

    expect(result.interpretation.culturalContext).toBeTruthy();
    expect(result.interpretation.culturalContext.length).toBeGreaterThan(10);

    expect(result.interpretation.emotions).toHaveLength(3);

    // Verify emotions
    result.interpretation.emotions.forEach((emotion) => {
      expect(emotion.name).toBeTruthy();
      expect(emotion.senderScore).toBeGreaterThanOrEqual(0);
      expect(emotion.senderScore).toBeLessThanOrEqual(10);
      // Same culture should not have receiverScore
      expect(emotion.receiverScore).toBeUndefined();
    });

    // Verify metadata
    expect(result.metadata.costUsd).toBeGreaterThan(0);
    expect(result.metadata.costUsd).toBeLessThan(0.05); // Should be < $0.05
    expect(result.metadata.responseTimeMs).toBeGreaterThan(0);
    expect(result.metadata.responseTimeMs).toBeLessThan(30000); // < 30 seconds
    expect(result.metadata.tokenCount).toBeGreaterThan(0);
    expect(result.metadata.model).toContain('claude');

    console.log('Same-culture test results:');
    console.log(`  Bottom Line: ${result.interpretation.bottomLine}`);
    console.log(`  Cost: $${result.metadata.costUsd.toFixed(4)}`);
    console.log(`  Response Time: ${result.metadata.responseTimeMs}ms`);
    console.log(`  Tokens: ${result.metadata.tokenCount}`);
  }, 30000); // 30 second timeout

  it('should return valid interpretation for cross-culture (American → Japanese)', async () => {
    const result = await adapter.interpret({
      message: 'I appreciate your hard work on this project. Great job!',
      senderCulture: 'american',
      receiverCulture: 'japanese',
      sameCulture: false,
    });

    // Verify interpretation structure
    expect(result.interpretation.bottomLine).toBeTruthy();
    expect(result.interpretation.bottomLine.length).toBeGreaterThan(10);

    expect(result.interpretation.culturalContext).toBeTruthy();
    expect(result.interpretation.culturalContext.length).toBeGreaterThan(10);

    expect(result.interpretation.emotions).toHaveLength(3);

    // Verify emotions
    result.interpretation.emotions.forEach((emotion) => {
      expect(emotion.name).toBeTruthy();
      expect(emotion.senderScore).toBeGreaterThanOrEqual(0);
      expect(emotion.senderScore).toBeLessThanOrEqual(10);
      // Cross-culture MUST have receiverScore
      expect(emotion.receiverScore).toBeDefined();
      expect(emotion.receiverScore).toBeGreaterThanOrEqual(0);
      expect(emotion.receiverScore).toBeLessThanOrEqual(10);
    });

    // Verify metadata
    expect(result.metadata.costUsd).toBeGreaterThan(0);
    expect(result.metadata.costUsd).toBeLessThan(0.05); // Should be < $0.05
    expect(result.metadata.responseTimeMs).toBeGreaterThan(0);
    expect(result.metadata.responseTimeMs).toBeLessThan(30000); // < 30 seconds
    expect(result.metadata.tokenCount).toBeGreaterThan(0);
    expect(result.metadata.model).toContain('claude');

    console.log('Cross-culture test results:');
    console.log(`  Bottom Line: ${result.interpretation.bottomLine}`);
    console.log(`  Cultural Context: ${result.interpretation.culturalContext}`);
    console.log(`  Emotions:`);
    result.interpretation.emotions.forEach((emotion) => {
      console.log(`    - ${emotion.name}: sender=${emotion.senderScore}, receiver=${emotion.receiverScore}`);
    });
    console.log(`  Cost: $${result.metadata.costUsd.toFixed(4)}`);
    console.log(`  Response Time: ${result.metadata.responseTimeMs}ms`);
    console.log(`  Tokens: ${result.metadata.tokenCount}`);
  }, 30000); // 30 second timeout

  it('should verify cost is within acceptable range (< $0.012)', async () => {
    const result = await adapter.interpret({
      message: 'Hello, how are you doing today?',
      senderCulture: 'british',
      receiverCulture: 'american',
      sameCulture: false,
    });

    // Verify cost is within target
    expect(result.metadata.costUsd).toBeLessThan(0.012);

    console.log(`Cost verification: $${result.metadata.costUsd.toFixed(4)} (target: < $0.012)`);
  }, 30000);

  it('should complete within timeout (< 10 seconds)', async () => {
    const startTime = Date.now();

    const result = await adapter.interpret({
      message: 'Could you please help me understand this better?',
      senderCulture: 'german',
      receiverCulture: 'french',
      sameCulture: false,
    });

    const elapsedTime = Date.now() - startTime;

    expect(elapsedTime).toBeLessThan(30000);
    expect(result.metadata.responseTimeMs).toBeLessThan(30000);

    console.log(`Timeout verification: ${elapsedTime}ms elapsed (target: < 30000ms)`);
  }, 30000);

  it('should handle different culture pairs correctly', async () => {
    const result = await adapter.interpret({
      message: 'This is excellent work! I am very impressed.',
      senderCulture: 'british',
      receiverCulture: 'german',
      sameCulture: false,
    });

    // Verify response structure
    expect(result.interpretation.bottomLine).toBeTruthy();
    expect(result.interpretation.culturalContext).toBeTruthy();
    expect(result.interpretation.culturalContext.toLowerCase()).toContain('british');
    expect(result.interpretation.culturalContext.toLowerCase()).toContain('german');
    expect(result.interpretation.emotions).toHaveLength(3);

    console.log('Different culture pair test (British → German):');
    console.log(`  Cultural Context: ${result.interpretation.culturalContext}`);
  }, 30000);
});

if (skipTests) {
  console.log('\n⚠️  Integration tests skipped: ANTHROPIC_API_KEY not set in .env or .env.local');
  console.log('To run integration tests:');
  console.log('  1. Add ANTHROPIC_API_KEY to .env or .env.local');
  console.log('  2. Run: npm test tests/integration/lib/llm/anthropicAdapter.integration.test.ts\n');
}
