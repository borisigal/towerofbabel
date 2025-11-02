import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MessageCircle } from 'lucide-react';
import { EmptyState, DashboardEmptyState } from '@/components/features/interpretation/EmptyState';

describe('EmptyState', () => {
  it('should render title and description', () => {
    render(
      <EmptyState
        title="No items yet"
        description="Start by adding your first item"
      />
    );

    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.getByText('Start by adding your first item')).toBeInTheDocument();
  });

  it('should render custom icon when provided', () => {
    const { container } = render(
      <EmptyState
        icon={MessageCircle}
        title="No messages"
        description="Send your first message"
      />
    );

    // Check for icon rendered
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render default MessageSquare icon when no icon provided', () => {
    const { container } = render(
      <EmptyState
        title="No items"
        description="Add items"
      />
    );

    // Check for default icon
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render action button when action provided', () => {
    const action = {
      label: 'Add item',
      onClick: vi.fn(),
    };

    render(
      <EmptyState
        title="No items"
        description="Add items"
        action={action}
      />
    );

    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('should call onClick when action button clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const action = {
      label: 'Add item',
      onClick,
    };

    render(
      <EmptyState
        title="No items"
        description="Add items"
        action={action}
      />
    );

    const button = screen.getByRole('button', { name: 'Add item' });
    await user.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should not render action button when action not provided', () => {
    render(
      <EmptyState
        title="No items"
        description="Add items"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('DashboardEmptyState', () => {
  it('should render with predefined dashboard content', () => {
    render(<DashboardEmptyState />);

    expect(screen.getByText('No interpretations yet')).toBeInTheDocument();
    expect(screen.getByText(/Paste a message to get started/i)).toBeInTheDocument();
  });

  it('should render icon', () => {
    const { container } = render(<DashboardEmptyState />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
