/**
 * Unit Tests for Lemon Squeezy Configuration Validation
 *
 * Tests environment variable validation and configuration setup including:
 * - Missing API keys
 * - Missing store ID / variant IDs
 * - Missing webhook secret
 * - Test mode vs production mode
 *
 * Task 33 - Story 3.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Lemon Squeezy Configuration Validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    vi.resetModules(); // Reset module cache to allow re-import with new env
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('configureLemonSqueezy', () => {
    it('should throw error if API key missing', async () => {
      // ARRANGE: Remove API key
      delete process.env.LEMONSQUEEZY_API_KEY;
      delete process.env.LEMONSQUEEZY_API_KEY_TEST;

      // ACT & ASSERT
      const { configureLemonSqueezy } = await import('@/lib/lemonsqueezy/client');

      expect(() => configureLemonSqueezy()).toThrow(/API key not configured/i);
    });

    it('should use production API key when test mode disabled', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'prod_key_123';
      process.env.LEMONSQUEEZY_TEST_MODE = 'false';

      // ACT
      const { configureLemonSqueezy } = await import('@/lib/lemonsqueezy/client');

      // ASSERT: Should not throw
      expect(() => configureLemonSqueezy()).not.toThrow();
    });

    it('should use test API key when test mode enabled', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY_TEST = 'test_key_123';
      process.env.LEMONSQUEEZY_TEST_MODE = 'true';

      // ACT
      const { configureLemonSqueezy } = await import('@/lib/lemonsqueezy/client');

      // ASSERT: Should not throw
      expect(() => configureLemonSqueezy()).not.toThrow();
    });

    it('should fallback to production key if test key missing in test mode', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'prod_key_123';
      delete process.env.LEMONSQUEEZY_API_KEY_TEST;
      process.env.LEMONSQUEEZY_TEST_MODE = 'true';

      // ACT
      const { configureLemonSqueezy } = await import('@/lib/lemonsqueezy/client');

      // ASSERT: Should not throw (fallback to prod key)
      expect(() => configureLemonSqueezy()).not.toThrow();
    });
  });

  describe('getLemonSqueezyConfig', () => {
    it('should throw error if store ID missing', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      delete process.env.LEMONSQUEEZY_STORE_ID;

      // ACT & ASSERT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');

      expect(() => getLemonSqueezyConfig()).toThrow(/Store ID not configured/i);
    });

    it('should throw error if Pro variant ID missing', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      delete process.env.LEMONSQUEEZY_PRO_VARIANT_ID;

      // ACT & ASSERT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');

      expect(() => getLemonSqueezyConfig()).toThrow(/variant ID not configured/i);
    });

    it('should throw error if PAYG variant ID missing', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      delete process.env.LEMONSQUEEZY_PAYG_VARIANT_ID;

      // ACT & ASSERT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');

      expect(() => getLemonSqueezyConfig()).toThrow(/variant ID not configured/i);
    });

    it('should throw error if webhook secret missing', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST;

      // ACT & ASSERT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');

      expect(() => getLemonSqueezyConfig()).toThrow(/Webhook secret not configured/i);
    });

    it('should return complete config when all variables present', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook_secret';
      process.env.LEMONSQUEEZY_TEST_MODE = 'false';

      // ACT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');
      const config = getLemonSqueezyConfig();

      // ASSERT
      expect(config).toEqual({
        storeId: '123456',
        proVariantId: '789',
        paygVariantId: '012',
        webhookSecret: 'webhook_secret',
        isTestMode: false,
      });
    });
  });

  describe('Test Mode Detection', () => {
    it('should detect test mode when LEMONSQUEEZY_TEST_MODE=true', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook_secret';
      process.env.LEMONSQUEEZY_TEST_MODE = 'true';

      // ACT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');
      const config = getLemonSqueezyConfig();

      // ASSERT
      expect(config.isTestMode).toBe(true);
    });

    it('should detect production mode when LEMONSQUEEZY_TEST_MODE=false', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'prod_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook_secret';
      process.env.LEMONSQUEEZY_TEST_MODE = 'false';

      // ACT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');
      const config = getLemonSqueezyConfig();

      // ASSERT
      expect(config.isTestMode).toBe(false);
    });

    it('should default to production mode when LEMONSQUEEZY_TEST_MODE not set', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'prod_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook_secret';
      delete process.env.LEMONSQUEEZY_TEST_MODE;

      // ACT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');
      const config = getLemonSqueezyConfig();

      // ASSERT
      expect(config.isTestMode).toBe(false);
    });

    it('should use test webhook secret when test mode enabled', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'prod_webhook_secret';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST = 'test_webhook_secret';
      process.env.LEMONSQUEEZY_TEST_MODE = 'true';

      // ACT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');
      const config = getLemonSqueezyConfig();

      // ASSERT
      expect(config.webhookSecret).toBe('test_webhook_secret');
    });

    it('should fallback to production webhook secret if test secret missing', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'prod_webhook_secret';
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST;
      process.env.LEMONSQUEEZY_TEST_MODE = 'true';

      // ACT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');
      const config = getLemonSqueezyConfig();

      // ASSERT
      expect(config.webhookSecret).toBe('prod_webhook_secret');
    });
  });

  describe('Production Safety Checks', () => {
    it('should warn if test mode enabled in production environment', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'prod_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook_secret';
      process.env.LEMONSQUEEZY_TEST_MODE = 'true';
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // ACT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');
      getLemonSqueezyConfig();

      // ASSERT: Should log warning (implementation dependent)
      // This test verifies the configuration is at least accessible
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should allow test mode in non-production environments', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = 'test_key';
      process.env.LEMONSQUEEZY_STORE_ID = '123456';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '789';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '012';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'webhook_secret';
      process.env.LEMONSQUEEZY_TEST_MODE = 'true';
      process.env.NODE_ENV = 'development';

      // ACT & ASSERT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');

      expect(() => getLemonSqueezyConfig()).not.toThrow();
    });
  });

  describe('Configuration Validation Edge Cases', () => {
    it('should handle empty string values as missing', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = '';
      process.env.LEMONSQUEEZY_STORE_ID = '';

      // ACT & ASSERT
      const { configureLemonSqueezy } = await import('@/lib/lemonsqueezy/client');

      expect(() => configureLemonSqueezy()).toThrow();
    });

    it('should handle whitespace-only values as missing', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = '   ';
      process.env.LEMONSQUEEZY_STORE_ID = '   ';

      // ACT & ASSERT
      const { configureLemonSqueezy } = await import('@/lib/lemonsqueezy/client');

      expect(() => configureLemonSqueezy()).toThrow();
    });

    it('should trim whitespace from config values', async () => {
      // ARRANGE
      process.env.LEMONSQUEEZY_API_KEY = '  test_key  ';
      process.env.LEMONSQUEEZY_STORE_ID = '  123456  ';
      process.env.LEMONSQUEEZY_PRO_VARIANT_ID = '  789  ';
      process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = '  012  ';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = '  webhook_secret  ';

      // ACT
      const { getLemonSqueezyConfig } = await import('@/lib/lemonsqueezy/client');
      const config = getLemonSqueezyConfig();

      // ASSERT: Should trim whitespace
      expect(config.storeId).toBe('123456');
      expect(config.proVariantId).toBe('789');
      expect(config.paygVariantId).toBe('012');
      expect(config.webhookSecret).toBe('webhook_secret');
    });
  });
});
