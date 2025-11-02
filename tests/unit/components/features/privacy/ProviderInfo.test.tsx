/**
 * Unit Tests for ProviderInfo Component (Story 5.1 - Task 3)
 *
 * Tests provider information display, privacy policy link, and data retention policy.
 * Verifies AC#5 (provider info display on privacy page).
 *
 * @see components/features/privacy/ProviderInfo.tsx
 * @see docs/stories/5.1.story.md#task-3
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderInfo } from '@/components/features/privacy/ProviderInfo';

describe('ProviderInfo', () => {
  const mockProvider = {
    name: 'Anthropic',
    privacyUrl: 'https://www.anthropic.com/privacy',
    dataRetentionDays: 0,
    dataRetentionPolicy:
      'Anthropic does not retain or train on customer API data. All data is immediately deleted after processing.',
  };

  describe('Content Rendering', () => {
    it('should render provider name', () => {
      render(<ProviderInfo provider={mockProvider} />);

      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Current AI Provider')).toBeInTheDocument();
    });

    it('should render provider name as prominent heading', () => {
      render(<ProviderInfo provider={mockProvider} />);

      const providerName = screen.getByText('Anthropic');
      expect(providerName).toHaveClass('text-2xl', 'font-bold', 'text-primary');
    });

    it('should render privacy policy link with correct URL', () => {
      render(<ProviderInfo provider={mockProvider} />);

      const link = screen.getByRole('link', { name: /View Anthropic Privacy Policy/i });
      expect(link).toHaveAttribute('href', 'https://www.anthropic.com/privacy');
    });

    it('should open privacy policy link in new tab', () => {
      render(<ProviderInfo provider={mockProvider} />);

      const link = screen.getByRole('link', { name: /View Anthropic Privacy Policy/i });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render data retention policy text', () => {
      render(<ProviderInfo provider={mockProvider} />);

      expect(
        screen.getByText(
          /Anthropic does not retain or train on customer API data/i
        )
      ).toBeInTheDocument();
    });
  });

  describe('Data Retention Days Display', () => {
    it('should show "does not retain" message when retention days is 0', () => {
      const provider = { ...mockProvider, dataRetentionDays: 0 };
      render(<ProviderInfo provider={provider} />);

      expect(
        screen.getByText(/Anthropic does not retain your data after processing/i)
      ).toBeInTheDocument();
    });

    it('should show retention days when greater than 0', () => {
      const provider = { ...mockProvider, dataRetentionDays: 30 };
      render(<ProviderInfo provider={provider} />);

      expect(
        screen.getByText(/After 30 days, Anthropic permanently deletes your data/i)
      ).toBeInTheDocument();
    });

    it('should not show "does not retain" message when retention days is greater than 0', () => {
      const provider = { ...mockProvider, dataRetentionDays: 30 };
      render(<ProviderInfo provider={provider} />);

      expect(
        screen.queryByText(/does not retain your data after processing/i)
      ).not.toBeInTheDocument();
    });

    it('should show correct retention days for 90 days', () => {
      const provider = { ...mockProvider, dataRetentionDays: 90 };
      render(<ProviderInfo provider={provider} />);

      expect(
        screen.getByText(/After 90 days, Anthropic permanently deletes your data/i)
      ).toBeInTheDocument();
    });
  });

  describe('Different Providers', () => {
    it('should render OpenAI provider information', () => {
      const openaiProvider = {
        name: 'OpenAI',
        privacyUrl: 'https://openai.com/privacy',
        dataRetentionDays: 30,
        dataRetentionPolicy:
          'OpenAI retains API data for 30 days for abuse monitoring, then permanently deletes it.',
      };
      render(<ProviderInfo provider={openaiProvider} />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /View OpenAI Privacy Policy/i })
      ).toHaveAttribute('href', 'https://openai.com/privacy');
      expect(
        screen.getByText(/OpenAI retains API data for 30 days/i)
      ).toBeInTheDocument();
    });

    it('should render Google provider information', () => {
      const googleProvider = {
        name: 'Google',
        privacyUrl: 'https://policies.google.com/privacy',
        dataRetentionDays: 0,
        dataRetentionPolicy:
          'Google does not use customer data to train AI models.',
      };
      render(<ProviderInfo provider={googleProvider} />);

      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /View Google Privacy Policy/i })
      ).toHaveAttribute('href', 'https://policies.google.com/privacy');
    });
  });

  describe('Accessibility', () => {
    it('should use semantic heading structure', () => {
      render(<ProviderInfo provider={mockProvider} />);

      expect(screen.getByRole('heading', { name: /Current AI Provider/i })).toBeInTheDocument();
    });

    it('should have accessible link text', () => {
      render(<ProviderInfo provider={mockProvider} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName(/View Anthropic Privacy Policy/i);
    });

    it('should have proper link security attributes', () => {
      render(<ProviderInfo provider={mockProvider} />);

      const link = screen.getByRole('link');
      // rel="noopener noreferrer" prevents security vulnerabilities with target="_blank"
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Visual Styling', () => {
    it('should have bordered card container', () => {
      const { container } = render(<ProviderInfo provider={mockProvider} />);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/border/);
      expect(card.className).toMatch(/rounded-lg/);
      expect(card.className).toMatch(/p-6/);
    });

    it('should have proper spacing between sections', () => {
      const { container } = render(<ProviderInfo provider={mockProvider} />);

      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/space-y-4/);
    });
  });
});
