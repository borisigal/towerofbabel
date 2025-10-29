/**
 * Unit Tests for Lemon Squeezy Client
 *
 * Tests configuration, error handling, and test/production mode switching.
 *
 * Test Coverage (Task 17):
 * - configureLemonSqueezy sets up API client correctly
 * - getLemonSqueezyConfig returns correct config for test/production mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureLemonSqueezy, getLemonSqueezyConfig } from '@/lib/lemonsqueezy/client';
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

// Mock the Lemon Squeezy SDK
vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: vi.fn(),
}));

describe('Lemon Squeezy Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('configureLemonSqueezy', () => {
    describe('3.4-UNIT-001: configureLemonSqueezy sets up API client correctly', () => {
      it('should initialize Lemon Squeezy SDK with production API key when test mode is false', () => {
        // Arrange
        process.env.LEMONSQUEEZY_TEST_MODE = 'false';
        process.env.LEMONSQUEEZY_API_KEY = 'prod-api-key';
        process.env.LEMONSQUEEZY_API_KEY_TEST = 'test-api-key';

        // Act
        configureLemonSqueezy();

        // Assert
        expect(lemonSqueezySetup).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKey: 'prod-api-key',
            onError: expect.any(Function),
          })
        );
      });

      it('should initialize Lemon Squeezy SDK with test API key when test mode is true', () => {
        // Arrange
        process.env.LEMONSQUEEZY_TEST_MODE = 'true';
        process.env.LEMONSQUEEZY_API_KEY = 'prod-api-key';
        process.env.LEMONSQUEEZY_API_KEY_TEST = 'test-api-key';

        // Act
        configureLemonSqueezy();

        // Assert
        expect(lemonSqueezySetup).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKey: 'test-api-key',
            onError: expect.any(Function),
          })
        );
      });

      it('should throw error when API key is not configured', () => {
        // Arrange
        process.env.LEMONSQUEEZY_TEST_MODE = 'false';
        delete process.env.LEMONSQUEEZY_API_KEY;

        // Act & Assert
        expect(() => configureLemonSqueezy()).toThrow('Lemon Squeezy API key not configured');
      });

      it('should throw error when test API key is not configured in test mode', () => {
        // Arrange
        process.env.LEMONSQUEEZY_TEST_MODE = 'true';
        delete process.env.LEMONSQUEEZY_API_KEY_TEST;

        // Act & Assert
        expect(() => configureLemonSqueezy()).toThrow('Lemon Squeezy API key not configured');
      });
    });
  });

  describe('getLemonSqueezyConfig', () => {
    describe('3.4-UNIT-002: getLemonSqueezyConfig returns correct config for test mode', () => {
      it('should return test configuration when test mode is enabled', () => {
        // Arrange
        process.env.LEMONSQUEEZY_TEST_MODE = 'true';
        process.env.LEMONSQUEEZY_STORE_ID_TEST = 'test-store-123';
        process.env.LEMONSQUEEZY_STORE_ID = 'prod-store-456';
        process.env.LEMONSQUEEZY_PRO_VARIANT_ID = 'pro-variant-789';
        process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = 'payg-variant-012';
        process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST = 'test-webhook-secret';
        process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'prod-webhook-secret';

        // Act
        const config = getLemonSqueezyConfig();

        // Assert
        expect(config).toEqual({
          storeId: 'test-store-123',
          proVariantId: 'pro-variant-789',
          paygVariantId: 'payg-variant-012',
          webhookSecret: 'test-webhook-secret',
          isTestMode: true,
        });
      });

      it('should return production configuration when test mode is disabled', () => {
        // Arrange
        process.env.LEMONSQUEEZY_TEST_MODE = 'false';
        process.env.LEMONSQUEEZY_STORE_ID_TEST = 'test-store-123';
        process.env.LEMONSQUEEZY_STORE_ID = 'prod-store-456';
        process.env.LEMONSQUEEZY_PRO_VARIANT_ID = 'pro-variant-789';
        process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = 'payg-variant-012';
        process.env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST = 'test-webhook-secret';
        process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'prod-webhook-secret';

        // Act
        const config = getLemonSqueezyConfig();

        // Assert
        expect(config).toEqual({
          storeId: 'prod-store-456',
          proVariantId: 'pro-variant-789',
          paygVariantId: 'payg-variant-012',
          webhookSecret: 'prod-webhook-secret',
          isTestMode: false,
        });
      });
    });

    describe('Configuration Validation', () => {
      beforeEach(() => {
        // Set up valid base configuration
        process.env.LEMONSQUEEZY_TEST_MODE = 'false';
        process.env.LEMONSQUEEZY_STORE_ID = 'store-123';
        process.env.LEMONSQUEEZY_PRO_VARIANT_ID = 'pro-456';
        process.env.LEMONSQUEEZY_PAYG_VARIANT_ID = 'payg-789';
        process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'secret-abc';
      });

      it('should throw error when store ID is not configured', () => {
        delete process.env.LEMONSQUEEZY_STORE_ID;
        expect(() => getLemonSqueezyConfig()).toThrow('Lemon Squeezy store ID not configured');
      });

      it('should throw error when Pro variant ID is not configured', () => {
        delete process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
        expect(() => getLemonSqueezyConfig()).toThrow('Lemon Squeezy Pro variant ID not configured');
      });

      it('should throw error when PAYG variant ID is not configured', () => {
        delete process.env.LEMONSQUEEZY_PAYG_VARIANT_ID;
        expect(() => getLemonSqueezyConfig()).toThrow('Lemon Squeezy PAYG variant ID not configured');
      });

      it('should throw error when webhook secret is not configured', () => {
        delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
        expect(() => getLemonSqueezyConfig()).toThrow('Lemon Squeezy webhook secret not configured');
      });
    });
  });

  describe('Error Handler', () => {
    it('should pass error to onError callback and rethrow', () => {
      // Arrange
      process.env.LEMONSQUEEZY_TEST_MODE = 'false';
      process.env.LEMONSQUEEZY_API_KEY = 'api-key';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let onErrorCallback: ((error: Error) => void) | undefined;

      (lemonSqueezySetup as any).mockImplementation(({ onError }: any) => {
        onErrorCallback = onError;
      });

      configureLemonSqueezy();

      const testError = new Error('Test error');

      // Act & Assert
      expect(() => onErrorCallback?.(testError)).toThrow('Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Lemon Squeezy Error:', testError);

      consoleErrorSpy.mockRestore();
    });
  });
});