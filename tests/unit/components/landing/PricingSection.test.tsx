/**
 * Unit Tests for PricingSection Component
 *
 * Tests responsive layout, pricing card rendering, and mobile responsiveness.
 * Verifies cards stack vertically on mobile and display side-by-side on desktop.
 *
 * @see components/landing/PricingSection.tsx
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PricingSection, PricingCard } from '@/components/landing/PricingSection';

describe('PricingSection', () => {
  describe('Content Rendering', () => {
    it('should render pricing section header', () => {
      render(<PricingSection />);

      expect(screen.getByText('Pricing Plan')).toBeInTheDocument();
      expect(
        screen.getByText('Simple, transparent pricing for global communication.')
      ).toBeInTheDocument();
    });

    it('should render Free Trial card', () => {
      render(<PricingSection />);

      expect(screen.getByText('Free Trial')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('should render Pro card', () => {
      render(<PricingSection />);

      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });

    it('should display recommended badge on Pro tier', () => {
      render(<PricingSection />);

      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('should render optional header content when provided', () => {
      const headerContent = <div data-testid="custom-header">Custom Content</div>;
      render(<PricingSection headerContent={headerContent} />);

      expect(screen.getByTestId('custom-header')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should have responsive flex container classes', () => {
      const { container } = render(<PricingSection />);

      // Find the cards container
      const cardsContainer = container.querySelector('.flex.flex-col.md\\:flex-row');
      expect(cardsContainer).toBeInTheDocument();
    });

    it('should render both pricing cards within the container', () => {
      const { container } = render(<PricingSection />);

      const cardsContainer = container.querySelector('.flex.flex-col.md\\:flex-row');
      const cards = cardsContainer?.querySelectorAll('.max-w-\\[570px\\]');
      expect(cards?.length).toBe(2);
    });
  });
});

describe('PricingCard', () => {
  const defaultProps = {
    title: 'Test Plan',
    subtitle: 'Test subtitle',
    price: '$9.99',
    features: [
      { text: 'Feature 1' },
      { text: 'Feature 2' },
      { text: 'Feature 3' },
    ],
    ctaText: 'Get Started',
    ctaHref: '/sign-in',
  };

  describe('Content Rendering', () => {
    it('should render title', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('Test Plan')).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('should render price', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });

    it('should render price subtext when provided', () => {
      const props = { ...defaultProps, priceSubtext: 'per month' };
      render(<PricingCard {...props} />);

      expect(screen.getByText('per month')).toBeInTheDocument();
    });

    it('should render yearly price when provided', () => {
      const props = {
        ...defaultProps,
        yearlyPrice: '$99',
        yearlySavings: 'Save 17%',
      };
      render(<PricingCard {...props} />);

      expect(screen.getByText('$99')).toBeInTheDocument();
      expect(screen.getByText('per Year')).toBeInTheDocument();
      expect(screen.getByText('Save 17%')).toBeInTheDocument();
    });

    it('should render all features', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByText('Feature 2')).toBeInTheDocument();
      expect(screen.getByText('Feature 3')).toBeInTheDocument();
    });

    it('should render CTA button with correct text', () => {
      render(<PricingCard {...defaultProps} />);

      const link = screen.getByRole('link', { name: /Get Started/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/sign-in');
    });
  });

  describe('Recommended Badge', () => {
    it('should display recommended badge when isRecommended=true', () => {
      const props = { ...defaultProps, isRecommended: true };
      render(<PricingCard {...props} />);

      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('should NOT display recommended badge when isRecommended=false', () => {
      const props = { ...defaultProps, isRecommended: false };
      render(<PricingCard {...props} />);

      expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    });

    it('should NOT display recommended badge by default', () => {
      render(<PricingCard {...defaultProps} />);

      expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should apply highlighted styles when isHighlighted=true', () => {
      const props = { ...defaultProps, isHighlighted: true };
      const { container } = render(<PricingCard {...props} />);

      const card = container.querySelector('.from-purple-800\\/30');
      expect(card).toBeInTheDocument();
    });

    it('should apply default styles when isHighlighted=false', () => {
      const props = { ...defaultProps, isHighlighted: false };
      const { container } = render(<PricingCard {...props} />);

      const card = container.querySelector('.bg-white\\/5');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Responsive Typography and Spacing', () => {
    it('should have responsive padding classes', () => {
      const { container } = render(<PricingCard {...defaultProps} />);

      const innerCard = container.querySelector('.p-6.md\\:p-8');
      expect(innerCard).toBeInTheDocument();
    });

    it('should have responsive title size', () => {
      const { container } = render(<PricingCard {...defaultProps} />);

      const title = container.querySelector('.text-2xl.md\\:text-3xl');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Plan');
    });

    it('should have responsive price size', () => {
      render(<PricingCard {...defaultProps} />);

      // Price should be in a container with responsive text size
      const priceElement = screen.getByText('$9.99');
      expect(priceElement.className).toMatch(/text-4xl.*md:text-5xl/);
    });

    it('should have responsive feature text size', () => {
      const { container } = render(<PricingCard {...defaultProps} />);

      const featureText = screen.getByText('Feature 1');
      expect(featureText.className).toMatch(/text-sm.*md:text-base/);
    });

    it('should have responsive button padding', () => {
      render(<PricingCard {...defaultProps} />);

      const link = screen.getByRole('link', { name: /Get Started/i });
      expect(link.className).toMatch(/py-3.*md:py-4/);
    });
  });

  describe('Layout Classes', () => {
    it('should have full width container', () => {
      const { container } = render(<PricingCard {...defaultProps} />);

      const outerCard = container.querySelector('.w-full');
      expect(outerCard).toBeInTheDocument();
    });

    it('should have flex column layout for content', () => {
      const { container } = render(<PricingCard {...defaultProps} />);

      const innerCard = container.querySelector('.flex.flex-col');
      expect(innerCard).toBeInTheDocument();
    });
  });
});
