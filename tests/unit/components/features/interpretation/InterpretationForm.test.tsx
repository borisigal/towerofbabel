import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterpretationForm } from '@/components/features/interpretation/InterpretationForm';

// Mock Zustand stores
vi.mock('@/lib/stores/usageStore', () => ({
  useUsageStore: vi.fn(() => ({
    messagesUsed: 0,
    messagesLimit: 10,
    tier: 'trial',
    setUsage: vi.fn(),
    incrementUsage: vi.fn(),
  })),
}));

vi.mock('@/lib/stores/upgradeModalStore', () => ({
  useUpgradeModalStore: vi.fn(() => ({
    open: false,
    trigger: 'proactive',
    setOpen: vi.fn(),
  })),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

describe('InterpretationForm', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    vi.clearAllMocks();
  });

  it('should render form with placeholder text', () => {
    render(<InterpretationForm />);
    expect(
      screen.getByPlaceholderText('Paste the message you want to interpret...')
    ).toBeInTheDocument();
  });

  it('should render form title', () => {
    render(<InterpretationForm />);
    expect(screen.getByText('Interpret Message')).toBeInTheDocument();
  });

  it('should render sender and receiver culture labels', () => {
    render(<InterpretationForm />);
    expect(screen.getByText("Sender's Culture")).toBeInTheDocument();
    expect(screen.getByText("Receiver's Culture")).toBeInTheDocument();
  });

  it('should display initial character counter at 0', () => {
    render(<InterpretationForm />);
    expect(screen.getByText('0 / 2,000 characters')).toBeInTheDocument();
  });

  it('should update character counter in real-time as user types', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );

    await user.type(textarea, 'Hello');

    await waitFor(() => {
      expect(screen.getByText('5 / 2,000 characters')).toBeInTheDocument();
    });
  });

  it('should turn character counter red when >2000 characters', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );

    // Create a string with 2001 characters
    const longMessage = 'a'.repeat(2001);
    await user.clear(textarea);
    await user.type(textarea, longMessage);

    await waitFor(() => {
      const counter = screen.getByText(/2001 \/ 2,000 characters/);
      expect(counter).toHaveClass('text-destructive');
      expect(counter).toHaveClass('font-semibold');
    });
  });

  it('should show warning message when character count exceeds 2000', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );

    const longMessage = 'a'.repeat(2001);
    await user.clear(textarea);
    await user.type(textarea, longMessage);

    await waitFor(() => {
      expect(screen.getByText(/Message too long/)).toBeInTheDocument();
    });
  });

  it('should disable submit button when message is empty', () => {
    render(<InterpretationForm />);
    const button = screen.getByRole('button', { name: /interpret/i });
    expect(button).toBeDisabled();
  });

  it('should disable submit button when message >2000 characters', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    const longMessage = 'a'.repeat(2001);
    await user.clear(textarea);
    await user.type(textarea, longMessage);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /interpret/i });
      expect(button).toBeDisabled();
    });
  });

  it('should disable submit button when cultures not selected', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );

    // Fill in message but don't select cultures
    await user.type(textarea, 'Test message');

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /interpret/i });
      expect(button).toBeDisabled();
    });
  });

  it('should enable submit button when form is valid', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    // Fill in message
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    await user.type(textarea, 'Test message for interpretation');

    // Select sender culture
    const senderTrigger = screen.getAllByRole('combobox')[0];
    if (senderTrigger) await user.click(senderTrigger);
    await waitFor(() => {
      const americanOption = screen.getByRole('option', { name: 'American' });
      if (americanOption) user.click(americanOption);
    });

    // Select receiver culture
    const receiverTrigger = screen.getAllByRole('combobox')[1];
    if (receiverTrigger) await user.click(receiverTrigger);
    await waitFor(() => {
      const japaneseOption = screen.getByRole('option', { name: 'Japanese' });
      if (japaneseOption) user.click(japaneseOption);
    });

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /^interpret$/i });
      expect(button).toBeEnabled();
    });
  });

  it('should allow same-culture selection', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    // Fill in message
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    await user.type(textarea, 'Test message');

    // Select American for both sender and receiver
    const senderTrigger = screen.getAllByRole('combobox')[0];
    if (senderTrigger) await user.click(senderTrigger);
    await waitFor(() => {
      const americanOption = screen.getByRole('option', { name: 'American' });
      if (americanOption) user.click(americanOption);
    });

    const receiverTrigger = screen.getAllByRole('combobox')[1];
    if (receiverTrigger) await user.click(receiverTrigger);
    await waitFor(() => {
      const americanOption = screen.getByRole('option', { name: 'American' });
      if (americanOption) user.click(americanOption);
    });

    // Should not show validation error about cultures being the same
    expect(
      screen.queryByText(/cultures must be different/i)
    ).not.toBeInTheDocument();

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /^interpret$/i });
      expect(button).toBeEnabled();
    });
  });

  it('should show loading state on form submission', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    // Fill form
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    await user.type(textarea, 'Test message');

    // Select cultures
    const senderTrigger = screen.getAllByRole('combobox')[0];
    if (senderTrigger) await user.click(senderTrigger);
    await waitFor(() => {
      const americanOption = screen.getByRole('option', { name: 'American' });
      if (americanOption) user.click(americanOption);
    });

    const receiverTrigger = screen.getAllByRole('combobox')[1];
    if (receiverTrigger) await user.click(receiverTrigger);
    await waitFor(() => {
      const japaneseOption = screen.getByRole('option', { name: 'Japanese' });
      if (japaneseOption) user.click(japaneseOption);
    });

    // Submit form
    const button = screen.getByRole('button', { name: /^interpret$/i });
    await user.click(button);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/interpreting\.\.\./i)).toBeInTheDocument();
    });
  });

  it('should disable form inputs during loading state', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    // Fill and submit form
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    await user.type(textarea, 'Test message');

    const senderTrigger = screen.getAllByRole('combobox')[0];
    if (senderTrigger) await user.click(senderTrigger);
    await waitFor(() => {
      const americanOption = screen.getByRole('option', { name: 'American' });
      if (americanOption) user.click(americanOption);
    });

    const receiverTrigger = screen.getAllByRole('combobox')[1];
    if (receiverTrigger) await user.click(receiverTrigger);
    await waitFor(() => {
      const japaneseOption = screen.getByRole('option', { name: 'Japanese' });
      if (japaneseOption) user.click(japaneseOption);
    });

    const button = screen.getByRole('button', { name: /^interpret$/i });
    await user.click(button);

    // Check that textarea and button are disabled during loading
    await waitFor(() => {
      expect(textarea).toBeDisabled();
      expect(button).toBeDisabled();
    });
  });

  it('should populate culture selectors with all 15 cultures', async () => {
    const user = userEvent.setup();
    render(<InterpretationForm />);

    // Open sender culture dropdown
    const senderTrigger = screen.getAllByRole('combobox')[0];
    if (senderTrigger) await user.click(senderTrigger);

    // Check that all 15 cultures are present
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'American' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'British' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'German' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'French' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Japanese' })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Chinese (Mandarin)' })
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Indian' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Spanish' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Italian' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Dutch' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Korean' })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Brazilian Portuguese' })
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Mexican' })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Australian' })
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Canadian' })).toBeInTheDocument();
    });
  });

  it('should log form submission data to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<InterpretationForm />);

    // Fill form
    const textarea = screen.getByPlaceholderText(
      'Paste the message you want to interpret...'
    );
    await user.type(textarea, 'Test message');

    const senderTrigger = screen.getAllByRole('combobox')[0];
    if (senderTrigger) await user.click(senderTrigger);
    await waitFor(() => {
      const americanOption = screen.getByRole('option', { name: 'American' });
      if (americanOption) user.click(americanOption);
    });

    const receiverTrigger = screen.getAllByRole('combobox')[1];
    if (receiverTrigger) await user.click(receiverTrigger);
    await waitFor(() => {
      const japaneseOption = screen.getByRole('option', { name: 'Japanese' });
      if (japaneseOption) user.click(japaneseOption);
    });

    // Submit form
    const button = screen.getByRole('button', { name: /^interpret$/i });
    await user.click(button);

    // Check console.log was called with correct data
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Submitting interpretation request:',
        expect.objectContaining({
          message: 'Test message',
          sender_culture: 'american',
          receiver_culture: 'japanese',
          mode: 'inbound',
        })
      );
    });

    consoleSpy.mockRestore();
  });
});
