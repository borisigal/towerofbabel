/**
 * Integration Tests for Privacy Page (Story 5.1 - Task 7)
 *
 * Tests privacy page rendering, content completeness, and navigation.
 * Verifies all acceptance criteria (AC #1-10) work together.
 *
 * @see app/privacy/page.tsx
 * @see components/features/privacy/PrivacyBadge.tsx
 * @see components/layout/Footer.tsx
 * @see docs/stories/5.1.story.md#task-7
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage from '@/app/privacy/page';
import { Footer } from '@/components/layout/Footer';

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_LLM_PROVIDER_NAME: 'Anthropic',
  NEXT_PUBLIC_LLM_PROVIDER_PRIVACY_URL: 'https://www.anthropic.com/privacy',
  NEXT_PUBLIC_LLM_DATA_RETENTION_DAYS: '0',
  NEXT_PUBLIC_LLM_DATA_RETENTION_POLICY:
    'Anthropic does not retain or train on customer API data. All data is immediately deleted after processing.',
};

describe('Privacy Page Integration', () => {
  beforeEach(() => {
    // Set up environment variables for each test
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  describe('Page Rendering', () => {
    it('should render privacy page without errors', () => {
      render(<PrivacyPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();
    });

    it('should render with proper page structure', () => {
      const { container } = render(<PrivacyPage />);

      // Page should have container and sections
      expect(container.querySelector('.container')).toBeInTheDocument();
    });
  });

  describe('Key Message Section (AC #5, #6)', () => {
    it('should display "We Don\'t Store Your Messages" heading', () => {
      render(<PrivacyPage />);

      expect(
        screen.getByRole('heading', { name: /We Don't Store Your Messages/i })
      ).toBeInTheDocument();
    });

    it('should explain that message content is not stored', () => {
      render(<PrivacyPage />);

      expect(screen.getByText(/TowerOfBabel does/i)).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.tagName === 'STRONG' && /^NOT$/i.test(content);
      })).toBeInTheDocument();
      expect(screen.getByText(/store the content of your messages/i)).toBeInTheDocument();
      expect(screen.getByText(/only save metadata/i)).toBeInTheDocument();
    });

    it('should emphasize privacy with highlighted section', () => {
      const { container } = render(<PrivacyPage />);

      // Key message should be in an accent-colored section
      const keyMessageSection = container.querySelector('.bg-accent\\/50');
      expect(keyMessageSection).toBeInTheDocument();
    });
  });

  describe('Provider Information Section (AC #5)', () => {
    it('should display AI Provider Information section', () => {
      render(<PrivacyPage />);

      expect(
        screen.getByRole('heading', { name: /AI Provider Information/i })
      ).toBeInTheDocument();
    });

    it('should show provider name from environment variable', () => {
      render(<PrivacyPage />);

      expect(screen.getByText('Anthropic')).toBeInTheDocument();
    });

    it('should link to provider privacy policy', () => {
      render(<PrivacyPage />);

      const privacyLink = screen.getByRole('link', {
        name: /View Anthropic Privacy Policy/i,
      });
      expect(privacyLink).toHaveAttribute('href', 'https://www.anthropic.com/privacy');
      expect(privacyLink).toHaveAttribute('target', '_blank');
    });

    it('should display provider data retention policy', () => {
      render(<PrivacyPage />);

      expect(
        screen.getByText(
          /does not retain or train on customer API data/i
        )
      ).toBeInTheDocument();
    });
  });

  describe('Metadata Storage Section (AC #7)', () => {
    it('should have "How We Protect Your Privacy" section', () => {
      render(<PrivacyPage />);

      expect(
        screen.getByRole('heading', { name: /How We Protect Your Privacy/i })
      ).toBeInTheDocument();
    });

    it('should list what metadata IS stored', () => {
      render(<PrivacyPage />);

      expect(screen.getByRole('heading', { name: /What We Store/i })).toBeInTheDocument();
      expect(screen.getByText(/User ID:/i)).toBeInTheDocument();
      expect(screen.getByText(/Timestamp:/i)).toBeInTheDocument();
      expect(screen.getByText(/Culture Pair:/i)).toBeInTheDocument();
      expect(screen.getByText(/Character Count:/i)).toBeInTheDocument();
      expect(screen.getByText(/Feedback:/i)).toBeInTheDocument();
    });

    it('should list what IS NOT stored', () => {
      render(<PrivacyPage />);

      expect(screen.getByRole('heading', { name: /What We DON'T Store/i })).toBeInTheDocument();
      expect(screen.getByText(/Message Content:/i)).toBeInTheDocument();
      expect(screen.getByText(/Interpretation Results:/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimized Messages:/i)).toBeInTheDocument();
    });

    it('should explain that original messages are never saved', () => {
      render(<PrivacyPage />);

      expect(
        screen.getByText(/original messages are never saved/i)
      ).toBeInTheDocument();
    });
  });

  describe('User Control Section', () => {
    it('should display "Your Control" section', () => {
      render(<PrivacyPage />);

      expect(screen.getByRole('heading', { name: /Your Control/i })).toBeInTheDocument();
    });

    it('should explain user choice and consent', () => {
      render(<PrivacyPage />);

      expect(
        screen.getByText(/choose whether to use/i)
      ).toBeInTheDocument();
    });

    it('should link to GDPR compliance section (Story 5.2)', () => {
      render(<PrivacyPage />);

      const gdprLink = screen.getByRole('link', { name: /GDPR compliance section/i });
      expect(gdprLink).toHaveAttribute('href', '/privacy#gdpr');
    });
  });

  describe('Footer and Metadata', () => {
    it('should display last updated date', () => {
      render(<PrivacyPage />);

      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });

    it('should show current date in last updated footer', () => {
      render(<PrivacyPage />);

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleDateString('en-US', {
        month: 'long',
      });

      // Check for at least the month and year in separate checks since they may be split
      expect(screen.getByText(new RegExp(currentMonth, 'i'))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(currentYear.toString(), 'i'))).toBeInTheDocument();
    });
  });

  describe('Footer Navigation to Privacy Page (AC #9)', () => {
    it('should render footer with privacy link', () => {
      render(<Footer />);

      const links = screen.getAllByRole('link');
      const privacyLink = links.find(link => link.textContent === 'Privacy' && link.getAttribute('href') === '/privacy');
      expect(privacyLink).toBeDefined();
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    it('should render footer with all navigation links', () => {
      render(<Footer />);

      const links = screen.getAllByRole('link');
      const linkTexts = links.map(link => link.textContent);

      expect(linkTexts).toContain('About');
      expect(linkTexts).toContain('Privacy');
      expect(linkTexts).toContain('Terms');
      expect(linkTexts).toContain('Contact');
    });

    it('should display privacy badge in footer', () => {
      render(<Footer />);

      expect(screen.getByText(/Processed by/i)).toBeInTheDocument();
      expect(screen.getByText(/No message storage by TowerOfBabel/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should use semantic heading hierarchy', () => {
      render(<PrivacyPage />);

      // Should have h1, h2, h3 headings
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0);
    });

    it('should have descriptive heading text', () => {
      render(<PrivacyPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /AI Provider Information/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /How We Protect Your Privacy/i })
      ).toBeInTheDocument();
    });

    it('should have privacy icon with aria-hidden', () => {
      const { container } = render(<PrivacyPage />);

      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Different Provider Configurations', () => {
    it('should render with OpenAI provider', () => {
      process.env.NEXT_PUBLIC_LLM_PROVIDER_NAME = 'OpenAI';
      process.env.NEXT_PUBLIC_LLM_PROVIDER_PRIVACY_URL = 'https://openai.com/privacy';

      render(<PrivacyPage />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('should fall back to OpenAI if env vars not set', () => {
      delete process.env.NEXT_PUBLIC_LLM_PROVIDER_NAME;

      render(<PrivacyPage />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('should show retention days when greater than 0', () => {
      process.env.NEXT_PUBLIC_LLM_DATA_RETENTION_DAYS = '30';
      process.env.NEXT_PUBLIC_LLM_PROVIDER_NAME = 'OpenAI';

      render(<PrivacyPage />);

      expect(screen.getByText(/After 30 days, OpenAI permanently deletes your data/i)).toBeInTheDocument();
    });
  });
});
