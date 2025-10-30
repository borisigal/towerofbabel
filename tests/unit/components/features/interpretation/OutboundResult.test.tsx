import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OutboundResult } from '@/components/features/interpretation/OutboundResult';
import { type OutboundInterpretationResponse } from '@/lib/llm/types';

describe('OutboundResult Component', () => {
  const mockResult: OutboundInterpretationResponse = {
    originalAnalysis: 'The receiver will perceive this message as direct and potentially abrupt.',
    suggestions: [
      'Add more context about the urgency',
      'Use a softer tone with phrases like "I would appreciate"',
      'Include an apology for the short notice',
    ],
    optimizedMessage: 'I apologize for the short notice, but we have a client deadline approaching. I would greatly appreciate it if you could complete this by tomorrow. Please let me know if you need any support.',
    emotions: [
      {
        name: 'Urgency',
        senderScore: 8,
        receiverScore: 9,
        explanation: 'High urgency communicated, even higher perceived by receiver',
      },
      {
        name: 'Directness',
        senderScore: 7,
        receiverScore: 5,
        explanation: 'Sender is very direct, but receiver culture values indirectness',
      },
      {
        name: 'Pressure',
        senderScore: 6,
        receiverScore: 8,
        explanation: 'Moderate pressure from sender, perceived as high by receiver',
      },
    ],
  };

  const originalMessage = 'Can you finish this by tomorrow?';

  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render OutboundResult with valid result', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    // Check that component renders
    expect(screen.getByText('📝 Your Original Message')).toBeInTheDocument();
    expect(screen.getByText('✨ Culturally Optimized Version')).toBeInTheDocument();
  });

  it('should display original message in left panel', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    expect(screen.getByText(originalMessage)).toBeInTheDocument();
  });

  it('should display optimized message in right panel', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    expect(screen.getByText(mockResult.optimizedMessage)).toBeInTheDocument();
  });

  it('should display originalAnalysis section', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    expect(screen.getByText('🔍 How It Will Be Perceived')).toBeInTheDocument();
    expect(screen.getByText(mockResult.originalAnalysis)).toBeInTheDocument();
  });

  it('should render all suggestions in list', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    expect(screen.getByText('💡 Suggestions')).toBeInTheDocument();
    mockResult.suggestions.forEach((suggestion) => {
      expect(screen.getByText(suggestion)).toBeInTheDocument();
    });
  });

  it('should render top 3 emotion gauges', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    expect(screen.getByText('😊 Top 3 Emotions Detected')).toBeInTheDocument();
    expect(screen.getByText('1. Urgency')).toBeInTheDocument();
    expect(screen.getByText('2. Directness')).toBeInTheDocument();
    expect(screen.getByText('3. Pressure')).toBeInTheDocument();
  });

  it('should display copy button', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    const copyButton = screen.getByRole('button', {
      name: /copy optimized message to clipboard/i,
    });
    expect(copyButton).toBeInTheDocument();
  });

  it('should display messages remaining when provided', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    expect(screen.getByText('💬 9 messages remaining')).toBeInTheDocument();
  });

  it('should not display messages remaining when undefined', () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
      />
    );

    expect(screen.queryByText(/messages remaining/i)).not.toBeInTheDocument();
  });

  it('should copy optimized message to clipboard when copy button clicked', async () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    const copyButton = screen.getByRole('button', {
      name: /copy optimized message to clipboard/i,
    });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockResult.optimizedMessage);
    });
  });

  it('should change copy button text to "Copied!" after successful copy', async () => {
    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    const copyButton = screen.getByRole('button', {
      name: /copy optimized message to clipboard/i,
    });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should revert copy button text after 2 seconds', async () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    const copyButton = screen.getByRole('button', {
      name: /copy optimized message to clipboard/i,
    });

    fireEvent.click(copyButton);

    await vi.waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Fast-forward 2 seconds
    await vi.advanceTimersByTimeAsync(2000);

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    expect(screen.getByText('Copy Optimized Message')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should handle copy error and show alert', async () => {
    // Mock clipboard API to reject
    const clipboardWriteTextMock = vi.fn(() => Promise.reject(new Error('Clipboard error')));
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteTextMock,
      },
    });

    // Mock alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <OutboundResult
        result={mockResult}
        originalMessage={originalMessage}
        messagesRemaining={9}
      />
    );

    const copyButton = screen.getByRole('button', {
      name: /copy optimized message to clipboard/i,
    });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Failed to copy. Please select and copy manually.');
    }, { timeout: 1000 });

    alertMock.mockRestore();
  });
});
