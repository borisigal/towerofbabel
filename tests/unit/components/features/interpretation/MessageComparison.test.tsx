import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageComparison } from '@/components/features/interpretation/MessageComparison';

describe('MessageComparison Component', () => {
  const originalMessage = 'Can you finish this by tomorrow?';
  const optimizedMessage = 'I apologize for the short notice, but we have a client deadline approaching. I would greatly appreciate it if you could complete this by tomorrow. Please let me know if you need any support.';

  it('should render both message panels', () => {
    render(
      <MessageComparison
        originalMessage={originalMessage}
        optimizedMessage={optimizedMessage}
      />
    );

    expect(screen.getByText('📝 Your Original Message')).toBeInTheDocument();
    expect(screen.getByText('✨ Culturally Optimized Version')).toBeInTheDocument();
  });

  it('should display original message in left panel', () => {
    render(
      <MessageComparison
        originalMessage={originalMessage}
        optimizedMessage={optimizedMessage}
      />
    );

    expect(screen.getByText(originalMessage)).toBeInTheDocument();
  });

  it('should display optimized message in right panel', () => {
    render(
      <MessageComparison
        originalMessage={originalMessage}
        optimizedMessage={optimizedMessage}
      />
    );

    expect(screen.getByText(optimizedMessage)).toBeInTheDocument();
  });

  it('should have accessible region labels', () => {
    render(
      <MessageComparison
        originalMessage={originalMessage}
        optimizedMessage={optimizedMessage}
      />
    );

    expect(screen.getByLabelText('Original message')).toBeInTheDocument();
    expect(screen.getByLabelText('Optimized message')).toBeInTheDocument();
  });

  it('should apply responsive grid layout classes', () => {
    const { container } = render(
      <MessageComparison
        originalMessage={originalMessage}
        optimizedMessage={optimizedMessage}
      />
    );

    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('grid-cols-1');
    expect(gridContainer).toHaveClass('lg:grid-cols-2');
  });

  it('should apply scrollable styles to message panels', () => {
    const { container } = render(
      <MessageComparison
        originalMessage={originalMessage}
        optimizedMessage={optimizedMessage}
      />
    );

    const scrollableDivs = container.querySelectorAll('.max-h-\\[300px\\]');
    expect(scrollableDivs.length).toBe(2);
  });

  it('should handle long messages with scrollable panels', () => {
    const longMessage = 'A'.repeat(1000);

    render(
      <MessageComparison
        originalMessage={longMessage}
        optimizedMessage={longMessage}
      />
    );

    // Long message appears in both panels, so use getAllByText
    const messages = screen.getAllByText(longMessage);
    expect(messages.length).toBe(2); // Original and optimized panels
  });

  it('should preserve whitespace in messages with pre-wrap', () => {
    const messageWithNewlines = 'Line 1\nLine 2\nLine 3';

    const { container } = render(
      <MessageComparison
        originalMessage={messageWithNewlines}
        optimizedMessage={messageWithNewlines}
      />
    );

    const paragraphs = container.querySelectorAll('.whitespace-pre-wrap');
    expect(paragraphs.length).toBe(2);
  });

  it('should apply visual separation with borders and backgrounds', () => {
    const { container } = render(
      <MessageComparison
        originalMessage={originalMessage}
        optimizedMessage={optimizedMessage}
      />
    );

    // Original panel should have gray background
    const originalPanel = container.querySelector('.bg-gray-50');
    expect(originalPanel).toBeInTheDocument();

    // Optimized panel should have green background
    const optimizedPanel = container.querySelector('.bg-green-50');
    expect(optimizedPanel).toBeInTheDocument();
  });
});
