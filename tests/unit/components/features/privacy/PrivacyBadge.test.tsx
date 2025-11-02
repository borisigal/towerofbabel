/**
 * Unit Tests for PrivacyBadge Component (Story 5.1 - Task 1)
 *
 * Tests privacy badge rendering, provider name display, link to privacy page,
 * variant styling, and accessibility.
 * Verifies AC#1-4, AC#8 (badge display, text format, link, icon).
 *
 * @see components/features/privacy/PrivacyBadge.tsx
 * @see docs/stories/5.1.story.md#task-1
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyBadge } from '@/components/features/privacy/PrivacyBadge';

describe('PrivacyBadge', () => {
  describe('Content Rendering', () => {
    it('should render badge with provider name in correct format', () => {
      render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      expect(screen.getByText(/Processed by OpenAI/i)).toBeInTheDocument();
      expect(screen.getByText(/No message storage by TowerOfBabel/i)).toBeInTheDocument();
    });

    it('should render with Anthropic provider name', () => {
      render(<PrivacyBadge providerName="Anthropic" variant="footer" />);

      expect(screen.getByText(/Processed by Anthropic/i)).toBeInTheDocument();
    });

    it('should display badge text with bullet separator', () => {
      render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      const badgeText = screen.getByText(/Processed by OpenAI • No message storage by TowerOfBabel/i);
      expect(badgeText).toBeInTheDocument();
    });

    it('should render lock icon', () => {
      const { container } = render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      // Lock icon should be present as SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Link Behavior', () => {
    it('should link to /privacy page', () => {
      render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      const link = screen.getByRole('link', { name: /view privacy policy/i });
      expect(link).toHaveAttribute('href', '/privacy');
    });

    it('should have descriptive aria-label', () => {
      render(<PrivacyBadge providerName="Anthropic" variant="footer" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-label', 'View privacy policy and provider information');
    });

    it('should have hover transition classes', () => {
      const { container } = render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      const link = container.querySelector('a');
      expect(link?.className).toMatch(/hover:text-foreground/);
      expect(link?.className).toMatch(/transition-colors/);
    });
  });

  describe('Variant Styles', () => {
    it('should render footer variant (default)', () => {
      const { container } = render(<PrivacyBadge providerName="OpenAI" />);

      const link = container.querySelector('a');
      expect(link?.className).toMatch(/inline-flex/);
      expect(link?.className).toMatch(/items-center/);
    });

    it('should render landing variant', () => {
      const { container } = render(<PrivacyBadge providerName="OpenAI" variant="landing" />);

      const link = container.querySelector('a');
      expect(link?.className).toMatch(/inline-flex/);
    });

    it('should render mobile variant', () => {
      const { container } = render(<PrivacyBadge providerName="OpenAI" variant="mobile" />);

      const link = container.querySelector('a');
      expect(link?.className).toMatch(/inline-flex/);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic link with proper role', () => {
      render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should have accessible text content', () => {
      render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName(/view privacy policy/i);
    });

    it('should have keyboard accessible link', () => {
      render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      const link = screen.getByRole('link');
      // Link should be focusable (no tabindex=-1)
      expect(link).not.toHaveAttribute('tabindex', '-1');
    });

    it('should hide lock icon from screen readers', () => {
      const { container } = render(<PrivacyBadge providerName="OpenAI" variant="footer" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Different Providers', () => {
    it('should render with OpenAI provider', () => {
      render(<PrivacyBadge providerName="OpenAI" />);
      expect(screen.getByText(/OpenAI/i)).toBeInTheDocument();
    });

    it('should render with Anthropic provider', () => {
      render(<PrivacyBadge providerName="Anthropic" />);
      expect(screen.getByText(/Anthropic/i)).toBeInTheDocument();
    });

    it('should render with Google provider', () => {
      render(<PrivacyBadge providerName="Google" />);
      expect(screen.getByText(/Google/i)).toBeInTheDocument();
    });

    it('should render with xAI provider', () => {
      render(<PrivacyBadge providerName="xAI" />);
      expect(screen.getByText(/xAI/i)).toBeInTheDocument();
    });
  });
});
