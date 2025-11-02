/**
 * Unit Tests for PrivacyIcon Component (Story 5.1 - Task 1)
 *
 * Tests privacy lock icon rendering, className prop, and accessibility.
 * Verifies AC#8 (lock icon display).
 *
 * @see components/features/privacy/PrivacyIcon.tsx
 * @see docs/stories/5.1.story.md#task-1
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PrivacyIcon } from '@/components/features/privacy/PrivacyIcon';

describe('PrivacyIcon', () => {
  describe('Rendering', () => {
    it('should render lock icon', () => {
      const { container } = render(<PrivacyIcon />);

      // Lock icon from lucide-react should render as SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should apply className prop to icon', () => {
      const { container } = render(<PrivacyIcon className="h-8 w-8 text-blue-500" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8', 'w-8', 'text-blue-500');
    });

    it('should render without className when not provided', () => {
      const { container } = render(<PrivacyIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden="true" attribute', () => {
      const { container } = render(<PrivacyIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should be decorative (hidden from screen readers)', () => {
      const { container } = render(<PrivacyIcon />);

      const svg = container.querySelector('svg');
      // Decorative icons should have aria-hidden and no role
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).not.toHaveAttribute('role', 'img');
    });
  });
});
