import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutboundAnalysis } from '@/components/features/interpretation/OutboundAnalysis';
import { type Emotion } from '@/lib/types/models';

describe('OutboundAnalysis Component', () => {
  const mockEmotions: Emotion[] = [
    {
      name: 'Urgency',
      senderScore: 8,
      receiverScore: 9,
      explanation: 'High urgency communicated',
    },
    {
      name: 'Directness',
      senderScore: 7,
      receiverScore: 5,
      explanation: 'Sender is very direct',
    },
    {
      name: 'Pressure',
      senderScore: 6,
      receiverScore: 8,
      explanation: 'Moderate pressure from sender',
    },
  ];

  const mockSuggestions = [
    'Add more context about the urgency',
    'Use a softer tone with phrases like "I would appreciate"',
    'Include an apology for the short notice',
  ];

  const mockOriginalAnalysis = 'The receiver will perceive this message as direct and potentially abrupt.';

  it('should render all sections', () => {
    render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={false}
      />
    );

    expect(screen.getByText('🔍 How It Will Be Perceived')).toBeInTheDocument();
    expect(screen.getByText('💡 Suggestions')).toBeInTheDocument();
    expect(screen.getByText('😊 Top 3 Emotions Detected')).toBeInTheDocument();
  });

  it('should display originalAnalysis text', () => {
    render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={false}
      />
    );

    expect(screen.getByText(mockOriginalAnalysis)).toBeInTheDocument();
  });

  it('should render all suggestions in list', () => {
    render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={false}
      />
    );

    mockSuggestions.forEach((suggestion) => {
      expect(screen.getByText(suggestion)).toBeInTheDocument();
    });
  });

  it('should format suggestions as bulleted list', () => {
    const { container } = render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={false}
      />
    );

    const list = container.querySelector('ul');
    expect(list).toBeInTheDocument();
    expect(list).toHaveClass('list-disc');
    expect(list).toHaveClass('list-inside');

    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(mockSuggestions.length);
  });

  it('should render top 3 emotion gauges', () => {
    render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={false}
      />
    );

    expect(screen.getByText('1. Urgency')).toBeInTheDocument();
    expect(screen.getByText('2. Directness')).toBeInTheDocument();
    expect(screen.getByText('3. Pressure')).toBeInTheDocument();
  });

  it('should pass sameCulture flag to EmotionGauge components', () => {
    render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={true}
      />
    );

    // For same culture, EmotionGauge should show single score
    // Check that "Intensity:" label appears (same-culture mode)
    expect(screen.getAllByText(/Intensity:/i).length).toBeGreaterThan(0);
  });

  it('should show dual scores for cross-culture interpretations', () => {
    render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={false}
      />
    );

    // For cross culture, EmotionGauge should show dual scores
    // Check that "In their culture:" and "In your culture:" labels appear
    expect(screen.getAllByText(/In their culture:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/In your culture:/i).length).toBeGreaterThan(0);
  });

  it('should limit emotions to top 3', () => {
    const manyEmotions: Emotion[] = [
      { name: 'Emotion1', senderScore: 8 },
      { name: 'Emotion2', senderScore: 7 },
      { name: 'Emotion3', senderScore: 6 },
      { name: 'Emotion4', senderScore: 5 },
      { name: 'Emotion5', senderScore: 4 },
    ];

    render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={manyEmotions}
        sameCulture={true}
      />
    );

    // Only first 3 emotions should be rendered
    expect(screen.getByText('1. Emotion1')).toBeInTheDocument();
    expect(screen.getByText('2. Emotion2')).toBeInTheDocument();
    expect(screen.getByText('3. Emotion3')).toBeInTheDocument();
    expect(screen.queryByText('4. Emotion4')).not.toBeInTheDocument();
    expect(screen.queryByText('5. Emotion5')).not.toBeInTheDocument();
  });

  it('should apply blue tint background styling', () => {
    const { container } = render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={false}
      />
    );

    const article = container.querySelector('article');
    expect(article).toHaveClass('bg-blue-50/50');
    expect(article).toHaveClass('border-blue-200');
  });

  it('should use semantic HTML structure', () => {
    const { container } = render(
      <OutboundAnalysis
        originalAnalysis={mockOriginalAnalysis}
        suggestions={mockSuggestions}
        emotions={mockEmotions}
        sameCulture={false}
      />
    );

    const article = container.querySelector('article');
    expect(article).toBeInTheDocument();

    const sections = container.querySelectorAll('section');
    expect(sections.length).toBe(3); // 3 sections: originalAnalysis, suggestions, emotions
  });
});
