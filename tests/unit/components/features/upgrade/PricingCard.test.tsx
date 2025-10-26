/**
 * Unit Tests for PricingCard Component (Story 3.3 - Task 10)
 *
 * Tests pricing tier card display, features, CTA buttons, and states.
 * Verifies AC#2, AC#9 content display.
 *
 * @see components/features/upgrade/PricingCard.tsx
 * @see docs/stories/3.3.story.md#task-10
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PricingCard } from '@/components/features/upgrade/PricingCard';

describe('PricingCard', () => {
  const mockOnCtaClick = vi.fn();

  const defaultProps = {
    tier: 'payg' as const,
    title: 'Pay-As-You-Go',
    price: '$0.50',
    priceSubtext: 'per interpretation',
    description: 'Use as much as you need',
    features: ['No upfront commitment', 'Billed monthly'],
    ctaText: 'Start Pay-As-You-Go',
    ctaVariant: 'secondary' as const,
    onCtaClick: mockOnCtaClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Rendering', () => {
    it('should render tier name (title)', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('Pay-As-You-Go')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Pay-As-You-Go' })).toBeInTheDocument();
    });

    it('should render price', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('$0.50')).toBeInTheDocument();
    });

    it('should render price subtext when provided', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('per interpretation')).toBeInTheDocument();
    });

    it('should not render price subtext when not provided', () => {
      const props = { ...defaultProps, priceSubtext: undefined };
      render(<PricingCard {...props} />);

      expect(screen.queryByText('per interpretation')).not.toBeInTheDocument();
    });

    it('should render description', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('Use as much as you need')).toBeInTheDocument();
    });

    it('should render all features with checkmarks', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('No upfront commitment')).toBeInTheDocument();
      expect(screen.getByText('Billed monthly')).toBeInTheDocument();

      // Check icons are present (lucide-react Check component)
      const featuresList = screen.getByLabelText(/Pay-As-You-Go features/i);
      expect(featuresList).toBeInTheDocument();
    });

    it('should render CTA button with correct text', () => {
      render(<PricingCard {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /Start Pay-As-You-Go for Pay-As-You-Go tier/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Start Pay-As-You-Go');
    });
  });

  describe('Recommended Badge', () => {
    it('should display "Recommended" badge when recommended=true', () => {
      const props = { ...defaultProps, recommended: true };
      render(<PricingCard {...props} />);

      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('should NOT display "Recommended" badge when recommended=false', () => {
      const props = { ...defaultProps, recommended: false };
      render(<PricingCard {...props} />);

      expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    });

    it('should NOT display "Recommended" badge by default', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    });

    it('should display recommended badge for Pro tier (typical use case)', () => {
      const props = {
        ...defaultProps,
        tier: 'pro' as const,
        title: 'Pro',
        price: '$10/month',
        recommended: true,
      };
      render(<PricingCard {...props} />);

      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });
  });

  describe('CTA Button Interaction', () => {
    it('should call onClick handler when CTA button is clicked', async () => {
      const user = userEvent.setup();
      render(<PricingCard {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /Start Pay-As-You-Go for Pay-As-You-Go tier/i,
      });

      await user.click(button);

      expect(mockOnCtaClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when button is disabled', async () => {
      const user = userEvent.setup();
      const props = { ...defaultProps, disabled: true };
      render(<PricingCard {...props} />);

      const button = screen.getByRole('button', {
        name: /Start Pay-As-You-Go for Pay-As-You-Go tier/i,
      });

      // Button should be disabled
      expect(button).toBeDisabled();

      // Click should not trigger handler
      await user.click(button);
      expect(mockOnCtaClick).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable button when disabled=true', () => {
      const props = { ...defaultProps, disabled: true };
      render(<PricingCard {...props} />);

      const button = screen.getByRole('button', {
        name: /Start Pay-As-You-Go for Pay-As-You-Go tier/i,
      });
      expect(button).toBeDisabled();
    });

    it('should reduce opacity of card when disabled=true', () => {
      const props = { ...defaultProps, disabled: true };
      const { container } = render(<PricingCard {...props} />);

      const card = container.querySelector('[role="article"]');
      expect(card?.className).toMatch(/opacity-60/);
    });

    it('should not have hover effect when disabled=true', () => {
      const props = { ...defaultProps, disabled: true };
      const { container } = render(<PricingCard {...props} />);

      const card = container.querySelector('[role="article"]');
      // Disabled card should not have hover:shadow-md
      expect(card?.className).not.toMatch(/hover:shadow-md/);
    });

    it('should enable button when disabled=false', () => {
      const props = { ...defaultProps, disabled: false };
      render(<PricingCard {...props} />);

      const button = screen.getByRole('button', {
        name: /Start Pay-As-You-Go for Pay-As-You-Go tier/i,
      });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have role="article" for semantic HTML', () => {
      const { container } = render(<PricingCard {...defaultProps} />);

      const card = container.querySelector('[role="article"]');
      expect(card).toBeInTheDocument();
    });

    it('should have aria-label for pricing tier', () => {
      const { container } = render(<PricingCard {...defaultProps} />);

      const card = container.querySelector('[aria-label="Pay-As-You-Go pricing tier"]');
      expect(card).toBeInTheDocument();
    });

    it('should have aria-label on features list', () => {
      render(<PricingCard {...defaultProps} />);

      const featuresList = screen.getByLabelText(/Pay-As-You-Go features/i);
      expect(featuresList).toBeInTheDocument();
    });

    it('should have descriptive aria-label on CTA button', () => {
      render(<PricingCard {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /Start Pay-As-You-Go for Pay-As-You-Go tier/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('should hide checkmark icons from screen readers (aria-hidden)', () => {
      const { container } = render(<PricingCard {...defaultProps} />);

      // Check icons should have aria-hidden="true"
      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Different Tier Variants', () => {
    it('should render Trial tier (disabled, no badge)', () => {
      const props = {
        tier: 'trial' as const,
        title: 'Free Trial',
        price: 'Free',
        description: '14 days, 10 messages',
        features: ['Expired or used up'],
        ctaText: 'Current Plan',
        ctaVariant: 'outline' as const,
        disabled: true,
        onCtaClick: mockOnCtaClick,
      };
      render(<PricingCard {...props} />);

      expect(screen.getByText('Free Trial')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Current Plan for Free Trial tier/i })
      ).toBeDisabled();
    });

    it('should render PAYG tier (secondary button)', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('Pay-As-You-Go')).toBeInTheDocument();
      expect(screen.getByText('$0.50')).toBeInTheDocument();
      expect(screen.getByText('per interpretation')).toBeInTheDocument();
    });

    it('should render Pro tier (recommended badge, primary button)', () => {
      const props = {
        tier: 'pro' as const,
        title: 'Pro',
        price: '$10/month',
        description: '100 messages per month',
        features: ['100 interpretations/month', 'Priority support'],
        ctaText: 'Subscribe to Pro',
        ctaVariant: 'default' as const,
        recommended: true,
        onCtaClick: mockOnCtaClick,
      };
      render(<PricingCard {...props} />);

      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('$10/month')).toBeInTheDocument();
      expect(screen.getByText('Recommended')).toBeInTheDocument();
      expect(screen.getByText('Priority support')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should have blue border for recommended tier', () => {
      const props = { ...defaultProps, recommended: true };
      const { container } = render(<PricingCard {...props} />);

      const card = container.querySelector('[role="article"]');
      expect(card?.className).toMatch(/border-blue-600/);
    });

    it('should have gray border for non-recommended tier', () => {
      const props = { ...defaultProps, recommended: false };
      const { container } = render(<PricingCard {...props} />);

      const card = container.querySelector('[role="article"]');
      expect(card?.className).toMatch(/border-gray-200/);
    });
  });
});
