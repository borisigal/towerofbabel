import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

/**
 * Helper to get environment variable and trim whitespace
 * Treats empty/whitespace-only values as undefined
 */
function getEnvValue(key: string): string | undefined {
  const value = process.env[key];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Initialize Lemon Squeezy API client
 * Automatically uses test or production mode based on environment
 *
 * @throws {Error} If API key is not configured
 */
export function configureLemonSqueezy(): void {
  const isTestMode = process.env.LEMONSQUEEZY_TEST_MODE === 'true';

  // Use test key if available, fallback to production key
  const apiKey = isTestMode
    ? (getEnvValue('LEMONSQUEEZY_API_KEY_TEST') || getEnvValue('LEMONSQUEEZY_API_KEY'))
    : getEnvValue('LEMONSQUEEZY_API_KEY');

  if (!apiKey) {
    throw new Error('Lemon Squeezy API key not configured');
  }

  lemonSqueezySetup({
    apiKey,
    onError: (error: Error) => {
      console.error('Lemon Squeezy Error:', error);
      throw error;
    },
  });
}

/**
 * Get Lemon Squeezy configuration based on current mode (test/production)
 *
 * @returns Configuration object with store ID, variant IDs, webhook secret, and mode
 * @throws {Error} If required configuration is missing
 */
export function getLemonSqueezyConfig(): {
  storeId: string;
  proVariantId: string;
  paygVariantId: string;
  webhookSecret: string;
  isTestMode: boolean;
} {
  const isTestMode = process.env.LEMONSQUEEZY_TEST_MODE === 'true';

  // Warn if test mode is enabled in production
  if (isTestMode && (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production')) {
    console.warn('WARNING: Lemon Squeezy test mode is enabled in production environment!');
  }

  const config = {
    storeId: isTestMode
      ? (getEnvValue('LEMONSQUEEZY_STORE_ID_TEST') || getEnvValue('LEMONSQUEEZY_STORE_ID'))
      : getEnvValue('LEMONSQUEEZY_STORE_ID'),
    proVariantId: getEnvValue('LEMONSQUEEZY_PRO_VARIANT_ID'),
    paygVariantId: getEnvValue('LEMONSQUEEZY_PAYG_VARIANT_ID'),
    webhookSecret: isTestMode
      ? (getEnvValue('LEMONSQUEEZY_WEBHOOK_SECRET_TEST') || getEnvValue('LEMONSQUEEZY_WEBHOOK_SECRET'))
      : getEnvValue('LEMONSQUEEZY_WEBHOOK_SECRET'),
    isTestMode,
  };

  // Validate required configuration
  if (!config.storeId) {
    throw new Error('Lemon Squeezy store ID not configured');
  }
  if (!config.proVariantId) {
    throw new Error('Lemon Squeezy Pro variant ID not configured');
  }
  if (!config.paygVariantId) {
    throw new Error('Lemon Squeezy PAYG variant ID not configured');
  }
  if (!config.webhookSecret) {
    throw new Error('Lemon Squeezy webhook secret not configured');
  }

  // After validation, we know all values are strings
  return config as {
    storeId: string;
    proVariantId: string;
    paygVariantId: string;
    webhookSecret: string;
    isTestMode: boolean;
  };
}