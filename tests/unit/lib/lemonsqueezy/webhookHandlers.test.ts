/**
 * Unit Tests for Lemon Squeezy Webhook Handlers
 *
 * Tests subscription lifecycle event handlers including:
 * - subscription_created: Creates subscription record, updates user tier
 * - subscription_payment_success: Resets Pro user usage
 * - subscription_cancelled: Updates subscription status, downgrades user
 *
 * Test Coverage (Tasks 18, 20):
 * - handleSubscriptionCreated creates subscription and updates user
 * - handleSubscriptionPaymentSuccess resets Pro usage
 * - handleSubscriptionCancelled downgrades user to trial
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionCancelled,
  handleSubscriptionResumed,
  handleSubscriptionExpired,
  handleSubscriptionPaused,
  handleSubscriptionUnpaused,
  handleSubscriptionPaymentSuccess,
  handleSubscriptionPaymentFailed,
} from '@/lib/lemonsqueezy/webhookHandlers';

// Mock the client to avoid actual config loading
vi.mock('@/lib/lemonsqueezy/client', () => ({
  getLemonSqueezyConfig: vi.fn(() => ({
    proVariantId: 'pro-variant-123',
    paygVariantId: 'payg-variant-456',
  })),
}));

describe('Lemon Squeezy Webhook Handlers', () => {
  let mockPrismaTransaction: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Prisma transaction object
    mockPrismaTransaction = {
      subscription: {
        upsert: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      user: {
        update: vi.fn(),
      },
    };
  });

  describe('handleSubscriptionCreated', () => {
    describe('3.4-UNIT-017: subscription_created webhook creates subscription record', () => {
      it('should create subscription record with correct fields from webhook payload', async () => {
        // Arrange
        const webhookData = {
          id: 'sub-123',
          attributes: {
            customer_id: 'cust-456',
            order_id: 'order-789',
            product_id: 'prod-111',
            variant_id: 'pro-variant-123',
            status: 'active',
            renews_at: '2025-01-01T00:00:00Z',
            ends_at: null,
            trial_ends_at: null,
            billing_anchor: 1,
            custom_data: {
              user_id: 'user-999',
            },
          },
        };

        // Act
        await handleSubscriptionCreated(webhookData, mockPrismaTransaction);

        // Assert
        expect(mockPrismaTransaction.subscription.upsert).toHaveBeenCalledWith({
          where: { lemonsqueezy_subscription_id: 'sub-123' },
          create: expect.objectContaining({
            lemonsqueezy_subscription_id: 'sub-123',
            user_id: 'user-999',
            lemonsqueezy_order_id: 'order-789',
            lemonsqueezy_product_id: 'prod-111',
            lemonsqueezy_variant_id: 'pro-variant-123',
            lemonsqueezy_customer_id: 'cust-456',
            status: 'active',
            tier: 'pro',
            renews_at: new Date('2025-01-01T00:00:00Z'),
          }),
          update: expect.objectContaining({
            status: 'active',
            renews_at: new Date('2025-01-01T00:00:00Z'),
          }),
        });
      });
    });

    describe('3.4-UNIT-018: subscription_created webhook updates user tier to Pro', () => {
      it('should update user tier to pro when variant_id matches Pro variant', async () => {
        // Arrange
        const webhookData = {
          id: 'sub-123',
          attributes: {
            customer_id: 'cust-456',
            product_id: 'prod-111',
            variant_id: 'pro-variant-123', // Pro variant
            status: 'active',
            renews_at: '2025-01-01T00:00:00Z',
            custom_data: {
              user_id: 'user-999',
            },
          },
        };

        // Act
        await handleSubscriptionCreated(webhookData, mockPrismaTransaction);

        // Assert
        expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
          where: { id: 'user-999' },
          data: expect.objectContaining({
            tier: 'pro',
            lemonsqueezy_customer_id: 'cust-456',
          }),
        });
      });
    });

    describe('3.4-UNIT-019: subscription_created webhook resets Pro user usage', () => {
      it('should reset messages_used_count and set messages_reset_date for Pro users', async () => {
        // Arrange
        const webhookData = {
          id: 'sub-123',
          attributes: {
            customer_id: 'cust-456',
            product_id: 'prod-111',
            variant_id: 'pro-variant-123', // Pro variant
            status: 'active',
            renews_at: '2025-02-01T00:00:00Z',
            custom_data: {
              user_id: 'user-999',
            },
          },
        };

        // Act
        await handleSubscriptionCreated(webhookData, mockPrismaTransaction);

        // Assert
        expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
          where: { id: 'user-999' },
          data: expect.objectContaining({
            tier: 'pro',
            messages_used_count: 0,
            messages_reset_date: new Date('2025-02-01T00:00:00Z'),
          }),
        });
      });
    });

    it('should update user tier to payg when variant_id matches PAYG variant', async () => {
      // Arrange
      const webhookData = {
        id: 'sub-123',
        attributes: {
          customer_id: 'cust-456',
          product_id: 'prod-111',
          variant_id: 'payg-variant-456', // PAYG variant
          status: 'active',
          custom_data: {
            user_id: 'user-999',
          },
        },
      };

      // Act
      await handleSubscriptionCreated(webhookData, mockPrismaTransaction);

      // Assert
      expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
        where: { id: 'user-999' },
        data: expect.objectContaining({
          tier: 'payg',
          lemonsqueezy_customer_id: 'cust-456',
        }),
      });
      // PAYG should NOT reset usage
      expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
        where: { id: 'user-999' },
        data: expect.not.objectContaining({
          messages_used_count: 0,
        }),
      });
    });

    it('should throw error when user_id is missing from custom_data', async () => {
      // Arrange
      const webhookData = {
        id: 'sub-123',
        attributes: {
          customer_id: 'cust-456',
          variant_id: 'pro-variant-123',
          custom_data: {}, // Missing user_id
        },
      };

      // Act & Assert
      await expect(handleSubscriptionCreated(webhookData, mockPrismaTransaction))
        .rejects.toThrow('Missing user_id in webhook payload');
    });
  });

  describe('handleSubscriptionPaymentSuccess', () => {
    describe('3.4-UNIT-020: subscription_payment_success webhook resets Pro usage', () => {
      it('should reset messages_used_count for Pro users on recurring payment', async () => {
        // Arrange
        const webhookData = {
          attributes: {
            subscription_id: 'sub-123',
            renews_at: '2025-03-01T00:00:00Z',
          },
        };

        mockPrismaTransaction.subscription.findUnique.mockResolvedValue({
          lemonsqueezy_subscription_id: 'sub-123',
          user_id: 'user-999',
          tier: 'pro',
        });

        // Act
        await handleSubscriptionPaymentSuccess(webhookData, mockPrismaTransaction);

        // Assert
        expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
          where: { id: 'user-999' },
          data: {
            messages_used_count: 0,
            messages_reset_date: new Date('2025-03-01T00:00:00Z'),
          },
        });
      });

      it('should not reset usage for PAYG users', async () => {
        // Arrange
        const webhookData = {
          attributes: {
            subscription_id: 'sub-123',
            renews_at: '2025-03-01T00:00:00Z',
          },
        };

        mockPrismaTransaction.subscription.findUnique.mockResolvedValue({
          lemonsqueezy_subscription_id: 'sub-123',
          user_id: 'user-999',
          tier: 'payg', // PAYG tier
        });

        // Act
        await handleSubscriptionPaymentSuccess(webhookData, mockPrismaTransaction);

        // Assert
        expect(mockPrismaTransaction.user.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('handleSubscriptionCancelled', () => {
    describe('3.5-UNIT-CRITICAL: subscription_cancelled BLOCKS access with tier=cancelled', () => {
      it('CRITICAL: should set tier to CANCELLED (not trial) when subscription cancelled', async () => {
        // CRITICAL SECURITY: Cancelled users must have tier='cancelled' to block ALL access
        // Arrange
        const webhookData = {
          id: 'sub-123',
          attributes: {
            status: 'cancelled',
            ends_at: new Date().toISOString(),
          },
        };

        mockPrismaTransaction.subscription.findUnique.mockResolvedValue({
          lemonsqueezy_subscription_id: 'sub-123',
          user_id: 'user-999',
        });

        // Act
        await handleSubscriptionCancelled(webhookData, mockPrismaTransaction);

        // Assert - Subscription updated
        expect(mockPrismaTransaction.subscription.update).toHaveBeenCalledWith({
          where: { lemonsqueezy_subscription_id: 'sub-123' },
          data: {
            status: 'cancelled',
            ends_at: expect.any(Date),
          },
        });

        // Assert - User tier set to 'cancelled' (CRITICAL)
        expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
          where: { id: 'user-999' },
          data: {
            tier: 'cancelled', // CRITICAL: Must be 'cancelled', NOT 'trial'
            messages_reset_date: null,
          },
        });
      });

      it('CRITICAL: should ALWAYS set tier to cancelled regardless of remaining time', async () => {
        // CRITICAL: Even if subscription has time left, user access is revoked immediately
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

        const webhookData = {
          id: 'sub-123',
          attributes: {
            status: 'active',
            ends_at: futureDate.toISOString(), // Has time left, but cancelled
          },
        };

        mockPrismaTransaction.subscription.findUnique.mockResolvedValue({
          lemonsqueezy_subscription_id: 'sub-123',
          user_id: 'user-999',
        });

        // Act
        await handleSubscriptionCancelled(webhookData, mockPrismaTransaction);

        // Assert - User IMMEDIATELY set to cancelled
        expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
          where: { id: 'user-999' },
          data: {
            tier: 'cancelled', // CRITICAL: Immediate access revocation
            messages_reset_date: null,
          },
        });
      });

      it('should handle subscription not found gracefully', async () => {
        const webhookData = {
          id: 'sub-nonexistent',
          attributes: {
            status: 'cancelled',
          },
        };

        mockPrismaTransaction.subscription.findUnique.mockResolvedValue(null);

        // Should not throw error
        await expect(
          handleSubscriptionCancelled(webhookData, mockPrismaTransaction)
        ).resolves.toBeUndefined();

        // Should not attempt to update user
        expect(mockPrismaTransaction.user.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('handleSubscriptionExpired', () => {
    it('should downgrade user to trial when subscription expires', async () => {
      // Arrange
      const webhookData = {
        id: 'sub-123',
      };

      mockPrismaTransaction.subscription.findUnique.mockResolvedValue({
        lemonsqueezy_subscription_id: 'sub-123',
        user_id: 'user-999',
      });

      // Act
      await handleSubscriptionExpired(webhookData, mockPrismaTransaction);

      // Assert
      expect(mockPrismaTransaction.subscription.update).toHaveBeenCalledWith({
        where: { lemonsqueezy_subscription_id: 'sub-123' },
        data: {
          status: 'expired',
          ends_at: expect.any(Date),
        },
      });

      expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
        where: { id: 'user-999' },
        data: {
          tier: 'trial',
          messages_reset_date: null,
        },
      });
    });
  });

  describe('handleSubscriptionResumed', () => {
    it('should restore user tier when subscription is resumed', async () => {
      // Arrange
      const webhookData = {
        id: 'sub-123',
        attributes: {
          renews_at: '2025-04-01T00:00:00Z',
        },
      };

      mockPrismaTransaction.subscription.findUnique.mockResolvedValue({
        lemonsqueezy_subscription_id: 'sub-123',
        user_id: 'user-999',
        tier: 'pro',
      });

      // Act
      await handleSubscriptionResumed(webhookData, mockPrismaTransaction);

      // Assert
      expect(mockPrismaTransaction.subscription.update).toHaveBeenCalledWith({
        where: { lemonsqueezy_subscription_id: 'sub-123' },
        data: {
          status: 'active',
          renews_at: new Date('2025-04-01T00:00:00Z'),
          ends_at: null,
        },
      });

      expect(mockPrismaTransaction.user.update).toHaveBeenCalledWith({
        where: { id: 'user-999' },
        data: {
          tier: 'pro',
          messages_reset_date: new Date('2025-04-01T00:00:00Z'),
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing subscription gracefully', async () => {
      // Arrange
      const webhookData = {
        id: 'sub-999',
      };

      mockPrismaTransaction.subscription.findUnique.mockResolvedValue(null);

      // Mock logger to spy on error calls
      const mockLog = await import('@/lib/observability/logger');
      const logErrorSpy = vi.spyOn(mockLog.log, 'error');

      // Act
      await handleSubscriptionExpired(webhookData, mockPrismaTransaction);

      // Assert
      expect(logErrorSpy).toHaveBeenCalledWith(
        'Subscription not found for expiration',
        expect.objectContaining({
          subscriptionId: 'sub-999',
          eventType: 'subscription_expired',
        })
      );
      expect(mockPrismaTransaction.user.update).not.toHaveBeenCalled();
    });
  });
});