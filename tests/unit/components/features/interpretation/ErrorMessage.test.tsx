import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ErrorMessage } from '@/components/features/interpretation/ErrorMessage';

describe('ErrorMessage', () => {
  it('should display user-friendly message for LIMIT_EXCEEDED error', () => {
    const error = { code: 'LIMIT_EXCEEDED', message: 'Limit exceeded' };
    render(<ErrorMessage error={error} />);

    expect(screen.getByText('Message Limit Reached')).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Pro/i)).toBeInTheDocument();
  });

  it('should display user-friendly message for RATE_LIMITED error', () => {
    const error = { code: 'RATE_LIMITED', message: 'Rate limited' };
    render(<ErrorMessage error={error} />);

    expect(screen.getByText('Too Many Requests')).toBeInTheDocument();
    expect(screen.getByText(/wait a moment/i)).toBeInTheDocument();
  });

  it('should display user-friendly message for UNAUTHORIZED error', () => {
    const error = { code: 'UNAUTHORIZED', message: 'Unauthorized' };
    render(<ErrorMessage error={error} />);

    expect(screen.getByText('Session Expired')).toBeInTheDocument();
    expect(screen.getByText(/sign in again/i)).toBeInTheDocument();
  });

  it('should display user-friendly message for INVALID_INPUT error', () => {
    const error = { code: 'INVALID_INPUT', message: 'Invalid input' };
    render(<ErrorMessage error={error} />);

    expect(screen.getByText('Invalid Message')).toBeInTheDocument();
    expect(screen.getByText(/check your message/i)).toBeInTheDocument();
  });

  it('should display user-friendly message for SERVICE_OVERLOADED error', () => {
    const error = { code: 'SERVICE_OVERLOADED', message: 'Service overloaded' };
    render(<ErrorMessage error={error} />);

    expect(screen.getByText('Service Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/high demand/i)).toBeInTheDocument();
  });

  it('should display user-friendly message for INTERNAL_ERROR', () => {
    const error = { code: 'INTERNAL_ERROR', message: 'Internal error' };
    render(<ErrorMessage error={error} />);

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  it('should display default message for unknown error code', () => {
    const error = { code: 'UNKNOWN_CODE', message: 'Unknown error' };
    render(<ErrorMessage error={error} />);

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
  });

  it('should render retry button when onRetry provided', () => {
    const error = { code: 'INTERNAL_ERROR', message: 'Error' };
    const onRetry = vi.fn();

    render(<ErrorMessage error={error} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked', async () => {
    const user = userEvent.setup();
    const error = { code: 'INTERNAL_ERROR', message: 'Error' };
    const onRetry = vi.fn();

    render(<ErrorMessage error={error} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('should not render retry button when onRetry not provided', () => {
    const error = { code: 'INTERNAL_ERROR', message: 'Error' };

    render(<ErrorMessage error={error} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should have AlertCircle icon', () => {
    const error = { code: 'INTERNAL_ERROR', message: 'Error' };
    const { container } = render(<ErrorMessage error={error} />);

    // Check for lucide-react AlertCircle icon class
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
