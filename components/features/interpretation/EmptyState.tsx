'use client';

import React from 'react';
import { MessageSquare, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Empty state component for when user has no data yet.
 * Provides helpful guidance on what to do next with optional action button.
 *
 * @param icon - Optional icon component to display (defaults to MessageSquare)
 * @param title - Main heading for the empty state
 * @param description - Explanatory text describing what to do next
 * @param action - Optional action button with label and onClick handler
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No interpretations yet"
 *   description="Paste a message to get started with cultural interpretation."
 *   action={{
 *     label: 'Try a sample message',
 *     onClick: () => fillSampleMessage()
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon = MessageSquare,
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
      <div className="rounded-full bg-muted p-6">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
      {action && (
        <Button variant="outline" onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Pre-configured empty state for dashboard when user has no interpretations.
 */
export function DashboardEmptyState(): JSX.Element {
  return (
    <EmptyState
      title="No interpretations yet"
      description="Paste a message to get started with cultural interpretation. We'll show you how it might be perceived across cultures."
    />
  );
}
