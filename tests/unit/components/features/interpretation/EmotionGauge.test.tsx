import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmotionGauge } from '@/components/features/interpretation/EmotionGauge';
import {
  sameCultureEmotion,
  crossCultureEmotion,
} from '@/tests/fixtures/emotions';

describe('EmotionGauge', () => {
  describe('Same-culture display', () => {
    it('should display emotion name with rank number', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      expect(screen.getByText('1. Gratitude')).toBeInTheDocument();
    });

    it('should display single intensity score with label', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      expect(screen.getByText('Intensity:')).toBeInTheDocument();
      expect(screen.getByText(/8\/10/)).toBeInTheDocument();
      expect(screen.getByText(/\(High\)/)).toBeInTheDocument();
    });

    it('should display explanation text when provided', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      expect(
        screen.getByText('Strong gratitude expressed with warmth')
      ).toBeInTheDocument();
    });

    it('should not display "In their culture" or "In your culture" labels', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      expect(screen.queryByText('In their culture:')).not.toBeInTheDocument();
      expect(screen.queryByText('In your culture:')).not.toBeInTheDocument();
    });

    it('should render progress bar with correct aria-label', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      const progressBar = screen.getByLabelText(
        'Gratitude intensity: 8 out of 10'
      );
      expect(progressBar).toBeInTheDocument();
    });

    it('should display correct intensity label for Very Low score (0-2)', () => {
      const lowEmotion = { name: 'Low Emotion', senderScore: 2 };
      render(
        <EmotionGauge emotion={lowEmotion} sameCulture={true} index={0} />
      );

      expect(screen.getByText(/\(Very Low\)/)).toBeInTheDocument();
    });

    it('should display correct intensity label for Low score (3-4)', () => {
      const lowEmotion = { name: 'Low Emotion', senderScore: 4 };
      render(
        <EmotionGauge emotion={lowEmotion} sameCulture={true} index={0} />
      );

      expect(screen.getByText(/\(Low\)/)).toBeInTheDocument();
    });

    it('should display correct intensity label for Moderate score (5-6)', () => {
      const moderateEmotion = { name: 'Moderate Emotion', senderScore: 6 };
      render(
        <EmotionGauge emotion={moderateEmotion} sameCulture={true} index={0} />
      );

      expect(screen.getByText(/\(Moderate\)/)).toBeInTheDocument();
    });

    it('should display correct intensity label for High score (7-8)', () => {
      const highEmotion = { name: 'High Emotion', senderScore: 8 };
      render(
        <EmotionGauge emotion={highEmotion} sameCulture={true} index={0} />
      );

      expect(screen.getByText(/\(High\)/)).toBeInTheDocument();
    });

    it('should display correct intensity label for Very High score (9-10)', () => {
      const veryHighEmotion = { name: 'Very High Emotion', senderScore: 10 };
      render(
        <EmotionGauge emotion={veryHighEmotion} sameCulture={true} index={0} />
      );

      expect(screen.getByText(/\(Very High\)/)).toBeInTheDocument();
    });

    it('should not display explanation section when explanation is undefined', () => {
      const emotionWithoutExplanation = {
        name: 'Happiness',
        senderScore: 7,
      };
      render(
        <EmotionGauge
          emotion={emotionWithoutExplanation}
          sameCulture={true}
          index={0}
        />
      );

      // Should not have border-t class that separates explanation
      const container = screen.getByRole('heading', { level: 3 }).closest('div');
      expect(container?.querySelector('.border-t')).not.toBeInTheDocument();
    });
  });

  describe('Cross-culture display', () => {
    it('should display emotion name with rank number', () => {
      render(
        <EmotionGauge
          emotion={crossCultureEmotion}
          sameCulture={false}
          index={0}
        />
      );

      expect(screen.getByText('1. Directness')).toBeInTheDocument();
    });

    it('should display dual scores with culture labels', () => {
      render(
        <EmotionGauge
          emotion={crossCultureEmotion}
          sameCulture={false}
          index={0}
        />
      );

      expect(screen.getByText('In their culture:')).toBeInTheDocument();
      expect(screen.getByText('In your culture:')).toBeInTheDocument();
    });

    it('should display sender culture score with intensity label', () => {
      render(
        <EmotionGauge
          emotion={crossCultureEmotion}
          sameCulture={false}
          index={0}
        />
      );

      // Check for sender score and label
      const senderScoreText = screen
        .getAllByText(/8\/10/)
        .find((el) => el.textContent?.includes('(High)'));
      expect(senderScoreText).toBeInTheDocument();
    });

    it('should display receiver culture score with intensity label', () => {
      render(
        <EmotionGauge
          emotion={crossCultureEmotion}
          sameCulture={false}
          index={0}
        />
      );

      // Check for receiver score and label
      const receiverScoreText = screen
        .getAllByText(/3\/10/)
        .find((el) => el.textContent?.includes('(Low)'));
      expect(receiverScoreText).toBeInTheDocument();
    });

    it('should display explanation text when provided', () => {
      render(
        <EmotionGauge
          emotion={crossCultureEmotion}
          sameCulture={false}
          index={0}
        />
      );

      expect(
        screen.getByText(
          'Americans value direct communication more than Japanese culture'
        )
      ).toBeInTheDocument();
    });

    it('should render two progress bars with correct aria-labels', () => {
      render(
        <EmotionGauge
          emotion={crossCultureEmotion}
          sameCulture={false}
          index={0}
        />
      );

      const senderProgressBar = screen.getByLabelText(
        'Directness in sender culture: 8 out of 10'
      );
      expect(senderProgressBar).toBeInTheDocument();

      const receiverProgressBar = screen.getByLabelText(
        'Directness in receiver culture: 3 out of 10'
      );
      expect(receiverProgressBar).toBeInTheDocument();
    });

    it('should handle different intensity labels for sender and receiver scores', () => {
      const emotion = {
        name: 'Formality',
        senderScore: 2,
        receiverScore: 9,
        explanation: 'Very different formality expectations',
      };

      render(<EmotionGauge emotion={emotion} sameCulture={false} index={0} />);

      // Sender should be "Very Low", receiver should be "Very High"
      expect(screen.getByText(/\(Very Low\)/)).toBeInTheDocument();
      expect(screen.getByText(/\(Very High\)/)).toBeInTheDocument();
    });
  });

  describe('Ranking display', () => {
    it('should display rank 1 for index 0', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      expect(screen.getByText(/^1\./)).toBeInTheDocument();
    });

    it('should display rank 2 for index 1', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={1}
        />
      );

      expect(screen.getByText(/^2\./)).toBeInTheDocument();
    });

    it('should display rank 3 for index 2', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={2}
        />
      );

      expect(screen.getByText(/^3\./)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should use semantic h3 heading for emotion name', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('1. Gratitude');
    });

    it('should have accessible progress bar with proper aria-label', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute(
        'aria-label',
        'Gratitude intensity: 8 out of 10'
      );
    });

    it('should have multiple progress bars with distinct aria-labels for cross-culture', () => {
      render(
        <EmotionGauge
          emotion={crossCultureEmotion}
          sameCulture={false}
          index={0}
        />
      );

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars).toHaveLength(2);

      expect(progressBars[0]).toHaveAttribute(
        'aria-label',
        'Directness in sender culture: 8 out of 10'
      );
      expect(progressBars[1]).toHaveAttribute(
        'aria-label',
        'Directness in receiver culture: 3 out of 10'
      );
    });

    it('should provide text-based intensity information (not color-only)', () => {
      render(
        <EmotionGauge
          emotion={sameCultureEmotion}
          sameCulture={true}
          index={0}
        />
      );

      // Verify intensity label is displayed (WCAG 2.1 AA compliance)
      expect(screen.getByText(/\(High\)/)).toBeInTheDocument();
      expect(screen.getByText(/8\/10/)).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle score of 0', () => {
      const zeroEmotion = { name: 'None', senderScore: 0 };
      render(<EmotionGauge emotion={zeroEmotion} sameCulture={true} index={0} />);

      expect(screen.getByText(/0\/10/)).toBeInTheDocument();
      expect(screen.getByText(/\(Very Low\)/)).toBeInTheDocument();
    });

    it('should handle score of 10', () => {
      const maxEmotion = { name: 'Maximum', senderScore: 10 };
      render(<EmotionGauge emotion={maxEmotion} sameCulture={true} index={0} />);

      expect(screen.getByText(/10\/10/)).toBeInTheDocument();
      expect(screen.getByText(/\(Very High\)/)).toBeInTheDocument();
    });

    it('should handle missing receiverScore gracefully in cross-culture mode', () => {
      const emotionMissingReceiverScore = {
        name: 'Test',
        senderScore: 5,
        receiverScore: undefined,
      };

      // This should render as same-culture if receiverScore is undefined
      render(
        <EmotionGauge
          emotion={emotionMissingReceiverScore}
          sameCulture={false}
          index={0}
        />
      );

      // Should still render two sections (sender and receiver) but receiver shows undefined/0
      expect(screen.getByText('In their culture:')).toBeInTheDocument();
      expect(screen.getByText('In your culture:')).toBeInTheDocument();
    });

    it('should handle empty explanation string', () => {
      const emotionEmptyExplanation = {
        name: 'Test',
        senderScore: 5,
        explanation: '',
      };

      render(
        <EmotionGauge
          emotion={emotionEmptyExplanation}
          sameCulture={true}
          index={0}
        />
      );

      // Empty explanation should not render the explanation section
      const container = screen.getByRole('heading', { level: 3 }).closest('div');
      const borderTElement = container?.querySelector('.border-t');
      expect(borderTElement).not.toBeInTheDocument();
    });
  });
});
