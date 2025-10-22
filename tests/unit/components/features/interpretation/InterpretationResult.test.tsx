import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { InterpretationResult } from '@/components/features/interpretation/InterpretationResult';
import {
  mockSameCultureResult,
  mockCrossCultureResult,
} from '@/tests/fixtures/emotions';

describe('InterpretationResult', () => {
  describe('Bottom Line Section', () => {
    it('should render bottom line section with heading', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      expect(
        screen.getByRole('heading', { name: /🎯 The Bottom Line/i })
      ).toBeInTheDocument();
    });

    it('should display bottom line text content', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      expect(
        screen.getByText(/The sender is expressing sincere gratitude with warmth/i)
      ).toBeInTheDocument();
    });

    it('should use semantic h2 heading for bottom line', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('🎯 The Bottom Line');
    });
  });

  describe('Cultural Context Section', () => {
    it('should render cultural context section with heading', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      expect(
        screen.getByRole('heading', { name: /🔍 Cultural Context/i })
      ).toBeInTheDocument();
    });

    it('should display cultural context text content', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      expect(
        screen.getByText(/In American culture, "thank you so much"/i)
      ).toBeInTheDocument();
    });

    it('should use semantic h3 heading for cultural context', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      const headings = screen.getAllByRole('heading', { level: 3 });
      const contextHeading = headings.find((h) =>
        h.textContent?.includes('🔍 Cultural Context')
      );
      expect(contextHeading).toBeInTheDocument();
    });
  });

  describe('Top 3 Emotions Section', () => {
    it('should render emotions section with heading', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      expect(
        screen.getByRole('heading', { name: /😊 Top 3 Emotions Detected/i })
      ).toBeInTheDocument();
    });

    it('should render exactly 3 emotions (not more)', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      // Count EmotionGauge components by checking for rank numbers
      expect(screen.getByText('1. Gratitude')).toBeInTheDocument();
      expect(screen.getByText('2. Warmth')).toBeInTheDocument();
      expect(screen.getByText('3. Appreciation')).toBeInTheDocument();

      // Should not render a 4th emotion
      expect(screen.queryByText(/^4\./)).not.toBeInTheDocument();
    });

    it('should render emotions in correct order (1, 2, 3)', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      const emotionHeadings = screen.getAllByRole('heading', { level: 3 });
      const emotionNames = emotionHeadings
        .filter((h) => h.textContent?.match(/^\d+\./))
        .map((h) => h.textContent);

      expect(emotionNames).toEqual([
        '1. Gratitude',
        '2. Warmth',
        '3. Appreciation',
      ]);
    });

    it('should use grid layout for responsive design', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      // Find the grid container
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('sm:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Messages Remaining Counter', () => {
    it('should display messages remaining when provided', () => {
      render(
        <InterpretationResult
          result={mockSameCultureResult}
          messagesRemaining={9}
        />
      );

      expect(screen.getByText(/9 messages remaining/i)).toBeInTheDocument();
    });

    it('should display messages remaining with emoji icon', () => {
      render(
        <InterpretationResult
          result={mockSameCultureResult}
          messagesRemaining={5}
        />
      );

      expect(screen.getByText(/💬 5 messages remaining/i)).toBeInTheDocument();
    });

    it('should not display messages remaining when undefined', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      expect(
        screen.queryByText(/messages remaining/i)
      ).not.toBeInTheDocument();
    });

    it('should display 0 messages remaining correctly', () => {
      render(
        <InterpretationResult
          result={mockSameCultureResult}
          messagesRemaining={0}
        />
      );

      expect(screen.getByText(/0 messages remaining/i)).toBeInTheDocument();
    });
  });

  describe('Same-culture interpretation', () => {
    it('should pass sameCulture=true to EmotionGauge when no receiverScore', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      // Verify single-score display (not dual scores)
      const intensityLabels = screen.getAllByText('Intensity:');
      expect(intensityLabels.length).toBeGreaterThan(0);
      expect(
        screen.queryByText('In their culture:')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('In your culture:')).not.toBeInTheDocument();
    });

    it('should render all 3 emotions with same-culture display', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      // All three emotions should show intensity label
      const intensityLabels = screen.getAllByText('Intensity:');
      expect(intensityLabels).toHaveLength(3);
    });
  });

  describe('Cross-culture interpretation', () => {
    it('should pass sameCulture=false to EmotionGauge when receiverScore exists', () => {
      render(<InterpretationResult result={mockCrossCultureResult} />);

      // Verify dual-score display
      expect(screen.getAllByText('In their culture:').length).toBeGreaterThan(
        0
      );
      expect(screen.getAllByText('In your culture:').length).toBeGreaterThan(0);
    });

    it('should render all 3 emotions with cross-culture display', () => {
      render(<InterpretationResult result={mockCrossCultureResult} />);

      // Each of 3 emotions should have dual labels
      const theirCultureLabels = screen.getAllByText('In their culture:');
      const yourCultureLabels = screen.getAllByText('In your culture:');

      expect(theirCultureLabels).toHaveLength(3);
      expect(yourCultureLabels).toHaveLength(3);
    });

    it('should display correct emotion names for cross-culture', () => {
      render(<InterpretationResult result={mockCrossCultureResult} />);

      expect(screen.getByText('1. Directness')).toBeInTheDocument();
      expect(screen.getByText('2. Formality')).toBeInTheDocument();
      expect(screen.getByText('3. Gratitude')).toBeInTheDocument();
    });
  });

  describe('Responsive design', () => {
    it('should use responsive padding classes', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      const outerContainer = container.firstChild as HTMLElement;
      expect(outerContainer).toHaveClass('px-4');
      expect(outerContainer).toHaveClass('sm:px-6');
      expect(outerContainer).toHaveClass('lg:px-8');
    });

    it('should use responsive text sizes for headings', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      const bottomLineHeading = screen.getByRole('heading', {
        name: /🎯 The Bottom Line/i,
      });
      expect(bottomLineHeading).toHaveClass('text-xl');
      expect(bottomLineHeading).toHaveClass('sm:text-2xl');
    });

    it('should use responsive padding for article container', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      const article = container.querySelector('article');
      expect(article).toHaveClass('p-4');
      expect(article).toHaveClass('sm:p-6');
    });

    it('should maintain max-width constraint for readability', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      const outerContainer = container.firstChild as HTMLElement;
      expect(outerContainer).toHaveClass('max-w-4xl');
      expect(outerContainer).toHaveClass('mx-auto');
    });
  });

  describe('Semantic HTML and Accessibility', () => {
    it('should use semantic article element', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });

    it('should use semantic section elements', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(3); // Bottom Line, Cultural Context, Emotions
    });

    it('should have proper heading hierarchy (h2 for main, h3 for subsections)', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      const h2Headings = screen.getAllByRole('heading', { level: 2 });
      const h3Headings = screen.getAllByRole('heading', { level: 3 });

      expect(h2Headings).toHaveLength(1); // Only Bottom Line
      expect(h3Headings.length).toBeGreaterThan(3); // Cultural Context + Emotions section + 3 emotion headings
    });

    it('should use article landmark for screen readers', () => {
      render(<InterpretationResult result={mockSameCultureResult} />);

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
    });
  });

  describe('Visual styling', () => {
    it('should have light blue background for visual separation', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      const article = container.querySelector('article');
      expect(article).toHaveClass('bg-blue-50/50');
      expect(article).toHaveClass('dark:bg-blue-900/10');
    });

    it('should have rounded corners', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      const article = container.querySelector('article');
      expect(article).toHaveClass('rounded-lg');
    });

    it('should have border for definition', () => {
      const { container } = render(
        <InterpretationResult result={mockSameCultureResult} />
      );

      const article = container.querySelector('article');
      expect(article).toHaveClass('border');
      expect(article).toHaveClass('border-blue-200');
      expect(article).toHaveClass('dark:border-blue-800');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty emotions array gracefully', () => {
      const emptyResult = {
        ...mockSameCultureResult,
        emotions: [],
      };

      render(<InterpretationResult result={emptyResult} />);

      // Should still render sections
      expect(
        screen.getByRole('heading', { name: /🎯 The Bottom Line/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /😊 Top 3 Emotions Detected/i })
      ).toBeInTheDocument();

      // But no emotion items
      expect(screen.queryByText(/1\./)).not.toBeInTheDocument();
    });

    it('should handle fewer than 3 emotions', () => {
      const twoEmotionsResult = {
        ...mockSameCultureResult,
        emotions: mockSameCultureResult.emotions.slice(0, 2),
      };

      render(<InterpretationResult result={twoEmotionsResult} />);

      expect(screen.getByText('1. Gratitude')).toBeInTheDocument();
      expect(screen.getByText('2. Warmth')).toBeInTheDocument();
      expect(screen.queryByText(/3\./)).not.toBeInTheDocument();
    });

    it('should handle more than 3 emotions by slicing to top 3', () => {
      const manyEmotionsResult = {
        ...mockSameCultureResult,
        emotions: [
          ...mockSameCultureResult.emotions,
          { name: 'Fourth Emotion', senderScore: 5 },
          { name: 'Fifth Emotion', senderScore: 4 },
        ],
      };

      render(<InterpretationResult result={manyEmotionsResult} />);

      // Should only render first 3
      expect(screen.getByText('1. Gratitude')).toBeInTheDocument();
      expect(screen.getByText('2. Warmth')).toBeInTheDocument();
      expect(screen.getByText('3. Appreciation')).toBeInTheDocument();
      expect(screen.queryByText('Fourth Emotion')).not.toBeInTheDocument();
      expect(screen.queryByText('Fifth Emotion')).not.toBeInTheDocument();
    });

    it('should handle very long bottom line text', () => {
      const longBottomLineResult = {
        ...mockSameCultureResult,
        bottomLine: 'A'.repeat(1000),
      };

      render(<InterpretationResult result={longBottomLineResult} />);

      // Should render without breaking
      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });

    it('should handle very long cultural context text', () => {
      const longContextResult = {
        ...mockSameCultureResult,
        culturalContext: 'B'.repeat(2000),
      };

      render(<InterpretationResult result={longContextResult} />);

      // Should render without breaking
      expect(screen.getByText('B'.repeat(2000))).toBeInTheDocument();
    });
  });
});
